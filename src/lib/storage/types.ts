import Database from "@tauri-apps/plugin-sql";
import { Note, NotesFolders } from "@/types/notes";
import { AppData } from "@/types/";

export interface StorageCache {
	notes?: Note[];
	folders?: NotesFolders;
	expenses?: AppData["expenses"];
	income?: AppData["income"];
}

export interface DatabaseContext {
	db: Database;
	queueOperation: <T>(operation: () => Promise<T>) => Promise<T>;
	cache: StorageCache;
}

export const DATA_VERSION = "2.0.0";
