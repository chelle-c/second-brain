export interface ExpensesData {
	expenses: {
		expenses: Expense[];
		selectedMonth: Date;
		overviewMode: OverviewMode;
		categories: string[];
		categoryColors: Record<string, string>;
	};
	version: string;
}

export interface Expense {
	id: string;
	name: string;
	amount: number;
	category: string;
	dueDate: Date | null;
	isRecurring: boolean;
	recurrence?: RecurrenceSettings;
	isArchived: boolean;
	isPaid: boolean;
	paymentDate?: Date | null;
	type: ExpenseType;
	importance: ImportanceLevel;
	createdAt: Date;
	updatedAt: Date;
	parentExpenseId?: string;
	monthlyOverrides?: { [key: string]: Partial<Expense> };
	isModified?: boolean;
	initialState?: OccurrenceInitialState; // Track original values
}

export interface ExpenseFormData {
	name: string;
	amount: number;
	category: string;
	dueDate: Date | null;
	isRecurring: boolean;
	recurrence?: RecurrenceSettings;
	isPaid?: boolean;
	paymentDate?: Date | null;
	type: ExpenseType;
	importance: ImportanceLevel;
}

export type RecurrenceFrequency =
	| "daily"
	| "weekly"
	| "biweekly"
	| "monthly"
	| "custom-days"
	| "custom-months";

export type ExpenseType = "need" | "want";
export type ImportanceLevel = "critical" | "high" | "medium" | "none";
export type OverviewMode = "remaining" | "required" | "all";

export interface RecurrenceSettings {
	frequency: RecurrenceFrequency;
	interval?: number;
	occurrences?: number;
	endDate?: Date;
}

export interface OccurrenceInitialState {
	amount: number;
	dueDate: Date | null;
}
