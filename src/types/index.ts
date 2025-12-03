import { Note, NotesFolders, Subfolder, Tag } from "./notes";
import { IncomeEntry, IncomeWeeklyTargets, IncomeViewType } from "@/types/income";
import { Expense, OverviewMode } from "./expense";

export interface AppData {
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	tags: Record<string, Tag>;

	expenses: {
		expenses: Expense[];
		selectedMonth: Date;
		overviewMode: OverviewMode;
		categories: string[];
		categoryColors: Record<string, string>;
	};

	income: {
		entries: IncomeEntry[];
		weeklyTargets: IncomeWeeklyTargets[];
		viewType: IncomeViewType;
	};

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
