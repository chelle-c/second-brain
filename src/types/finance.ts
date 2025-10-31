export interface BudgetItem {
	id: string;
	name: string;
	amount: number;
	category: "needs" | "wants" | "savings";
	date: string;
}

export interface Income {
	id: string;
	source: string;
	amount: number;
	date: string;
}

export interface MonthlyExpenseData {
	month: string;
	income: number;
	needs: number;
	wants: number;
	savings: number;
}

export interface RecurringExpense {
	id: string;
	name: string;
	amount: number;
	category: "needs" | "wants" | "savings";
	dayOfMonth: number; // 1-31
	isActive: boolean;
}

export interface Expense {
	id: string;
	name: string;
	amount: number;
	dueDate: Date;
	category: string;
	isPaid: boolean;
	isRecurring: boolean;
}

export interface ExpensesData {
	expenses: Expense[];
	version: string;
}

export interface IncomeEntry {
	id: string;
	date: string;
	amount: number;
	hours?: number;
	minutes?: number;
}

export interface IncomeWeeklyTarget {
	amount: number;
}

export interface IncomeDayData {
	name: string;
	amount: number;
	date: Date;
	isCurrentDay: boolean;
}

export interface IncomeParsedEntry {
	date: string;
	amount: number;
	hours?: number;
	minutes?: number;
	rawText: string;
}

export interface IncomeWeekSelection {
	year: number;
	week: number;
	startDate: Date;
	endDate: Date;
}

export interface IncomeWeekInfo {
	number: number;
	startDate: Date;
	endDate: Date;
	label: string;
}

export interface IncomeMonthlyData {
	month: string;
	amount: number;
	hours: number;
	year: number;
	monthNumber: number;
}

export interface IncomeYearlyData {
	year: number;
	amount: number;
	hours: number;
}

export type IncomeViewType = "weekly" | "monthly" | "yearly";
