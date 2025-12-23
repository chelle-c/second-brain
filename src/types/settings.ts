import { IncomeViewType } from "./income";

export type ExpenseViewType = "upcoming" | "monthly" | "all";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.

export interface AppSettings {
	// General settings
	autoSaveEnabled: boolean;

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
	notesDefaultFolder: "inbox",
	expenseDefaultView: "upcoming",
	expenseCurrency: "USD",
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
