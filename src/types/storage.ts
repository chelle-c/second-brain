import Database from "@tauri-apps/plugin-sql";
import { Note, NotesFolders, Tag } from "@/types/notes";
import { AppData } from "@/types/";
import { AppSettings } from "@/types/settings";

export interface StorageCache {
	notes?: Note[];
	folders?: NotesFolders;
	tags?: Record<string, Tag>;
	expenses?: AppData["expenses"];
	income?: AppData["income"];
	settings?: AppSettings;
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