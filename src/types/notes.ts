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

export interface FoldersData {
	folders: NotesFolders;
	version: string;
}

export interface NotesData {
	notes: Note[];
	version: string;
}