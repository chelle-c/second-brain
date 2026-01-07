import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
	calculateFolderMerge,
	canMoveFolder,
	findDuplicateFolderByName,
	generateFolderId,
	getFolderDescendants,
	getFolderSubtreeIds,
	regenerateFolderIds,
	reorderFolders,
	updateNotesFolderReferences,
	validateFolderName,
} from "@/lib/folderHelpers";
import { AppToSave } from "@/types";
import type { Folder, Note, Tag } from "@/types/notes";
import useAppStore from "./useAppStore";
import { type HistoryAction, useHistoryStore } from "./useHistoryStore";

interface NotesStore {
	// State
	notes: Note[];
	folders: Folder[];
	tags: Record<string, Tag>;

	// Setters (for loading without triggering saves)
	setNotes: (notes: Note[], skipSave?: boolean) => void;
	setFolders: (folders: Folder[], skipSave?: boolean) => void;
	setTags: (tags: Record<string, Tag>) => void;

	// Notes Actions
	addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt" | "archived">) => string;
	updateNote: (id: string, updates: Partial<Note>, recordHistory?: boolean) => void;
	deleteNote: (id: string) => void;
	archiveNote: (id: string) => void;
	unarchiveNote: (id: string) => void;
	moveNote: (id: string, newFolderId: string) => void;
	restoreNote: (note: Note) => void;

	// Folder Actions
	addFolder: (
		folder: Omit<Folder, "id" | "createdAt" | "updatedAt" | "archived" | "order">
	) => { id: string | null; error: string | null };
	updateFolder: (id: string, updates: Partial<Folder>) => { success: boolean; error: string | null };
	deleteFolder: (id: string) => void;
	archiveFolder: (id: string) => void;
	unarchiveFolder: (id: string) => void;
	moveFolder: (id: string, newParentId: string | null) => void;
	restoreFolder: (folder: Folder, withChildren?: Folder[]) => void;

	// Tags Actions
	addTag: (tag: Tag) => void;
	updateTag: (id: string, updates: Partial<Tag>) => void;
	deleteTag: (id: string) => void;

	// Undo/Redo
	undo: () => void;
	redo: () => void;
}

export const useNotesStore = create<NotesStore>()(
	subscribeWithSelector((set, get) => ({
		notes: [],
		folders: [],
		tags: {},

		// Setters
		setNotes: (notes, skipSave = false) => {
			set({ notes });
			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		setFolders: (folders, skipSave = false) => {
			set({ folders });
			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		setTags: (tags) => set({ tags }),

		// Notes Actions
		addNote: (noteData) => {
			const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const note: Note = {
				...noteData,
				id: noteId,
				createdAt: new Date(),
				updatedAt: new Date(),
				archived: false,
				tags: noteData.tags || [],
			};

			set((state) => ({
				notes: [...state.notes, note],
			}));

			useHistoryStore.getState().pushAction({
				type: "CREATE_NOTE",
				data: { after: note, id: noteId },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}

			return noteId;
		},

		updateNote: (id, updates, recordHistory = true) => {
			const oldNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
				),
			}));

			if (recordHistory && oldNote) {
				const newNote = get().notes.find((n) => n.id === id);
				useHistoryStore.getState().pushAction({
					type: "UPDATE_NOTE",
					data: { before: oldNote, after: newNote, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		deleteNote: (id) => {
			const deletedNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.filter((note) => note.id !== id),
			}));

			if (deletedNote) {
				useHistoryStore.getState().pushAction({
					type: "DELETE_NOTE",
					data: { before: deletedNote, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		archiveNote: (id) => {
			const oldNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, archived: true, updatedAt: new Date() } : note
				),
			}));

			if (oldNote) {
				useHistoryStore.getState().pushAction({
					type: "ARCHIVE_NOTE",
					data: { before: oldNote, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		unarchiveNote: (id) => {
			const oldNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, archived: false, updatedAt: new Date() } : note
				),
			}));

			if (oldNote) {
				useHistoryStore.getState().pushAction({
					type: "UNARCHIVE_NOTE",
					data: { before: oldNote, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		moveNote: (id, newFolderId) => {
			const oldNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, folder: newFolderId, updatedAt: new Date() } : note
				),
			}));

			if (oldNote) {
				useHistoryStore.getState().pushAction({
					type: "MOVE_NOTE",
					data: {
						before: oldNote,
						after: { ...oldNote, folder: newFolderId },
						id,
					},
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		restoreNote: (note) => {
			set((state) => ({
				notes: [...state.notes, note],
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Folder Actions
		addFolder: (folderData) => {
			const folders = get().folders;

			// Validate for duplicate names at the same level (exact match)
			const validationError = validateFolderName(
				folderData.name,
				folderData.parentId,
				folders
			);

			if (validationError) {
				return { id: null, error: validationError };
			}

			const folderId = generateFolderId(
				folderData.name,
				folderData.parentId,
				folders
			);
			const now = new Date();

			const siblings = folders.filter((f) => f.parentId === folderData.parentId);
			const maxOrder = Math.max(0, ...siblings.map((f) => f.order || 0));

			const folder: Folder = {
				...folderData,
				id: folderId,
				archived: false,
				order: maxOrder + 1,
				createdAt: now,
				updatedAt: now,
			};

			set((state) => ({
				folders: [...state.folders, folder],
			}));

			useHistoryStore.getState().pushAction({
				type: "CREATE_FOLDER",
				data: { after: folder, id: folderId },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}

			return { id: folderId, error: null };
		},

		updateFolder: (id, updates) => {
			if (id === "inbox" && (updates.name || updates.parentId !== undefined)) {
				return { success: false, error: "Cannot modify inbox folder name or location" };
			}

			const folders = get().folders;
			const notes = get().notes;
			const oldFolder = folders.find((f) => f.id === id);

			if (!oldFolder) {
				return { success: false, error: "Folder not found" };
			}

			// Check if name is changing - if so, we need to validate and regenerate IDs
			const isRenaming = updates.name && updates.name !== oldFolder.name;

			if (isRenaming) {
				// Validate for duplicate names at the same level (exact match)
				const validationError = validateFolderName(
					updates.name!,
					oldFolder.parentId,
					folders,
					id // Exclude current folder from duplicate check
				);

				if (validationError) {
					return { success: false, error: validationError };
				}

				// Regenerate folder IDs for the renamed folder and all descendants
				const { updatedFolders, idMapping } = regenerateFolderIds(
					oldFolder,
					oldFolder.parentId, // Keep same parent
					folders,
					updates.name // Pass the new name
				);

				// Get IDs of folders that were updated
				const oldFolderIds = new Set(idMapping.keys());

				// Update notes to reference new folder IDs
				const updatedNotes = updateNotesFolderReferences(notes, idMapping);

				// Apply any other updates (like icon) to the renamed folder
				const newFolderId = idMapping.get(id);
				const finalUpdatedFolders = updatedFolders.map((f) => {
					if (f.id === newFolderId) {
						const { name, ...otherUpdates } = updates;
						return { ...f, ...otherUpdates };
					}
					return f;
				});

				set((state) => ({
					folders: reorderFolders([
						...state.folders.filter((f) => !oldFolderIds.has(f.id)),
						...finalUpdatedFolders,
					]),
					notes: updatedNotes,
				}));

				const newFolder = finalUpdatedFolders.find((f) => f.id === newFolderId);
				useHistoryStore.getState().pushAction({
					type: "UPDATE_FOLDER",
					data: {
						before: oldFolder,
						after: newFolder,
						id,
						idMapping: Object.fromEntries(idMapping), // Store mapping for undo
					},
				});
			} else {
				// Simple update without name change - no ID regeneration needed
				set((state) => ({
					folders: state.folders.map((folder) =>
						folder.id === id
							? {
									...folder,
									...updates,
									updatedAt: new Date(),
							  }
							: folder
					),
				}));

				useHistoryStore.getState().pushAction({
					type: "UPDATE_FOLDER",
					data: { before: oldFolder, after: { ...oldFolder, ...updates }, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}

			return { success: true, error: null };
		},

		deleteFolder: (id) => {
			if (id === "inbox") return;

			const deletedFolder = get().folders.find((f) => f.id === id);
			if (!deletedFolder) return;

			const descendants = getFolderDescendants(get().folders, id);
			const affectedFolderIds = getFolderSubtreeIds(get().folders, id);

			const affectedNotes = get().notes.filter((note) =>
				affectedFolderIds.includes(note.folder)
			);

			set((state) => ({
				notes: state.notes.map((note) =>
					affectedFolderIds.includes(note.folder) ? { ...note, folder: "inbox" } : note
				),
				folders: reorderFolders(
					state.folders.filter((f) => !affectedFolderIds.includes(f.id))
				),
			}));

			useHistoryStore.getState().pushAction({
				type: "DELETE_FOLDER",
				data: {
					before: deletedFolder,
					id,
					affectedNotes: affectedNotes.map((n) => ({
						id: n.id,
						folder: n.folder,
					})),
					affectedSubfolders: descendants,
				},
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		archiveFolder: (id) => {
			if (id === "inbox") return;

			const oldFolder = get().folders.find((f) => f.id === id);
			if (!oldFolder) return;

			const descendantIds = getFolderSubtreeIds(get().folders, id);

			set((state) => ({
				folders: state.folders.map((folder) =>
					descendantIds.includes(folder.id)
						? { ...folder, archived: true, updatedAt: new Date() }
						: folder
				),
			}));

			useHistoryStore.getState().pushAction({
				type: "ARCHIVE_FOLDER",
				data: { before: oldFolder, id },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		unarchiveFolder: (id) => {
			const oldFolder = get().folders.find((f) => f.id === id);
			if (!oldFolder) return;

			const descendantIds = getFolderSubtreeIds(get().folders, id);

			set((state) => ({
				folders: state.folders.map((folder) =>
					descendantIds.includes(folder.id)
						? { ...folder, archived: false, updatedAt: new Date() }
						: folder
				),
			}));

			useHistoryStore.getState().pushAction({
				type: "UNARCHIVE_FOLDER",
				data: { before: oldFolder, id },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		moveFolder: (id, newParentId) => {
			if (id === "inbox") return;

			const folders = get().folders;
			const notes = get().notes;

			if (!canMoveFolder(folders, id, newParentId)) {
				console.warn("Invalid folder move operation");
				return;
			}

			const oldFolder = folders.find((f) => f.id === id);
			if (!oldFolder) return;

			// Skip if not actually moving (same parent)
			if (oldFolder.parentId === newParentId) return;

			// Check if a folder with the same name exists at the target location
			const conflictingFolder = findDuplicateFolderByName(
				oldFolder.name,
				newParentId,
				folders
			);

			if (conflictingFolder) {
				// MERGE: Move contents from source folder to conflicting folder
				const mergeResult = calculateFolderMerge(
					oldFolder,
					conflictingFolder,
					folders,
					notes
				);

				// Apply folder updates (moved subfolders with new IDs)
				const updatedFoldersList: Folder[] = [];
				for (const [oldFolderId, update] of mergeResult.folderUpdates) {
					const folder = folders.find((f) => f.id === oldFolderId);
					if (folder) {
						updatedFoldersList.push({
							...folder,
							id: update.id || folder.id,
							parentId: update.parentId,
							updatedAt: new Date(),
						});
					}
				}

				// Apply note updates
				const updatedNotes = notes.map((note) => {
					const newFolderId = mergeResult.noteUpdates.get(note.id);
					if (newFolderId) {
						return { ...note, folder: newFolderId, updatedAt: new Date() };
					}
					return note;
				});

				// Build final folder list: remove deleted folders, remove old versions of updated folders, add updated folders
				const foldersToRemove = new Set([
					...mergeResult.foldersToDelete,
					...mergeResult.folderUpdates.keys(),
				]);

				set((state) => ({
					folders: reorderFolders([
						...state.folders.filter((f) => !foldersToRemove.has(f.id)),
						...updatedFoldersList,
					]),
					notes: updatedNotes,
				}));

				useHistoryStore.getState().pushAction({
					type: "MOVE_FOLDER",
					data: {
						before: oldFolder,
						after: conflictingFolder,
						id,
						idMapping: Object.fromEntries(mergeResult.idMapping),
					},
				});
			} else {
				// NO CONFLICT: Normal move with ID regeneration
				const { updatedFolders, idMapping } = regenerateFolderIds(
					oldFolder,
					newParentId,
					folders
				);

				// Get old folder IDs that will be replaced
				const oldFolderIds = new Set(idMapping.keys());

				// Update notes to reference new folder IDs
				const updatedNotes = updateNotesFolderReferences(notes, idMapping);

				// Calculate new order for the moved folder
				const newSiblings = folders.filter(
					(f) => f.parentId === newParentId && !oldFolderIds.has(f.id)
				);
				const maxOrder = Math.max(0, ...newSiblings.map((f) => f.order || 0));

				// Update the main moved folder's order
				const movedFolderNewId = idMapping.get(id);
				const finalUpdatedFolders = updatedFolders.map((f) =>
					f.id === movedFolderNewId ? { ...f, order: maxOrder + 1 } : f
				);

				set((state) => ({
					folders: reorderFolders([
						...state.folders.filter((f) => !oldFolderIds.has(f.id)),
						...finalUpdatedFolders,
					]),
					notes: updatedNotes,
				}));

				const newFolder = finalUpdatedFolders.find((f) => f.id === movedFolderNewId);
				useHistoryStore.getState().pushAction({
					type: "MOVE_FOLDER",
					data: {
						before: oldFolder,
						after: newFolder || { ...oldFolder, parentId: newParentId },
						id,
						idMapping: Object.fromEntries(idMapping),
					},
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		restoreFolder: (folder, withChildren = []) => {
			set((state) => ({
				folders: reorderFolders([...state.folders, folder, ...withChildren]),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Tags Actions
		addTag: (tag) => {
			set((state) => ({
				tags: {
					...state.tags,
					[tag.id]: tag,
				},
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		updateTag: (id, updates) => {
			set((state) => ({
				tags: {
					...state.tags,
					[id]: {
						...state.tags[id],
						...updates,
					},
				},
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		deleteTag: (id) => {
			set((state) => ({
				tags: Object.fromEntries(Object.entries(state.tags).filter(([key]) => key !== id)),
				notes: state.notes.map((note) => ({
					...note,
					tags: note.tags?.filter((tagId) => tagId !== id) || [],
				})),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Undo/Redo
		undo: () => {
			const action = useHistoryStore.getState().undo();
			if (!action) return;

			const { type, data }: Omit<HistoryAction, "timestamp"> = action;

			switch (type) {
				case "CREATE_NOTE":
					set((state) => ({
						notes: state.notes.filter((n) => n.id !== data.id),
					}));
					break;

				case "UPDATE_NOTE":
				case "ARCHIVE_NOTE":
				case "UNARCHIVE_NOTE":
				case "MOVE_NOTE":
					if (data.before) {
						const beforeNote = data.before as Note;
						set((state) => ({
							notes: state.notes.map((n) => (n.id === data.id ? beforeNote : n)),
						}));
					}
					break;

				case "DELETE_NOTE":
					if (data.before) {
						const beforeNote = data.before as Note;
						set((state) => ({
							notes: [...state.notes, beforeNote],
						}));
					}
					break;

				case "CREATE_FOLDER":
					set((state) => ({
						folders: state.folders.filter((f) => f.id !== data.id),
					}));
					break;

				case "UPDATE_FOLDER":
				case "ARCHIVE_FOLDER":
				case "UNARCHIVE_FOLDER":
				case "MOVE_FOLDER":
					if (data.before) {
						const beforeFolder = data.before as Folder;
						set((state) => ({
							folders: state.folders.map((f) =>
								f.id === data.id ? beforeFolder : f
							),
						}));
					}
					break;

				case "DELETE_FOLDER":
					if (data.before) {
						const beforeFolder = data.before as Folder;
						const descendants = (data.affectedSubfolders || []) as Folder[];

						set((state) => ({
							folders: reorderFolders([
								...state.folders,
								beforeFolder,
								...descendants,
							]),
							notes: state.notes.map((note) => {
								const affected = (data.affectedNotes || []) as Array<{
									id: string;
									folder: string;
								}>;
								const original = affected.find((n) => n.id === note.id);
								if (original) {
									return { ...note, folder: original.folder };
								}
								return note;
							}),
						}));
					}
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		redo: () => {
			const action = useHistoryStore.getState().redo();
			if (!action) return;

			const { type, data } = action;

			switch (type) {
				case "CREATE_NOTE":
					if (data.after) {
						const afterNote = data.after as Note;
						set((state) => ({
							notes: [...state.notes, afterNote],
						}));
					}
					break;

				case "UPDATE_NOTE":
				case "ARCHIVE_NOTE":
				case "UNARCHIVE_NOTE":
				case "MOVE_NOTE":
					if (data.after) {
						const afterNote = data.after as Note;
						set((state) => ({
							notes: state.notes.map((n) => (n.id === data.id ? afterNote : n)),
						}));
					}
					break;

				case "DELETE_NOTE":
					set((state) => ({
						notes: state.notes.filter((n) => n.id !== data.id),
					}));
					break;

				case "CREATE_FOLDER":
					if (data.after) {
						const afterFolder = data.after as Folder;
						set((state) => ({
							folders: [...state.folders, afterFolder],
						}));
					}
					break;

				case "UPDATE_FOLDER":
				case "ARCHIVE_FOLDER":
				case "UNARCHIVE_FOLDER":
				case "MOVE_FOLDER":
					if (data.after) {
						const afterFolder = data.after as Folder;
						set((state) => ({
							folders: state.folders.map((f) => (f.id === data.id ? afterFolder : f)),
						}));
					}
					break;

				case "DELETE_FOLDER":
					const affectedSubfolders = (data.affectedSubfolders || []) as Folder[];
					const affectedFolderIds = [
						data.id,
						...affectedSubfolders.map((f) => f.id),
					];

					set((state) => ({
						folders: reorderFolders(
							state.folders.filter((f) => !affectedFolderIds.includes(f.id))
						),
						notes: state.notes.map((note) => {
							if (affectedFolderIds.includes(note.folder)) {
								return { ...note, folder: "inbox" };
							}
							return note;
						}),
					}));
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},
	}))
);
