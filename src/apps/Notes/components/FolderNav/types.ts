import type { Folder } from "@/types/notes";

export interface DeleteConfirmation {
	type: "folder";
	id: string;
	name: string;
}

export interface DraggedFolder {
	folder: Folder;
}

export type FolderSortOption = "name-asc" | "name-desc" | "created-asc" | "created-desc";
