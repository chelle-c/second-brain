import { Note, NotesFolders, Subfolder } from "./notes";
import {
	BudgetItem,
	Income,
	IncomeMonthlyData,
	RecurringExpense,
	Expense,
	ExpensesData,
} from "./finance";
import { MindMapNode, MindMapsData } from "./mindmap";

export interface AppData {
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	expenses: Expense[];
	mindMaps: MindMapNode[];
	budgetItems: BudgetItem[];
	incomePayments: Income[];
	monthlyData: IncomeMonthlyData[];
	recurringExpenses: RecurringExpense[];
	expensesData: ExpensesData;
	mindMapsData: MindMapsData;
	lastSaved: Date;
}

export interface AppMetadata {
	lastSaved: Date;
	version: string;
}

export enum AppToSave {
	NotesApp = "notes",
	ExpensesApp = "expenses",
	MindMapsApp = "mindMaps",
	All = "all",
}
