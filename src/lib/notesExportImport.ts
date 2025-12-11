import { Note } from "@/types/notes";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export interface NotesExport {
	version: string;
	exportedAt: string;
	notes: ExportedNote[];
}

export interface ExportedNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

export interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	errors: string[];
}

const EXPORT_VERSION = "1.0";

const NOTE_REQUIRED_KEYS: (keyof ExportedNote)[] = [
	"id",
	"title",
	"content",
	"tags",
	"folder",
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
	if (typeof noteObj.folder !== "string") {
		return false;
	}
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

export function exportNotes(notes: Note[]): NotesExport {
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

	return {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		notes: exportedNotes,
	};
}

export function exportNotesToJson(notes: Note[]): string {
	const exportData = exportNotes(notes);
	return JSON.stringify(exportData, null, 2);
}

export function parseImportedNotes(jsonString: string): {
	data: NotesExport | null;
	error: string | null;
} {
	try {
		const parsed = JSON.parse(jsonString);

		if (!isValidExportFormat(parsed)) {
			return {
				data: null,
				error: "Invalid export format. Missing required fields (version, exportedAt, notes).",
			};
		}

		return { data: parsed, error: null };
	} catch {
		return { data: null, error: "Invalid JSON format. Please check the file contents." };
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

		if (isNaN(createdAt.getTime())) {
			errors.push(`Note "${noteData.title}": Invalid createdAt date.`);
			continue;
		}

		if (isNaN(updatedAt.getTime())) {
			errors.push(`Note "${noteData.title}": Invalid updatedAt date.`);
			continue;
		}

		const note: Note = {
			id: noteData.id,
			title: noteData.title,
			content: noteData.content,
			tags: noteData.tags,
			folder: noteData.folder,
			createdAt,
			updatedAt,
			archived: noteData.archived,
		};

		validNotes.push(note);
	}

	return { validNotes, errors, skipped };
}

export async function downloadNotesAsJson(notes: Note[], filename?: string): Promise<boolean> {
	const jsonContent = exportNotesToJson(notes);
	const defaultFilename = filename || `notes-export-${new Date().toISOString().split("T")[0]}.json`;

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
		return false; // User cancelled
	} catch (error) {
		console.error("Failed to save file:", error);
		throw error;
	}
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
