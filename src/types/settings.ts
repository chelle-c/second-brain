import type { IncomeViewType } from "./income";
import type { CalendarViewType } from "./calendar";

export type ExpenseViewType = "upcoming" | "monthly" | "all";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AppSettings {
	autoSaveEnabled: boolean;
	launchAtLogin: boolean;
	minimizeToTray: boolean;
	notificationsEnabled: boolean;
	notesDefaultFolder: string;
	expenseDefaultView: ExpenseViewType;
	expenseCurrency: string;
	expenseNotificationLeadDays: number;
	incomeDefaultView: IncomeViewType;
	incomeWeekStartDay: WeekStartDay;
	incomeCurrency: string;
	incomeDefaultWeeklyTarget: number;
	calendarDayStartHour: number;
	calendarDefaultView: CalendarViewType;
}

export const DEFAULT_SETTINGS: AppSettings = {
	autoSaveEnabled: true,
	launchAtLogin: false,
	minimizeToTray: true,
	notificationsEnabled: true,
	notesDefaultFolder: "inbox",
	expenseDefaultView: "upcoming",
	expenseCurrency: "USD",
	expenseNotificationLeadDays: 7,
	incomeDefaultView: "monthly",
	incomeWeekStartDay: 1,
	incomeCurrency: "USD",
	incomeDefaultWeeklyTarget: 1000,
	calendarDayStartHour: 6,
	calendarDefaultView: "month",
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

/**
 * Every hour 0-23 as a selectable option.  The label uses the same
 * locale-aware formatting the time grid itself uses so the picker and the
 * grid always agree.
 */
export const CALENDAR_DAY_START_OPTIONS: { value: number; label: string }[] = Array.from(
	{ length: 24 },
	(_, h) => {
		// Build a Date at that hour so toLocaleTimeString formats it identically
		// to how the calendar grid labels its rows.
		const d = new Date(2000, 0, 1, h, 0, 0, 0);
		return {
			value: h,
			label: d.toLocaleTimeString(undefined, {
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			}),
		};
	},
);
