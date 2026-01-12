import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import {
	isPermissionGranted,
	requestPermission,
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

// Guard against duplicate calls from React StrictMode
let isCheckingNotifications = false;

/**
 * Send a desktop notification if notifications are enabled in settings.
 * Requests permission if not already granted.
 */
export async function notify(options: NotificationOptions): Promise<boolean> {
	try {
		// Check if notifications are enabled in settings
		const notificationsEnabled =
			useSettingsStore.getState().notificationsEnabled;
		if (!notificationsEnabled) {
			console.log("Notifications disabled in settings");
			return false;
		}

		// Check if permission is granted
		let permissionGranted = await isPermissionGranted();
		console.log("Notification permission granted:", permissionGranted);

		// Request permission if not granted
		if (!permissionGranted) {
			console.log("Requesting notification permission...");
			const permission = await requestPermission();
			permissionGranted = permission === "granted";
			console.log("Permission request result:", permission);

			if (!permissionGranted) {
				console.log("Notification permission denied");
				return false;
			}
		}

		// Send the notification
		console.log("Sending notification:", options);
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
 * Format the due date text for an expense.
 */
function getDueText(expense: Expense): string {
	const daysUntil = differenceInDays(
		startOfDay(expense.dueDate!),
		startOfDay(new Date()),
	);
	return daysUntil === 0
		? "today"
		: daysUntil === 1
			? "tomorrow"
			: `in ${daysUntil} days`;
}

/**
 * Format the expense notification title (shows total amount).
 */
function formatExpenseNotificationTitle(expenses: Expense[]): string {
	const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
	return `$${totalAmount.toFixed(2)} in expenses due soon`;
}

/**
 * Format the expense notification body (lists each expense).
 */
function formatExpenseNotificationBody(expenses: Expense[]): string {
	if (expenses.length === 0) return "";

	// Sort by due date
	const sorted = [...expenses].sort(
		(a, b) => a.dueDate!.getTime() - b.dueDate!.getTime(),
	);

	// List each expense with its due date
	return sorted
		.map((e) => `• ${e.name} ($${e.amount.toFixed(2)}) - ${getDueText(e)}`)
		.join("\n");
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
	// Guard against duplicate calls from React StrictMode
	if (isCheckingNotifications) {
		console.log("Expense notifications: Already checking, skipping duplicate call");
		return;
	}
	isCheckingNotifications = true;

	try {
		const settingsState = useSettingsStore.getState();
		const expenseState = useExpenseStore.getState();

		console.log("Expense notifications check:", {
			notificationsEnabled: settingsState.notificationsEnabled,
			leadDays: settingsState.expenseNotificationLeadDays,
			totalExpenses: expenseState.expenses.length,
			expensesWithNotify: expenseState.expenses.filter(e => e.notify).length,
		});

		// Check if notifications are enabled
		const notificationsEnabled = settingsState.notificationsEnabled;
		if (!notificationsEnabled) {
			console.log("Expense notifications: Desktop notifications disabled");
			return;
		}

		// Check if we've already shown notifications today
		const lastNotificationDate = localStorage.getItem(LAST_EXPENSE_NOTIFICATION_KEY);
		console.log("Last notification date in localStorage:", lastNotificationDate);
		if (!shouldShowExpenseNotifications()) {
			console.log("Expense notifications: Already shown today");
			return;
		}

		// Get upcoming expenses with notify enabled
		const upcomingExpenses = getUpcomingNotifiableExpenses();
		console.log("Upcoming notifiable expenses:", upcomingExpenses.map(e => ({ name: e.name, dueDate: e.dueDate, notify: e.notify })));

		if (upcomingExpenses.length === 0) {
			console.log("Expense notifications: No upcoming expenses to notify");
			// Don't mark as shown - check again next app restart in case data wasn't loaded
			return;
		}

		// Format and send the notification
		const title = formatExpenseNotificationTitle(upcomingExpenses);
		const body = formatExpenseNotificationBody(upcomingExpenses);

		const sent = await notify({ title, body });

		if (sent) {
			console.log("Expense notification sent:", title, body);
			markExpenseNotificationsShown();
		} else {
			console.log("Expense notification failed to send (notifications disabled or permission denied)");
		}
	} catch (error) {
		console.error("Failed to check expense notifications:", error);
	} finally {
		isCheckingNotifications = false;
	}
}

/**
 * Reset the expense notification check (for testing).
 * Call this from the console: resetExpenseNotificationCheck()
 */
export function resetExpenseNotificationCheck(): void {
	localStorage.removeItem(LAST_EXPENSE_NOTIFICATION_KEY);
	console.log("Expense notification check reset - will show on next app restart");
}

// Expose to window for console access
if (typeof window !== "undefined") {
	(window as any).resetExpenseNotificationCheck = resetExpenseNotificationCheck;
}
