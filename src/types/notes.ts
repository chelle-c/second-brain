import type { LucideIcon } from "lucide-react";

// ─── Reminder Types ────────────────────────────────────────────────────────

/**
 * A single "notify me N units before" entry.
 * unit: "minutes" | "hours" | "days"
 * value: the numeric amount
 */
export interface ReminderNotification {
	unit: "minutes" | "hours" | "days";
	value: number;
}

/**
 * The full reminder payload stored on a Note.
 * - dateTime: ISO string of the target reminder date/time
 * - notifications: ordered list of "notify before" entries
 */
export interface NoteReminder {
	dateTime: string; // ISO-8601
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
}

export interface Folder {
	id: string;
	name: string;
	parentId: string | null;
	icon?: LucideIcon;
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
