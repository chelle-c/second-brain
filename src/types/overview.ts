import type { Expense } from "./expense";

export type OverviewViewType = "cashflow" | "burnrate" | "coverage" | "savings";

export type TimeRange = 1 | 3 | 6 | 9 | 12;

export const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
	{ value: 1, label: "1M" },
	{ value: 3, label: "3M" },
	{ value: 6, label: "6M" },
	{ value: 9, label: "9M" },
	{ value: 12, label: "1Y" },
];

/**
 * Cash Flow view: how many months to display.
 * "all" = full calendar year; numbers = trailing N months ending at the current month.
 */
export type CashFlowRange = "all" | 3 | 6 | 12;

export const CASH_FLOW_RANGE_OPTIONS: Array<{
	value: CashFlowRange;
	label: string;
}> = [
	{ value: 3, label: "Last 3" },
	{ value: 6, label: "Last 6" },
	{ value: 12, label: "Last 12" },
	{ value: "all", label: "Full Year" },
];

export interface MonthlyCashFlow {
	month: string;
	monthDate: Date;
	income: number;
	expenses: number;
	needs: number;
	wants: number;
	net: number;
}

export interface NeedsAnalysis {
	averageMonthly: number;
	total: number;
	monthsAnalyzed: number;
	monthsWithData: number;
	byCategory: Record<string, number>;
	trend: number;
	monthlyValues: Array<{ month: string; monthDate: Date; amount: number }>;
}

export interface IncomeRequirements {
	needsTotal: number;
	wantsTotal: number;
	allExpensesTotal: number;
	actualIncome: number;
	needsGap: number;
	fullGap: number;
	needsCoverage: number;
	fullCoverage: number;
}

/** A recurring want series, condensed to one entry. */
export interface RecurringWantSeries {
	id: string;
	name: string;
	category: string;
	/** Normalized to a monthly amount regardless of actual recurrence frequency. */
	monthlyAmount: number;
	frequency: string;
}

/** How much wants cost in a given upcoming month. */
export interface MonthlyWantObligation {
	month: string;
	monthDate: Date;
	/** Sum of recurring-want occurrences that fall in this month. */
	recurringTotal: number;
	/** Sum of one-off wants due this month. */
	oneOffTotal: number;
	total: number;
	/** Names of one-off items due this month, for tooltip/listing. */
	oneOffItems: string[];
}

export interface SavingsAnalysis {
	/** Recurring want series, one per parent expense (no duplicates). */
	recurringSeries: RecurringWantSeries[];
	/** One-time unpaid wants, sorted by due date. */
	oneOffWants: Expense[];
	/** Forward-looking timeline of required monthly savings. */
	monthlyObligations: MonthlyWantObligation[];
	/** Sum of all recurring series' monthly amounts. */
	totalRecurringPerMonth: number;
	/** Sum of all one-off want amounts. */
	totalOneOff: number;
	/** Average (income − needs) over the selected historical window. */
	averageSurplus: number;
	/** averageSurplus − totalRecurringPerMonth. What's left for one-offs. */
	discretionaryAfterRecurring: number;
}