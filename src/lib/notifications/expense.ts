/**
 * expense.ts – expense notification provider + startup helper.
 *
 * Dedupe strategy: session-only (sessionStorage, managed by the service).
 *   • On app start  → sendOnce fires immediately.  The service writes the
 *                      dedupe key to sessionStorage.  Subsequent ticks see it
 *                      and skip.
 *   • On app restart→ sessionStorage is gone.  The key is eligible again.
 *   • The dedupeKey includes today's date (yyyy-MM-dd) so that if the app
 *     stays open past midnight the key changes and the notification fires
 *     again on the next tick.
 *
 * No localStorage is used anywhere in this file.
 */

import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { notificationService, type PendingNotification } from "./service";
import type { Expense } from "@/types/expense";

// ── helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
	return format(new Date(), "yyyy-MM-dd");
}

/** The dedupe key for today's expense batch. */
function batchKey(): string {
	return `expense-batch-${todayStr()}`;
}

/**
 * Filter expenses down to those that are notifiable and due within the
 * configured lead window.  Logs every expense it examines.
 */
function getUpcoming(): Expense[] {
	const expenses = useExpenseStore.getState().expenses;
	const leadDays = useSettingsStore.getState().expenseNotificationLeadDays;
	const today = startOfDay(new Date());
	const cutoff = addDays(today, leadDays);

	const result: Expense[] = [];

	for (const e of expenses) {
		if (!e.notify) {
			continue;
		}
		if (!e.dueDate) {
			continue;
		}
		if (e.isPaid) {
			continue;
		}
		if (e.isArchived) {
			continue;
		}
		if (e.isRecurring && !e.parentExpenseId) {
			continue;
		}

		const due = startOfDay(e.dueDate);
		const inWindow = due >= today && due <= cutoff;

		if (inWindow) result.push(e);
	}

	return result;
}

function dueText(e: Expense): string {
	const days = differenceInDays(startOfDay(e.dueDate!), startOfDay(new Date()));
	return (
		days === 0 ? "today"
		: days === 1 ? "tomorrow"
		: `in ${days} days`
	);
}

function batchTitle(list: Expense[]): string {
	const total = list.reduce((s, e) => s + e.amount, 0);
	return `$${total.toFixed(2)} in expenses due soon`;
}

function batchBody(list: Expense[]): string {
	return [...list]
		.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
		.map((e) => `• ${e.name} ($${e.amount.toFixed(2)}) – ${dueText(e)}`)
		.join("\n");
}

// ── provider (polled every 30 s) ────────────────────────────────────────────
/**
 * Returns the batch notification unconditionally.  The service's session
 * dedupe (keyed on batchKey which includes today's date) is the only gate
 * that prevents repeated firing within a session.
 */
export function expenseProvider(now: number): PendingNotification[] {
	const upcoming = getUpcoming();
	if (upcoming.length === 0) return [];

	return [
		{
			dedupeKey: batchKey(),
			title: batchTitle(upcoming),
			body: batchBody(upcoming),
			fireAt: now, // eligible on every tick; dedupe prevents re-fire
		},
	];
}

// ── startup one-shot ────────────────────────────────────────────────────────
/**
 * Called once after stores are populated.  Fires immediately via sendOnce so
 * the user sees the notification without waiting 30 s for the first tick.
 *
 * sendOnce writes the dedupe key to sessionStorage.  When the first provider
 * tick runs 30 s later it will see the key and skip.
 */
export async function checkExpenseNotificationsOnStartup(): Promise<void> {

	const upcoming = getUpcoming();
	if (upcoming.length === 0) {
		return;
	}

	await notificationService.sendOnce({
		dedupeKey: batchKey(),
		title: batchTitle(upcoming),
		body: batchBody(upcoming),
	});
}

// ── testing helpers (console) ───────────────────────────────────────────────

export function resetExpenseNotificationCheck(): void {
	notificationService.resetDedupe(batchKey());
}

if (typeof window !== "undefined") {
	(window as any).resetExpenseNotificationCheck = resetExpenseNotificationCheck;
}
