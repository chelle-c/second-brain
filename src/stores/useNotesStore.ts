import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import { useHistoryStore, HistoryAction } from "./useHistoryStore";
import { Note, NotesFolder, NotesFolders, Subfolder, Tag } from "@/types/notes";
import { AppToSave } from "@/types";

interface NotesStore {
	// State
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	tags: Record<string, Tag>;

	// Actions
	setNotes: (notes: Note[]) => void;
	setNotesFolders: (folders: NotesFolders) => void;
	setSubfolders: (subfolders: Subfolder[]) => void;
	setTags: (tags: Record<string, Tag>) => void;

	// Notes
	addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt" | "archived">) => string;
	updateNote: (id: string, updates: Partial<Note>, recordHistory?: boolean) => void;
	deleteNote: (id: string) => void;
	archiveNote: (id: string) => void;
	unarchiveNote: (id: string) => void;
	moveNote: (id: string, newFolder: string) => void;
	restoreNote: (note: Note) => void;

	// Folders
	addFolder: (folder: Omit<NotesFolder, "id" | "children">) => void;
	updateFolder: (id: string, updates: Partial<NotesFolder>) => void;
	deleteFolder: (id: string) => void;
	restoreFolder: (folder: NotesFolder) => void;

	// Subfolders
	addSubFolder: (subfolder: Subfolder) => void;
	updateSubFolder: (id: string, updates: Partial<Subfolder>) => void;
	removeSubfolder: (id: string) => void;
	restoreSubfolder: (subfolder: Subfolder, parentId: string) => void;

	// Tags
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
		notesFolders: {},
		subfolders: [],
		tags: {},

		// Note actions
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

			// Record history
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

		restoreNote: (note) => {
			set((state) => ({
				notes: [...state.notes, note],
			}));

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

		setNotes: (notes: Note[]) => set({ notes }),

		moveNote: (id, newFolder) => {
			const oldNote = get().notes.find((n) => n.id === id);

			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id
						? {
								...note,
								folder: newFolder,
								updatedAt: new Date(),
						  }
						: note
				),
			}));

			if (oldNote) {
				useHistoryStore.getState().pushAction({
					type: "MOVE_NOTE",
					data: { before: oldNote, after: { ...oldNote, folder: newFolder }, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Folder Actions
		setNotesFolders: (folders) => set({ notesFolders: folders }),

		addFolder: (folderData) => {
			const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const folder: NotesFolder = {
				...folderData,
				id: folderId,
				children: [],
			};

			set((state) => ({
				notesFolders: {
					...state.notesFolders,
					[folderId]: folder,
				},
			}));

			useHistoryStore.getState().pushAction({
				type: "CREATE_FOLDER",
				data: { after: folder, id: folderId },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		updateFolder: (id, updates) => {
			const oldFolder = get().notesFolders[id];

			set((state) => ({
				notesFolders: {
					...state.notesFolders,
					[id]: {
						...state.notesFolders[id],
						...updates,
					},
				},
			}));

			if (oldFolder) {
				useHistoryStore.getState().pushAction({
					type: "UPDATE_FOLDER",
					data: { before: oldFolder, after: { ...oldFolder, ...updates }, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		deleteFolder: (id) => {
			const deletedFolder = get().notesFolders[id];
			const childIds = deletedFolder?.children?.map((c) => c.id) || [];

			set((state) => {
				const updatedNotes = state.notes.map((note) =>
					note.folder === id || childIds.includes(note.folder)
						? { ...note, folder: "inbox" }
						: note
				);

				const updatedSubfolders = state.subfolders.filter(
					(sf) => sf.parent !== id && sf.id !== id
				);

				return {
					notesFolders: Object.fromEntries(
						Object.entries(state.notesFolders).filter(([key]) => key !== id)
					),
					notes: updatedNotes,
					subfolders: updatedSubfolders,
				};
			});

			if (deletedFolder) {
				useHistoryStore.getState().pushAction({
					type: "DELETE_FOLDER",
					data: { before: deletedFolder, id },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		restoreFolder: (folder) => {
			set((state) => ({
				notesFolders: {
					...state.notesFolders,
					[folder.id]: folder,
				},
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Subfolder Actions
		setSubfolders: (subfolders) => set({ subfolders }),

		addSubFolder: (subfolder) => {
			set((state) => {
				const newFolders: NotesFolders = JSON.parse(JSON.stringify(state.notesFolders));
				const parentFolder = newFolders[subfolder.parent];

				if (parentFolder) {
					const newSubfolderEntry: NotesFolder = {
						id: subfolder.id,
						name: subfolder.name,
						parent: subfolder.parent,
						children: [],
					};

					if (!parentFolder.children) {
						parentFolder.children = [];
					}
					parentFolder.children.push(newSubfolderEntry);
				}

				const newSubfolders = [...state.subfolders, subfolder];

				return {
					notesFolders: newFolders,
					subfolders: newSubfolders,
				};
			});

			useHistoryStore.getState().pushAction({
				type: "CREATE_SUBFOLDER",
				data: { after: subfolder, id: subfolder.id, parentId: subfolder.parent },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		updateSubFolder: (id, updates) => {
			const oldSubfolder = get().subfolders.find((sf) => sf.id === id);

			set((state) => {
				const newFolders: NotesFolders = JSON.parse(JSON.stringify(state.notesFolders));

				const folderEntries = Object.entries(newFolders);
				for (const [, folder] of folderEntries) {
					if (folder.children) {
						folder.children = folder.children.map((child) => {
							if (child.id === id) {
								return { ...child, ...updates };
							}
							return child;
						});
					}
				}

				const newSubfolders = state.subfolders.map((subfolder) =>
					subfolder.id === id ? { ...subfolder, ...updates } : subfolder
				);

				return {
					notesFolders: newFolders,
					subfolders: newSubfolders,
				};
			});

			if (oldSubfolder) {
				useHistoryStore.getState().pushAction({
					type: "UPDATE_SUBFOLDER",
					data: {
						before: oldSubfolder,
						after: { ...oldSubfolder, ...updates },
						id,
						parentId: oldSubfolder.parent,
					},
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		removeSubfolder: (id) => {
			const subfolder = get().subfolders.find((sf) => sf.id === id);

			set((state) => {
				const newFolders: NotesFolders = JSON.parse(JSON.stringify(state.notesFolders));

				const folderEntries = Object.entries(newFolders);
				for (const [, folder] of folderEntries) {
					if (folder.children) {
						folder.children = folder.children.filter((child) => child.id !== id);
					}
				}

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

			if (subfolder) {
				useHistoryStore.getState().pushAction({
					type: "DELETE_SUBFOLDER",
					data: { before: subfolder, id, parentId: subfolder.parent },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		restoreSubfolder: (subfolder, parentId) => {
			set((state) => {
				const newFolders: NotesFolders = JSON.parse(JSON.stringify(state.notesFolders));
				const parentFolder = newFolders[parentId];

				if (parentFolder) {
					const newSubfolderEntry: NotesFolder = {
						id: subfolder.id,
						name: subfolder.name,
						parent: parentId,
						children: [],
					};

					if (!parentFolder.children) {
						parentFolder.children = [];
					}
					parentFolder.children.push(newSubfolderEntry);
				}

				return {
					notesFolders: newFolders,
					subfolders: [...state.subfolders, subfolder],
				};
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},

		// Tag Actions
		setTags: (tags) => set({ tags }),

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
					// Undo create = delete
					set((state) => ({
						notes: state.notes.filter((n) => n.id !== data.id),
					}));
					break;

				case "UPDATE_NOTE":
					// Undo update = restore old values
					set((state) => ({
						notes: state.notes.map((n) => (n.id === data.id ? data.before : n)),
					}));
					break;

				case "DELETE_NOTE":
					// Undo delete = restore
					if (data.before) {
						set((state) => ({
							notes: [...state.notes, data.before],
						}));
					}
					break;

				case "ARCHIVE_NOTE":
				case "UNARCHIVE_NOTE":
				case "MOVE_NOTE":
					// Restore previous state
					if (data.before) {
						set((state) => ({
							notes: state.notes.map((n) => (n.id === data.id ? data.before : n)),
						}));
					}
					break;

				case "CREATE_FOLDER":
					// Undo create = delete
					set((state) => ({
						notesFolders: Object.fromEntries(
							Object.entries(state.notesFolders).filter(([key]) => key !== data.id)
						),
					}));
					break;

				case "UPDATE_FOLDER":
					// Undo update = restore old values
					if (data.before) {
						set((state) => ({
							notesFolders: {
								...state.notesFolders,
								[data.id]: data.before,
							},
						}));
					}
					break;

				case "DELETE_FOLDER":
					// Undo delete = restore
					if (data.before) {
						set((state) => ({
							notesFolders: {
								...state.notesFolders,
								[data.id]: data.before,
							},
						}));
					}
					break;

				case "CREATE_SUBFOLDER":
					// Undo create = remove from parent
					set((state) => {
						const newFolders: NotesFolders = JSON.parse(
							JSON.stringify(state.notesFolders)
						);
						if (data.parentId) {
							const parentFolder = newFolders[data.parentId];
							if (parentFolder?.children) {
								parentFolder.children = parentFolder.children.filter(
									(c) => c.id !== data.id
								);
							}
						}
						return {
							notesFolders: newFolders,
							subfolders: state.subfolders.filter((sf) => sf.id !== data.id),
						};
					});
					break;

				case "UPDATE_SUBFOLDER":
					// Undo update = restore old values
					if (data.before) {
						set((state) => {
							const newFolders: NotesFolders = JSON.parse(
								JSON.stringify(state.notesFolders)
							);
							const folderEntries = Object.entries(newFolders);
							for (const [, folder] of folderEntries) {
								if (folder.children) {
									folder.children = folder.children.map((c) =>
										c.id === data.id ? { ...c, name: data.before.name } : c
									);
								}
							}
							return {
								notesFolders: newFolders,
								subfolders: state.subfolders.map((sf) =>
									sf.id === data.id ? data.before : sf
								),
							};
						});
					}
					break;

				case "DELETE_SUBFOLDER":
					// Undo delete = restore to parent
					if (data.before && data.parentId) {
						set((state) => {
							const newFolders: NotesFolders = JSON.parse(
								JSON.stringify(state.notesFolders)
							);
							if (data.parentId) {
								const parentFolder = newFolders[data.parentId];
								if (!parentFolder.children) {
									parentFolder.children = [];
								}
								parentFolder.children.push({
									id: data.before.id,
									name: data.before.name,
									parent: data.parentId,
									children: [],
								});
							}
							return {
								notesFolders: newFolders,
								subfolders: [...state.subfolders, data.before],
							};
						});
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
					// Redo create = add
					if (data.after) {
						set((state) => ({
							notes: [...state.notes, data.after],
						}));
					}
					break;

				case "UPDATE_NOTE":
					// Redo update = apply new values
					if (data.after) {
						set((state) => ({
							notes: state.notes.map((n) => (n.id === data.id ? data.after : n)),
						}));
					}
					break;

				case "DELETE_NOTE":
					// Redo delete = remove
					set((state) => ({
						notes: state.notes.filter((n) => n.id !== data.id),
					}));
					break;

				case "ARCHIVE_NOTE":
					// Redo archive
					set((state) => ({
						notes: state.notes.map((n) =>
							n.id === data.id ? { ...n, archived: true } : n
						),
					}));
					break;

				case "UNARCHIVE_NOTE":
					// Redo unarchive
					set((state) => ({
						notes: state.notes.map((n) =>
							n.id === data.id ? { ...n, archived: false } : n
						),
					}));
					break;

				case "MOVE_NOTE":
					// Redo move
					if (data.after) {
						set((state) => ({
							notes: state.notes.map((n) => (n.id === data.id ? data.after : n)),
						}));
					}
					break;

				case "CREATE_FOLDER":
					// Redo create
					if (data.after) {
						set((state) => ({
							notesFolders: {
								...state.notesFolders,
								[data.id]: data.after,
							},
						}));
					}
					break;

				case "UPDATE_FOLDER":
					// Redo update
					if (data.after) {
						set((state) => ({
							notesFolders: {
								...state.notesFolders,
								[data.id]: data.after,
							},
						}));
					}
					break;

				case "DELETE_FOLDER":
					// Redo delete
					set((state) => ({
						notesFolders: Object.fromEntries(
							Object.entries(state.notesFolders).filter(([key]) => key !== data.id)
						),
					}));
					break;

				case "CREATE_SUBFOLDER":
					// Redo create
					if (data.after && data.parentId) {
						set((state) => {
							const newFolders: NotesFolders = JSON.parse(
								JSON.stringify(state.notesFolders)
							);
							if (data.parentId) {
								const parentFolder = newFolders[data.parentId];
								if (!parentFolder.children) {
									parentFolder.children = [];
								}
								parentFolder.children.push({
									id: data.after.id,
									name: data.after.name,
									parent: data.parentId,
									children: [],
								});
							}
							return {
								notesFolders: newFolders,
								subfolders: [...state.subfolders, data.after],
							};
						});
					}
					break;

				case "UPDATE_SUBFOLDER":
					// Redo update
					if (data.after) {
						set((state) => {
							const newFolders: NotesFolders = JSON.parse(
								JSON.stringify(state.notesFolders)
							);
							const folderEntries = Object.entries(newFolders);
							for (const [, folder] of folderEntries) {
								if (folder.children) {
									folder.children = folder.children.map((c) =>
										c.id === data.id ? { ...c, name: data.after.name } : c
									);
								}
							}
							return {
								notesFolders: newFolders,
								subfolders: state.subfolders.map((sf) =>
									sf.id === data.id ? data.after : sf
								),
							};
						});
					}
					break;

				case "DELETE_SUBFOLDER":
					// Redo delete
					set((state) => {
						const newFolders: NotesFolders = JSON.parse(
							JSON.stringify(state.notesFolders)
						);
						const folderEntries = Object.entries(newFolders);
						for (const [, folder] of folderEntries) {
							if (folder.children) {
								folder.children = folder.children.filter((c) => c.id !== data.id);
							}
						}
						return {
							notesFolders: newFolders,
							subfolders: state.subfolders.filter((sf) => sf.id !== data.id),
						};
					});
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.NotesApp);
			}
		},
	}))
);
