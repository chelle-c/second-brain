/**
 * reminderService.ts
 *
 * Polls every 30 seconds. For each note that has a reminder, computes every
 * configured "notify N before" instant.  If that instant falls within the
 * current polling window and hasn't already been fired this session, a desktop
 * notification is sent.
 *
 * The session-storage key for each fired notification includes the reminder's
 * dateTime, so editing a reminder's time automatically allows re-firing.
 *
 * Notification layout (rendered by the OS):
 *
 *   ┌─────────────────────────────────────┐
 *   │  Note Title                         │  ← title  (OS renders large/bold)
 *   │                                     │
 *   │  ⏰ in 15 minutes                   │  ← body line 1 – the countdown
 *   │  📂 Work › Projects                 │  ← body line 2 – folder path
 *   │  📅 Thursday, June 12, 2025         │  ← body line 3 – date
 *   │  🕐 2:30 PM                         │  ← body line 4 – time
 *   └─────────────────────────────────────┘
 */

import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Note, ReminderNotification } from "@/types/notes";

// ── tunables ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000;
/** Grace band on each side of "now" that we consider as "now". */
const GRACE_MS = POLL_INTERVAL_MS;

// ── session-level duplicate guard ───────────────────────────────────────────
const SESSION_KEY_PREFIX = "reminder-fired-";

/**
 * Key includes reminderDateTime so that if the user edits the reminder time
 * the old key no longer matches and the notification fires again.
 */
function firedKey(noteId: string, reminderDateTime: string, offsetMinutes: number): string {
	return `${SESSION_KEY_PREFIX}${noteId}-${reminderDateTime}-${offsetMinutes}`;
}

function markFired(noteId: string, reminderDateTime: string, offsetMinutes: number): void {
	sessionStorage.setItem(firedKey(noteId, reminderDateTime, offsetMinutes), "1");
}

function alreadyFired(noteId: string, reminderDateTime: string, offsetMinutes: number): boolean {
	return sessionStorage.getItem(firedKey(noteId, reminderDateTime, offsetMinutes)) === "1";
}

// ── offset math ──────────────────────────────────────────────────────────────
function toMinutes(n: ReminderNotification): number {
	switch (n.unit) {
		case "minutes":
			return n.value;
		case "hours":
			return n.value * 60;
		case "days":
			return n.value * 60 * 24;
	}
}

/**
 * Human-readable countdown label for the notification body.
 * Examples: "in 5 minutes", "in 1 hour", "in 3 days"
 * Special-cases zero offset: "now"
 */
function formatCountdown(n: ReminderNotification): string {
	if (n.value === 0) return "now";

	const plural = n.value === 1 ? "" : "s";

	switch (n.unit) {
		case "minutes":
			return `in ${n.value} minute${plural}`;
		case "hours":
			return `in ${n.value} hour${plural}`;
		case "days":
			return `in ${n.value} day${plural}`;
	}
}

// ── folder-name resolver ────────────────────────────────────────────────────
/**
 * Walk the folder list to build the full breadcrumb path for a given folder id.
 * Returns something like "Work › Projects › Alpha".
 * Falls back to the raw id when the folder isn't found.
 */
function resolveFolderPath(folderId: string): string {
	const folders = useNotesStore.getState().folders;

	const buildPath = (id: string): string[] => {
		const folder = folders.find((f) => f.id === id);
		if (!folder) return [id];
		const parentSegments = folder.parentId ? buildPath(folder.parentId) : [];
		return [...parentSegments, folder.name];
	};

	return buildPath(folderId).join(" › ");
}

// ── core check ──────────────────────────────────────────────────────────────
interface PendingNotification {
	note: Note;
	offset: ReminderNotification;
	offsetMinutes: number;
	fireAt: number;
	reminderDateTime: string;
}

function collectPending(notes: Note[], now: number): PendingNotification[] {
	const pending: PendingNotification[] = [];

	for (const note of notes) {
		if (!note.reminder) continue;
		const reminderDateTime = note.reminder.dateTime;
		const reminderMs = new Date(reminderDateTime).getTime();
		if (Number.isNaN(reminderMs)) continue;

		for (const offset of note.reminder.notifications) {
			const offsetMin = toMinutes(offset);
			const fireAt = reminderMs - offsetMin * 60_000;

			if (fireAt >= now - GRACE_MS && fireAt <= now + GRACE_MS) {
				// Don't re-fire something that's more than one full grace band
				// in the past (handles stale reminders on app restart).
				if (fireAt < now - GRACE_MS * 2) continue;

				pending.push({
					note,
					offset,
					offsetMinutes: offsetMin,
					fireAt,
					reminderDateTime,
				});
			}
		}
	}

	return pending;
}

// ── notification sender ─────────────────────────────────────────────────────
async function ensurePermission(): Promise<boolean> {
	let granted = await isPermissionGranted();
	if (!granted) {
		const result = await requestPermission();
		granted = result === "granted";
	}
	return granted;
}

async function fireNotification(pending: PendingNotification): Promise<void> {
	const { note, offset } = pending;

	// ── title: just the note name ──────────────────────────────────────────
	// The OS already renders the title field larger and bolder than the body.
	// Keeping it clean lets the note name stand out without any decoration
	// competing for attention.
	const title = note.title || "Untitled";

	// ── body: countdown first, then context ────────────────────────────────
	// Leading with the countdown makes the most time-sensitive piece of info
	// the first thing the eye lands on after the title.
	const reminderDate = new Date(note.reminder!.dateTime);

	const dateFormatted = reminderDate.toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	const timeFormatted = reminderDate.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	const folderPath = resolveFolderPath(note.folder);

	const body = [
		`⏰ ${formatCountdown(offset)}`,
		`📂 ${folderPath}`,
		`📅 ${dateFormatted}`,
		`🕐 ${timeFormatted}`,
	].join("\n");

	sendNotification({ title, body });
	console.log("[ReminderService] fired notification →", { title, body });
}

// ── lifecycle ───────────────────────────────────────────────────────────────
let intervalId: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
	if (!useSettingsStore.getState().notificationsEnabled) return;

	let hasPermission: boolean;
	try {
		hasPermission = await ensurePermission();
	} catch {
		hasPermission = false;
	}
	if (!hasPermission) return;

	const notes = useNotesStore.getState().notes;
	const now = Date.now();
	const pending = collectPending(notes, now);

	for (const p of pending) {
		if (alreadyFired(p.note.id, p.reminderDateTime, p.offsetMinutes)) continue;
		markFired(p.note.id, p.reminderDateTime, p.offsetMinutes);
		await fireNotification(p);
	}
}

export function startReminderService(): void {
	if (intervalId !== null) return;
	tick(); // immediate first check
	intervalId = setInterval(tick, POLL_INTERVAL_MS);
	console.log("[ReminderService] started");
}

export function stopReminderService(): void {
	if (intervalId === null) return;
	clearInterval(intervalId);
	intervalId = null;
	console.log("[ReminderService] stopped");
}
