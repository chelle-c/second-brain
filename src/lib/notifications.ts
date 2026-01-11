import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import {
	isPermissionGranted,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Expense } from "@/types/expense";

interface NotificationOptions {
	title: string;
	body?: string;
	icon?: string;
}

const LAST_EXPENSE_NOTIFICATION_KEY = "last-expense-notification-date";

/**
 * Send a desktop notification if notifications are enabled in settings.
 * Silently fails if notifications are disabled or permission is not granted.
 */
export async function notify(options: NotificationOptions): Promise<boolean> {
	try {
		// Check if notifications are enabled in settings
		const notificationsEnabled =
			useSettingsStore.getState().notificationsEnabled;
		if (!notificationsEnabled) {
			return false;
		}

		// Check if permission is granted
		const permissionGranted = await isPermissionGranted();
		if (!permissionGranted) {
			return false;
		}

		// Send the notification
		sendNotification(options);
		return true;
	} catch (error) {
		console.error("Failed to send notification:", error);
		return false;
	}
}

/**
 * Get expenses that are due within the notification lead time and have notify enabled.
 */
function getUpcomingNotifiableExpenses(): Expense[] {
	const expenses = useExpenseStore.getState().expenses;
	const leadDays = useSettingsStore.getState().expenseNotificationLeadDays;
	const today = startOfDay(new Date());
	const cutoffDate = addDays(today, leadDays);

	return expenses.filter((expense) => {
		// Must have notify enabled and a due date
		if (!expense.notify || !expense.dueDate) return false;

		// Must not be paid or archived
		if (expense.isPaid || expense.isArchived) return false;

		// Skip parent recurring expenses (we'll notify on occurrences)
		if (expense.isRecurring && !expense.parentExpenseId) return false;

		const dueDate = startOfDay(expense.dueDate);

		// Due date must be between today and the cutoff date (inclusive)
		return dueDate >= today && dueDate <= cutoffDate;
	});
}

/**
 * Format the expense notification message.
 */
function formatExpenseNotificationBody(expenses: Expense[]): string {
	if (expenses.length === 0) return "";

	if (expenses.length === 1) {
		const expense = expenses[0];
		const daysUntil = differenceInDays(
			startOfDay(expense.dueDate!),
			startOfDay(new Date()),
		);
		const dueText =
			daysUntil === 0
				? "due today"
				: daysUntil === 1
					? "due tomorrow"
					: `due in ${daysUntil} days`;

		return `${expense.name} ($${expense.amount.toFixed(2)}) is ${dueText}`;
	}

	// Multiple expenses
	const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
	const soonest = expenses.reduce((min, e) =>
		e.dueDate! < min.dueDate! ? e : min,
	);
	const daysUntilSoonest = differenceInDays(
		startOfDay(soonest.dueDate!),
		startOfDay(new Date()),
	);

	const timeText =
		daysUntilSoonest === 0
			? "starting today"
			: daysUntilSoonest === 1
				? "starting tomorrow"
				: `within ${daysUntilSoonest} days`;

	return `${expenses.length} expenses totaling $${totalAmount.toFixed(2)} are due ${timeText}`;
}

/**
 * Check if we should show expense notifications today.
 * Returns true if notifications haven't been shown today.
 */
function shouldShowExpenseNotifications(): boolean {
	const lastNotificationDate = localStorage.getItem(
		LAST_EXPENSE_NOTIFICATION_KEY,
	);
	const today = format(new Date(), "yyyy-MM-dd");

	return lastNotificationDate !== today;
}

/**
 * Mark that expense notifications have been shown today.
 */
function markExpenseNotificationsShown(): void {
	const today = format(new Date(), "yyyy-MM-dd");
	localStorage.setItem(LAST_EXPENSE_NOTIFICATION_KEY, today);
}

/**
 * Check for upcoming expenses and show a notification if needed.
 * This should be called once on app startup after data is loaded.
 */
export async function checkExpenseNotifications(): Promise<void> {
	try {
		// Check if notifications are enabled
		const notificationsEnabled =
			useSettingsStore.getState().notificationsEnabled;
		if (!notificationsEnabled) {
			console.log("Expense notifications: Desktop notifications disabled");
			return;
		}

		// Check if we've already shown notifications today
		if (!shouldShowExpenseNotifications()) {
			console.log("Expense notifications: Already shown today");
			return;
		}

		// Get upcoming expenses with notify enabled
		const upcomingExpenses = getUpcomingNotifiableExpenses();

		if (upcomingExpenses.length === 0) {
			console.log("Expense notifications: No upcoming expenses to notify");
			// Still mark as shown so we don't keep checking
			markExpenseNotificationsShown();
			return;
		}

		// Format and send the notification
		const body = formatExpenseNotificationBody(upcomingExpenses);
		const title =
			upcomingExpenses.length === 1
				? "Expense Reminder"
				: `${upcomingExpenses.length} Expenses Due Soon`;

		const sent = await notify({ title, body });

		if (sent) {
			console.log("Expense notification sent:", title, body);
			markExpenseNotificationsShown();
		}
	} catch (error) {
		console.error("Failed to check expense notifications:", error);
	}
}
