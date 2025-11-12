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

// Default categories that come with the app
export const DEFAULT_EXPENSE_CATEGORIES = [
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
].sort((a, b) => a.localeCompare(b));

// Default colors for the default categories
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
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

// Extended color pool for new categories
export const COLOR_POOL = [
	"#3b82f6", // blue-500
	"#ef4444", // red-500
	"#f59e0b", // amber-500
	"#8b5cf6", // violet-500
	"#10b981", // emerald-500
	"#dc2626", // red-600
	"#f97316", // orange-500
	"#2563eb", // blue-600
	"#a855f7", // purple-500
	"#14b8a6", // teal-500
	"#22c55e", // green-500
	"#6b7280", // gray-500
	"#ec4899", // pink-500
	"#06b6d4", // cyan-500
	"#84cc16", // lime-500
	"#f43f5e", // rose-500
	"#6366f1", // indigo-500
	"#eab308", // yellow-500
	"#d946ef", // fuchsia-500
	"#0ea5e9", // sky-500
	"#78716c", // stone-500
	"#fb923c", // orange-400
	"#4ade80", // green-400
	"#c084fc", // purple-400
	"#fb7185", // rose-400
	"#facc15", // yellow-400
	"#38bdf8", // sky-400
	"#5b21b6", // violet-800
	"#be123c", // rose-700
	"#0f766e", // teal-700
];

// Helper function to get an available color that's not already in use
export const getAvailableColor = (usedColors: string[]): string => {
	const availableColors = COLOR_POOL.filter((color) => !usedColors.includes(color));
	if (availableColors.length > 0) {
		return availableColors[0];
	}
	// If all colors are used, return a random color from the pool
	return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
};
