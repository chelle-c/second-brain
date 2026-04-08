import type { LucideIcon } from "lucide-react";

// ─── Reminder Types ────────────────────────────────────────────────────────

export interface ReminderNotification {
	unit: "minutes" | "hours" | "days";
	value: number;
}

export interface NoteReminder {
	dateTime: string;
	notifications: ReminderNotification[];
}

// ─── Core Types ─────────────────────────────────────────────────────────────

export interface Note {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	createdAt: Date;
	updatedAt: Date;
	archived: boolean;
	reminder?: NoteReminder | null;
	/** Icon identifier – a Lucide icon name (e.g. "FileText") or an emoji character */
	icon?: string | null;
}

export interface Folder {
	id: string;
	name: string;
	parentId: string | null;
	icon?: LucideIcon;
	/** Emoji used as the folder icon (takes priority over `icon` when set) */
	emoji?: string;
	archived?: boolean;
	order?: number;
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
	/** Emoji used as the tag icon (takes priority over `icon` when set) */
	emoji?: string;
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

export interface DeleteConfirmation {
	type: "folder";
	id: string;
	name: string;
}

export interface DraggedFolder {
	folder: Folder;
}

export type FolderSortOption = "custom" | "name-asc" | "name-desc" | "created-asc" | "created-desc";
