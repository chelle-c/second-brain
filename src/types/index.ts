import { Note, NotesFolders, Subfolder } from "./notes";
import { IncomeEntry, IncomeWeeklyTargets, IncomeViewType } from "@/types/income";
import { Expense, OverviewMode } from "./expense";

export interface AppData {
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];

	expenses: {
		expenses: Expense[];
		selectedMonth: Date;
		overviewMode: OverviewMode;
	}

	income: {
		entries: IncomeEntry[];
		weeklyTargets: IncomeWeeklyTargets[];
		viewType: IncomeViewType;
	};

	// mindMaps: MindMapNode[];
	// mindMapsData: MindMapsData;

	isLoading: boolean;
	lastSaved: Date | null;
	autoSaveEnabled: boolean;
}

export interface AppMetadata {
	lastSaved: Date;
	version: string;
}

export enum AppToSave {
	NotesApp = "notes",
	Expenses = "expenses",
	Income = "income",
	MindMapsApp = "mindMaps",
	All = "all",
}
