import type { LucideIcon } from "lucide-react";

export interface Note {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string; // Changed from folderId to folder
	createdAt: Date;
	updatedAt: Date;
	archived: boolean;
}

export interface Folder {
	id: string;
	name: string;
	parentId: string | null; // null for root folders, string for subfolders
	icon?: LucideIcon;
	archived?: boolean;
	order?: number; // For custom ordering
	createdAt?: Date;
	updatedAt?: Date;
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

// Legacy types for migration
export interface NotesFolder {
	id: string;
	name: string;
	parent?: string;
	children?: NotesFolder[];
	icon?: LucideIcon;
}

export interface NotesFolders {
	[folderId: string]: NotesFolder;
}

export interface Subfolder {
	id: string;
	name: string;
	parent: string;
}
