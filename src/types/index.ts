import type {
	IncomeEntry,
	IncomeViewType,
	IncomeWeeklyTargets,
} from "@/types/income";
import type { Expense, OverviewMode } from "./expense";
import type { Note, NotesFolders, Subfolder, Tag } from "./notes";
import type { AppSettings } from "./settings";
import type { ThemeSettings } from "./theme";

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
