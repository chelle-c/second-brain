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

export interface MonthlyData {
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