export interface Note {
	id: string;
	title: string;
	content: string;
	category?: string;
	folder: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface NotesFolder {
	id: string;
	name: string;
	parent?: string;
	children?: Subfolder[] | undefined;
}

export interface NotesFolders {
	[folderId: string]: {
		id: string;
		name: string;
		parent?: string;
		children?: Subfolder[] | undefined;
	};
}

export interface Subfolder {
	id: string;
	name: string;
	parent: string;
}

export interface Category {
	name: string;
	icon: React.ForwardRefExoticComponent<Omit<any, "ref">>;
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
