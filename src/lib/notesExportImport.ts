import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
	folderIdSegmentToDisplayName,
	getParentIdFromFolderId,
	parseFolderIdPath,
} from "@/lib/folderHelpers";
import type { Folder, Note } from "@/types/notes";
import { APP_VERSION } from "@/types/storage";

export interface NotesExport {
	version: string;
	exportedAt: string;
	notes: ExportedNote[];
	folders?: ExportedFolder[]; // Optional for backwards compatibility
}

export interface ExportedNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder?: string;
	folderId?: string; // Legacy support
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

export interface ExportedFolder {
	id: string;
	name: string;
	parentId: string | null;
	icon?: string;
	archived: boolean;
	order: number;
	createdAt: string;
	updatedAt: string;
}

export interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	errors: string[];
}

const NOTE_REQUIRED_KEYS: (keyof ExportedNote)[] = [
	"id",
	"title",
	"content",
	"tags",
	"createdAt",
	"updatedAt",
	"archived",
];

function isValidNote(note: unknown): note is ExportedNote {
	if (typeof note !== "object" || note === null) {
		return false;
	}

	const noteObj = note as Record<string, unknown>;

	for (const key of NOTE_REQUIRED_KEYS) {
		if (!(key in noteObj)) {
			return false;
		}
	}

	if (typeof noteObj.id !== "string" || noteObj.id.trim() === "") {
		return false;
	}
	if (typeof noteObj.title !== "string") {
		return false;
	}
	if (typeof noteObj.content !== "string") {
		return false;
	}
	if (!Array.isArray(noteObj.tags) || !noteObj.tags.every((t) => typeof t === "string")) {
		return false;
	}

	// folder/folderId is optional - we default to inbox if missing

	if (typeof noteObj.createdAt !== "string") {
		return false;
	}
	if (typeof noteObj.updatedAt !== "string") {
		return false;
	}
	if (typeof noteObj.archived !== "boolean") {
		return false;
	}

	return true;
}

function isValidExportFormat(data: unknown): data is NotesExport {
	if (typeof data !== "object" || data === null) {
		return false;
	}

	const exportObj = data as Record<string, unknown>;

	if (typeof exportObj.version !== "string") {
		return false;
	}
	if (typeof exportObj.exportedAt !== "string") {
		return false;
	}
	if (!Array.isArray(exportObj.notes)) {
		return false;
	}

	return true;
}

/**
 * Get icon name from icon component for export
 */
function getIconNameForExport(icon: unknown): string | undefined {
	if (!icon) return undefined;

	if (typeof icon === "function") {
		const iconComponent = icon as { displayName?: string; name?: string };
		return iconComponent.displayName || iconComponent.name || undefined;
	}

	return undefined;
}

export function exportNotes(notes: Note[], folders?: Folder[]): NotesExport {
	const exportedNotes: ExportedNote[] = notes.map((note) => ({
		id: note.id,
		title: note.title,
		content: note.content,
		tags: note.tags || [],
		folder: note.folder,
		createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
		updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
		archived: note.archived,
	}));

	const exportedFolders: ExportedFolder[] | undefined = folders?.map((folder) => ({
		id: folder.id,
		name: folder.name,
		parentId: folder.parentId,
		icon: getIconNameForExport(folder.icon),
		archived: folder.archived || false,
		order: folder.order || 0,
		createdAt:
			folder.createdAt instanceof Date ? folder.createdAt.toISOString() : folder.createdAt || new Date().toISOString(),
		updatedAt:
			folder.updatedAt instanceof Date ? folder.updatedAt.toISOString() : folder.updatedAt || new Date().toISOString(),
	}));

	return {
		version: APP_VERSION,
		exportedAt: new Date().toISOString(),
		notes: exportedNotes,
		folders: exportedFolders,
	};
}

export function exportNotesToJson(notes: Note[], folders?: Folder[]): string {
	const exportData = exportNotes(notes, folders);
	return JSON.stringify(exportData, null, 2);
}

export function parseImportedNotes(jsonString: string): {
	data: NotesExport | null;
	error: string | null;
} {
	try {
		const parsed = JSON.parse(jsonString);

		if (!isValidExportFormat(parsed)) {
			// Provide more specific error messages
			const exportObj = parsed as Record<string, unknown>;
			const missing: string[] = [];
			if (typeof exportObj.version !== "string") missing.push("version");
			if (typeof exportObj.exportedAt !== "string") missing.push("exportedAt");
			if (!Array.isArray(exportObj.notes)) missing.push("notes array");

			return {
				data: null,
				error: `Invalid notes export format. Missing: ${missing.join(", ")}. This may be an expenses export file.`,
			};
		}

		return { data: parsed, error: null };
	} catch (e) {
		return {
			data: null,
			error: `Invalid JSON format: ${e instanceof Error ? e.message : "unknown error"}`,
		};
	}
}

export function validateAndConvertNotes(
	exportData: NotesExport,
	existingNoteIds: Set<string>
): { validNotes: Note[]; errors: string[]; skipped: number } {
	const validNotes: Note[] = [];
	const errors: string[] = [];
	let skipped = 0;

	for (let i = 0; i < exportData.notes.length; i++) {
		const noteData = exportData.notes[i];

		if (!isValidNote(noteData)) {
			errors.push(`Note at index ${i}: Invalid structure or missing required fields.`);
			continue;
		}

		if (existingNoteIds.has(noteData.id)) {
			skipped++;
			continue;
		}

		const createdAt = new Date(noteData.createdAt);
		const updatedAt = new Date(noteData.updatedAt);

		if (Number.isNaN(createdAt.getTime())) {
			errors.push(`Note "${noteData.title}": Invalid createdAt date.`);
			continue;
		}

		if (Number.isNaN(updatedAt.getTime())) {
			errors.push(`Note "${noteData.title}": Invalid updatedAt date.`);
			continue;
		}

		// Use folder if present, otherwise use folderId (legacy), otherwise default to inbox
		const folder = noteData.folder || noteData.folderId || "inbox";

		const note: Note = {
			id: noteData.id,
			title: noteData.title,
			content: noteData.content,
			tags: noteData.tags,
			folder,
			createdAt,
			updatedAt,
			archived: noteData.archived,
		};

		validNotes.push(note);
	}

	return { validNotes, errors, skipped };
}

export async function downloadNotesAsJson(
	notes: Note[],
	folders?: Folder[],
	filename?: string
): Promise<boolean> {
	const jsonContent = exportNotesToJson(notes, folders);
	const defaultFilename =
		filename || `notes-export-${new Date().toISOString().split("T")[0]}.json`;

	try {
		const filePath = await save({
			defaultPath: defaultFilename,
			filters: [
				{
					name: "JSON",
					extensions: ["json"],
				},
			],
		});

		if (filePath) {
			await writeTextFile(filePath, jsonContent);
			return true;
		}
		return false;
	} catch (error) {
		console.error("Failed to save file:", error);
		throw error;
	}
}

/**
 * Validate and convert folders from exported data
 */
export function validateAndConvertFolders(
	exportData: NotesExport,
	existingFolderIds: Set<string>
): { validFolders: Folder[]; errors: string[]; skipped: number } {
	const validFolders: Folder[] = [];
	const errors: string[] = [];
	let skipped = 0;

	if (!exportData.folders || !Array.isArray(exportData.folders)) {
		return { validFolders, errors, skipped };
	}

	for (let i = 0; i < exportData.folders.length; i++) {
		const folderData = exportData.folders[i];

		// Skip inbox - it's always present
		if (folderData.id === "inbox") {
			skipped++;
			continue;
		}

		// Skip if already exists
		if (existingFolderIds.has(folderData.id)) {
			skipped++;
			continue;
		}

		// Validate required fields
		if (!folderData.id || typeof folderData.id !== "string") {
			errors.push(`Folder at index ${i}: Missing or invalid id.`);
			continue;
		}

		if (!folderData.name || typeof folderData.name !== "string") {
			errors.push(`Folder at index ${i}: Missing or invalid name.`);
			continue;
		}

		const createdAt = folderData.createdAt ? new Date(folderData.createdAt) : new Date();
		const updatedAt = folderData.updatedAt ? new Date(folderData.updatedAt) : new Date();

		const folder: Folder = {
			id: folderData.id,
			name: folderData.name,
			parentId: folderData.parentId || null,
			archived: folderData.archived || false,
			order: folderData.order || 0,
			createdAt,
			updatedAt,
		};

		validFolders.push(folder);
	}

	return { validFolders, errors, skipped };
}

/**
 * Reconstruct folders from note folder references
 * This is used when importing data that doesn't have explicit folder definitions
 * but has notes with folder IDs in the format "parent_child_grandchild"
 */
export function reconstructFoldersFromNotes(
	notes: Note[],
	existingFolders: Folder[]
): Folder[] {
	const existingFolderIds = new Set(existingFolders.map((f) => f.id));
	const newFolders: Map<string, Folder> = new Map();
	const now = new Date();

	for (const note of notes) {
		const folderId = note.folder;
		if (!folderId || folderId === "inbox" || existingFolderIds.has(folderId)) {
			continue;
		}

		// Parse the folder ID to get all ancestor paths
		const pathIds = parseFolderIdPath(folderId);

		for (const pathId of pathIds) {
			if (existingFolderIds.has(pathId) || newFolders.has(pathId)) {
				continue;
			}

			const parentId = getParentIdFromFolderId(pathId);
			const nameSegment = pathId.includes("_")
				? pathId.substring(pathId.lastIndexOf("_") + 1)
				: pathId;

			const folder: Folder = {
				id: pathId,
				name: folderIdSegmentToDisplayName(nameSegment),
				parentId: parentId,
				archived: false,
				order: newFolders.size,
				createdAt: now,
				updatedAt: now,
			};

			newFolders.set(pathId, folder);
		}
	}

	return Array.from(newFolders.values());
}

export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (event) => {
			if (event.target?.result) {
				resolve(event.target.result as string);
			} else {
				reject(new Error("Failed to read file"));
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsText(file);
	});
}
