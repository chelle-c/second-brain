/**
 * service.ts – generalized notification service singleton.
 *
 * Providers register via .register(). The service polls on a fixed interval,
 * checks every provider, deduplicates via sessionStorage, and fires through
 * the Tauri notification plugin.
 *
 * Session dedupe: each PendingNotification carries a dedupeKey.  Once fired,
 * that key is written to sessionStorage.  On app restart sessionStorage is
 * gone so the notification is eligible to fire again.  This is the only
 * dedupe layer — no localStorage is used anywhere in this file.
 *
 * Startup helper: sendOnce() lets a module fire a notification immediately
 * (before the first poll tick) with the same session-scoped dedupe.
 */

import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useSettingsStore } from "@/stores/useSettingsStore";

// ── public types ────────────────────────────────────────────────────────────

export interface PendingNotification {
	dedupeKey: string;
	title: string;
	body?: string;
	/**
	 * Millisecond timestamp at which this notification should fire.
	 * The service only fires it when now is within ±GRACE_MS of this value.
	 */
	fireAt: number;
}

export type NotificationProvider =
	| ((now: number) => PendingNotification[])
	| ((now: number) => Promise<PendingNotification[]>);

export interface SendOnceOptions {
	dedupeKey: string;
	title: string;
	body?: string;
}

// ── internals ───────────────────────────────────────────────────────────────

const SESSION_PREFIX = "notif-fired-";
const POLL_MS = 30_000;
const GRACE_MS = POLL_MS;

class NotificationService {
	private providers = new Map<string, NotificationProvider>();
	private intervalId: ReturnType<typeof setInterval> | null = null;

	// ── permission ──────────────────────────────────────────────────────────
	private async ensurePermission(): Promise<boolean> {
		let granted = await isPermissionGranted();
		if (!granted) {
			granted = (await requestPermission()) === "granted";
		}
		return granted;
	}

	// ── session dedupe ──────────────────────────────────────────────────────
	private sessionKey(dedupeKey: string): string {
		return `${SESSION_PREFIX}${dedupeKey}`;
	}

	private alreadyFired(dedupeKey: string): boolean {
		return sessionStorage.getItem(this.sessionKey(dedupeKey)) === "1";
	}

	private markFired(dedupeKey: string): void {
		sessionStorage.setItem(this.sessionKey(dedupeKey), "1");
	}

	// ── registration ────────────────────────────────────────────────────────
	register(moduleId: string, provider: NotificationProvider): void {
		this.providers.set(moduleId, provider);
		console.log(`[NotificationService] registered: ${moduleId}`);
	}

	unregister(moduleId: string): void {
		this.providers.delete(moduleId);
	}

	// ── lifecycle ───────────────────────────────────────────────────────────
	/**
	 * Start polling.  The first tick fires after one full POLL_MS interval.
	 * Use sendOnce() for anything that needs to fire immediately on startup.
	 */
	start(): void {
		if (this.intervalId !== null) return;
		// Do NOT call tick() here — the startup helper (sendOnce) handles the
		// immediate first notification.  Calling tick() here races with sendOnce
		// and causes double-fires because sessionStorage hasn't been written yet.
		this.intervalId = setInterval(() => this.tick(), POLL_MS);
		console.log("[NotificationService] started (first tick in " + POLL_MS / 1000 + "s)");
	}

	stop(): void {
		if (this.intervalId === null) return;
		clearInterval(this.intervalId);
		this.intervalId = null;
		console.log("[NotificationService] stopped");
	}

	// ── tick ─────────────────────────────────────────────────────────────────
	private async tick(): Promise<void> {
		if (!useSettingsStore.getState().notificationsEnabled) return;

		let ok: boolean;
		try {
			ok = await this.ensurePermission();
		} catch {
			ok = false;
		}
		if (!ok) return;

		const now = Date.now();

		for (const [moduleId, provider] of this.providers) {
			try {
				const pending = await provider(now);

				for (const n of pending) {
					if (n.fireAt < now - GRACE_MS || n.fireAt > now + GRACE_MS) continue;
					if (this.alreadyFired(n.dedupeKey)) continue;

					this.markFired(n.dedupeKey);
					sendNotification({ title: n.title, body: n.body });
					console.log(`[NotificationService][${moduleId}] fired →`, n.title);
				}
			} catch (err) {
				console.error(`[NotificationService][${moduleId}] error:`, err);
			}
		}
	}

	// ── one-shot helper ─────────────────────────────────────────────────────
	/**
	 * Send a notification exactly once per session.
	 *
	 * Dedupe is sessionStorage-only.  On app restart sessionStorage is gone so
	 * the same dedupeKey becomes eligible again.  No localStorage is involved.
	 *
	 * Returns true when the notification was actually sent this call.
	 */
	async sendOnce(options: SendOnceOptions): Promise<boolean> {
		if (!useSettingsStore.getState().notificationsEnabled) {
			console.log("[NotificationService] sendOnce: notifications disabled");
			return false;
		}

		if (this.alreadyFired(options.dedupeKey)) {
			console.log(
				"[NotificationService] sendOnce: already fired this session →",
				options.dedupeKey,
			);
			return false;
		}

		let ok: boolean;
		try {
			ok = await this.ensurePermission();
		} catch {
			ok = false;
		}
		if (!ok) {
			console.log("[NotificationService] sendOnce: permission denied");
			return false;
		}

		this.markFired(options.dedupeKey);
		sendNotification({ title: options.title, body: options.body });
		console.log("[NotificationService] sendOnce →", options.title);
		return true;
	}

	/** Clear a session dedupe flag (testing / manual reset). */
	resetDedupe(dedupeKey: string): void {
		sessionStorage.removeItem(this.sessionKey(dedupeKey));
		console.log("[NotificationService] resetDedupe →", dedupeKey);
	}
}

export const notificationService = new NotificationService();

if (typeof window !== "undefined") {
	(window as any).notificationService = notificationService;
}
