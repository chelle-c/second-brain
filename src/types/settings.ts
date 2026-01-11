import type { IncomeViewType } from "./income";

export type ExpenseViewType = "upcoming" | "monthly" | "all";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.

export interface AppSettings {
	// General settings
	autoSaveEnabled: boolean;

	// Desktop settings
	launchAtLogin: boolean;
	minimizeToTray: boolean;
	notificationsEnabled: boolean;

	// Notes settings
	notesDefaultFolder: string; // folder id, "inbox" is default

	// Expense settings
	expenseDefaultView: ExpenseViewType;
	expenseCurrency: string;

	// Income settings
	incomeDefaultView: IncomeViewType;
	incomeWeekStartDay: WeekStartDay;
	incomeCurrency: string;
	incomeDefaultWeeklyTarget: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
	autoSaveEnabled: true,
	launchAtLogin: false,
	minimizeToTray: true,
	notificationsEnabled: true,
	notesDefaultFolder: "inbox",
	expenseDefaultView: "upcoming",
	expenseCurrency: "USD",
	expenseNotificationLeadDays: 7, // Default: notify 7 days before due date
	incomeDefaultView: "monthly",
	incomeWeekStartDay: 1, // Monday
	incomeCurrency: "USD",
	incomeDefaultWeeklyTarget: 1000,
};

export const CURRENCY_OPTIONS = [
	{ value: "USD", label: "$ USD", symbol: "$" },
	{ value: "EUR", label: "€ EUR", symbol: "€" },
	{ value: "GBP", label: "£ GBP", symbol: "£" },
	{ value: "JPY", label: "¥ JPY", symbol: "¥" },
	{ value: "CAD", label: "$ CAD", symbol: "$" },
	{ value: "AUD", label: "$ AUD", symbol: "$" },
	{ value: "CHF", label: "CHF", symbol: "CHF" },
	{ value: "CNY", label: "¥ CNY", symbol: "¥" },
	{ value: "INR", label: "₹ INR", symbol: "₹" },
	{ value: "KRW", label: "₩ KRW", symbol: "₩" },
	{ value: "BRL", label: "R$ BRL", symbol: "R$" },
	{ value: "MXN", label: "$ MXN", symbol: "$" },
];

export const WEEK_DAYS = [
	{ value: 0, label: "Sunday" },
	{ value: 1, label: "Monday" },
	{ value: 2, label: "Tuesday" },
	{ value: 3, label: "Wednesday" },
	{ value: 4, label: "Thursday" },
	{ value: 5, label: "Friday" },
	{ value: 6, label: "Saturday" },
] as const;

export const EXPENSE_NOTIFICATION_LEAD_DAYS = [
	{ value: 0, label: "On due date" },
	{ value: 1, label: "1 day before" },
	{ value: 3, label: "3 days before" },
	{ value: 7, label: "1 week before" },
	{ value: 14, label: "2 weeks before" },
	{ value: 21, label: "3 weeks before" },
	{ value: 30, label: "1 month before" },
] as const;
