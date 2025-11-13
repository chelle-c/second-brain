import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import { Note, NotesFolder, NotesFolders, Subfolder } from "@/types/notes";
import { AppToSave } from "@/types";

interface NotesStore {
	// State
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];

	// Actions

	// Set state
	setNotes: (notes: Note[]) => void;
	setNotesFolders: (folders: NotesFolders) => void;
	setSubfolders: (subfolders: Subfolder[]) => void;

	// Notes
	addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
	updateNote: (id: string, updates: Partial<Note>) => void;
	deleteNote: (id: string) => void;
	categorizeNote: (id: string, newCategory: string) => void;
	moveNote: (id: string, newFolder: string, newCategory?: string) => void;

	// Notes Folders
	addSubFolder: (subfolder: Subfolder) => void;
	updateSubFolder: (id: string, updates: Partial<NotesFolder>) => void;
	removeSubfolder: (id: string) => void;
}

export const useNotesStore = create<NotesStore>()(
	subscribeWithSelector((set, get) => ({
		notes: [],
		notesFolders: {},
		subfolders: [],

		// Note actions
		addNote: (noteData) => {
			const note: Note = {
				...noteData,
				id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			set((state) => ({
				notes: [...state.notes, note],
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		updateNote: (id, updates) => {
			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
				),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		deleteNote: (id) => {
			set((state) => ({
				notes: state.notes.filter((note) => note.id !== id),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		setNotes: (notes: Note[]) => set({ notes }),

		categorizeNote: (id, newCategory) => {
			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id
						? { ...note, category: newCategory, movedAt: new Date().toISOString() }
						: note
				),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		moveNote: (id, newFolder, newCategory?) => {
			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id
						? {
								...note,
								folder: newFolder,
								category: newCategory || note.category,
						  }
						: note
				),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Notes Folder Actions
		setSubfolders: (subfolders) => set({ subfolders: subfolders }),

		setNotesFolders: (folders) => set({ notesFolders: folders }),

		addSubFolder: (subfolder) => {
			set((state) => {
				const newFolders = { ...state.notesFolders };
				const parentFolder = newFolders[subfolder.parent];

				if (parentFolder) {
					const newSubfolderEntry = {
						id: subfolder.id,
						name: subfolder.name,
						parent: subfolder.parent,
						children: [],
					};

					parentFolder.children = parentFolder.children || [];
					parentFolder.children.push(newSubfolderEntry);
				}

				const newSubfolders = [...state.subfolders, subfolder];

				return {
					notesFolders: newFolders,
					subfolders: newSubfolders,
				};
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		updateSubFolder: (id, updates) => {
			set((state) => {
				const newFolders = { ...state.notesFolders };

				Object.values(newFolders).forEach((folder) => {
					if (folder.children) {
						folder.children = folder.children.map((child) => {
							if (child.id === id) {
								return { ...child, ...updates };
							}
							return child;
						});
					}
				});

				const newSubfolders = state.subfolders.map((subfolder) =>
					subfolder.id === id ? { ...subfolder, ...updates } : subfolder
				);

				return {
					notesFolders: newFolders,
					subfolders: newSubfolders,
				};
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		removeSubfolder: (id) => {
			const subfolder = get().subfolders.find((sf) => sf.id === id);

			set((state) => {
				const newFolders = { ...state.notesFolders };

				Object.values(newFolders).forEach((folder) => {
					if (folder.children) {
						folder.children = folder.children.filter((child) => child.id !== id);
					}
				});

				const newNotes = state.notes.map((note) =>
					subfolder && note.folder === subfolder.id
						? { ...note, folder: subfolder.parent || "inbox" }
						: note
				);

				const newSubfolders = state.subfolders.filter((sf) => sf.id !== id);

				return {
					notesFolders: newFolders,
					notes: newNotes,
					subfolders: newSubfolders,
				};
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},
	}))
);