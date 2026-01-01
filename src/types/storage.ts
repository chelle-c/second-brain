import type Database from "@tauri-apps/plugin-sql";
import type { AppData } from "@/types/";
import type { Note, NotesFolders, Tag } from "@/types/notes";
import type { AppSettings } from "@/types/settings";
import type { ThemeSettings } from "@/types/theme";

export interface StorageCache {
	notes?: Note[];
	folders?: NotesFolders;
	tags?: Record<string, Tag>;
	expenses?: AppData["expenses"];
	income?: AppData["income"];
	settings?: AppSettings;
	theme?: ThemeSettings;
}

export interface DatabaseContext {
	db: Database;
	queueOperation: <T>(operation: () => Promise<T>) => Promise<T>;
	cache: StorageCache;
}

export const DATA_VERSION = "0.0.5";

// App version for exports - should match tauri.conf.json version
export const APP_VERSION = "0.0.1";

export const DEFAULT_PAYMENT_METHODS = ["Default"];
