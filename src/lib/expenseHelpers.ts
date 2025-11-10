import { Expense } from "@/types/expense";
import { addDays, addWeeks, addMonths } from "date-fns";

export const generateRecurringExpenses = (
	baseExpense: Expense,
	includeFirst: boolean = true
): Expense[] => {
	const { recurrence, dueDate, id } = baseExpense;
	if (!recurrence || !dueDate) return [];

	const recurringExpenses: Expense[] = [];
	let currentDate = new Date(dueDate);
	const maxOccurrences = recurrence.occurrences || 12;

	// Start from 0 if including first, otherwise start from 1
	const startIndex = includeFirst ? 0 : 1;

	for (let i = startIndex; i < maxOccurrences; i++) {
		// For subsequent occurrences (not the first), increment the date
		if (i > 0) {
			switch (recurrence.frequency) {
				case "daily":
					currentDate = addDays(currentDate, 1);
					break;
				case "weekly":
					currentDate = addWeeks(currentDate, 1);
					break;
				case "biweekly":
					currentDate = addWeeks(currentDate, 2);
					break;
				case "monthly":
					currentDate = addMonths(currentDate, 1);
					break;
				case "custom-days":
					currentDate = addDays(currentDate, recurrence.interval || 1);
					break;
				case "custom-months":
					currentDate = addMonths(currentDate, recurrence.interval || 1);
					break;
			}
		}

		if (recurrence.endDate && currentDate > recurrence.endDate) {
			break;
		}

		const occurrenceDate = new Date(currentDate);
		recurringExpenses.push({
			...baseExpense,
			id: crypto.randomUUID(),
			dueDate: occurrenceDate,
			isPaid: false,
			paymentDate: null,
			parentExpenseId: id,
			monthlyOverrides: {},
			isModified: false,
			initialState: {
				amount: baseExpense.amount,
				dueDate: occurrenceDate,
			},
		});
	}

	return recurringExpenses;
};

export const EXPENSE_CATEGORIES = [
	"Housing",
	"Transportation",
	"Food",
	"Utilities",
	"Insurance",
	"Healthcare",
	"Entertainment",
	"Education",
	"Shopping",
	"Personal",
	"Savings",
	"Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
	Housing: "#3b82f6",
	Transportation: "#ef4444",
	Food: "#f59e0b",
	Utilities: "#8b5cf6",
	Insurance: "#10b981",
	Healthcare: "#dc2626",
	Entertainment: "#f97316",
	Education: "#2563eb",
	Shopping: "#a855f7",
	Personal: "#14b8a6",
	Savings: "#22c55e",
	Other: "#6b7280",
};
