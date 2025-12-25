export interface Note {
	id: string;
	title: string;
	content: string;
	tags: string[]; // Changed from category to tags array
	folder: string;
	createdAt: Date;
	updatedAt: Date;
	archived: boolean; // Added archived flag
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

export interface Subfolder {
	id: string;
	name: string;
	parent: string;
}

export interface Tag {
	id: string;
	name: string;
	color: string;
	icon: React.ForwardRefExoticComponent<
		Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
			size?: number | string;
		}
	>;
}

export interface Tags {
	[key: string]: Tag;
}

export interface FoldersData {
	folders: NotesFolders;
	version: string;
}

export interface NotesData {
	notes: Note[];
	version: string;
}
