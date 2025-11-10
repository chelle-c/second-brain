export interface IncomeData {
	income: {
		entries: IncomeEntry[];
		weeklyTargets: IncomeWeeklyTargets[];
		viewType: IncomeViewType;
	};
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

export interface IncomeWeeklyTargets {
	id: string;
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
