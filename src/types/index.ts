import { Note, NotesFolders, Subfolder } from "./notes";
import { Expense, IncomeEntry, IncomeWeeklyTargets, IncomeViewType } from "../types/finance";
import { MindMapNode, MindMapsData } from "./mindmap";

export interface AppData {
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];

	expenses: Expense[];

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
	FinanceApp = "expenses",
	MindMapsApp = "mindMaps",
	All = "all",
}
