import type Database from "@tauri-apps/plugin-sql";
import type { AppData } from "@/types/";
import type { Folder, Note, Tag } from "@/types/notes";
import type { AppSettings } from "@/types/settings";
import type { ThemeSettings } from "@/types/theme";

export interface StorageCache {
	notes?: Note[];
	folders?: Folder[];
	tags?: Record<string, Tag>;
	expenses?: AppData["expenses"];
	income?: AppData["income"];
	settings?: AppSettings;
	theme?: ThemeSettings;
}

export interface DatabaseContext {
	getDb: () => Database;
	queueOperation: <T>(operation: () => Promise<T>) => Promise<T>;
	cache: StorageCache;
}

export const DATA_VERSION = "0.0.6"; // Increment for migration

export const APP_VERSION = "0.0.1";

export const DEFAULT_PAYMENT_METHODS = ["Default"];
