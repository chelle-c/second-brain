import { Note, NotesFolders, Subfolder, Tag } from "./notes";
import { IncomeEntry, IncomeWeeklyTargets, IncomeViewType } from "@/types/income";
import { Expense, OverviewMode } from "./expense";
import { AppSettings } from "./settings";
import { ThemeSettings } from "./theme";

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
		paymentMethods: string[];
	};

	income: {
		entries: IncomeEntry[];
		weeklyTargets: IncomeWeeklyTargets[];
		viewType: IncomeViewType;
	};

	settings: AppSettings;
	theme: ThemeSettings;

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
