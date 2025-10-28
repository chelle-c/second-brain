export interface Note {
	id: string;
	title: string;
	content: string;
	category: string;
	folder: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface NotesFolder {
	id: string;
	name: string;
	parent?: string;
	children?: NotesFolder[];
}

export interface NotesFolders {
	[folderId: string]: NotesFolder;
}

// Keep Subfolder for backwards compatibility with existing components
export interface Subfolder {
	id: string;
	name: string;
	parent: string;
}

export interface Category {
	name: string;
	icon: React.ForwardRefExoticComponent<Omit<any, "ref">>;
}

export interface Categories {
	[key: string]: Category;
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

export interface MindMapNode {
	id: string;
	text: string;
	x: number;
	y: number;
	children: string[];
	parentId?: string;
}

export interface AppData {
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	expenses: Expense[];
	mindMaps: MindMapNode[];
	lastSaved: Date;
}

export interface AppMetadata {
	lastSaved: Date;
	version: string;
}

export interface FoldersData {
	folders: NotesFolders;
	version: string;
}

export interface NotesData {
	notes: Note[];
	version: string;
}

export interface ExpensesData {
	expenses: Expense[];
	version: string;
}

export interface MindMapsData {
	mindMaps: MindMapNode[];
	version: string;
}

export enum AppToSave {
	NotesApp = "notes",
	ExpensesApp = "expenses",
	MindMapsApp = "mindMaps",
	All = "all",
}