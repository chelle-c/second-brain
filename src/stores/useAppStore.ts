import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Note, NotesFolder, NotesFolders, Subfolder, Expense, MindMapNode } from "../types";
import { fileStorage } from "../lib/fileStorage";

interface AppStore {
	// State
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	expenses: Expense[];
	mindMaps: MindMapNode[];
	isLoading: boolean;
	lastSaved: Date | null;
	autoSaveEnabled: boolean;

	// Getters
	getIsLoading: () => boolean;

	// Actions - Notes
	addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
	updateNote: (id: string, updates: Partial<Note>) => void;
	deleteNote: (id: string) => void;
	setNotes: (notes: Note[]) => void;
	categorizeNote: (id: string, newCategory: string) => void;
	moveNote: (id: string, newFolder: string, newCategory?: string) => void;

	// Actions - Notes Folders
	setSubfolders: (subfolders: Subfolder[]) => void;
	addSubFolder: (subfolder: Subfolder) => void;
	updateSubFolder: (id: string, updates: Partial<NotesFolder>) => void;
	removeSubfolder: (id: string) => void;

	// Actions - Expenses
	addExpense: (expense: Omit<Expense, "id">) => void;
	updateExpense: (id: string, updates: Partial<Expense>) => void;
	deleteExpense: (id: string) => void;
	checkDueExpenses: () => void;

	// Actions - Mind Maps
	addMindMapNode: (node: Omit<MindMapNode, "id">) => void;
	updateMindMapNode: (id: string, updates: Partial<MindMapNode>) => void;
	deleteMindMapNode: (id: string) => void;

	// Actions - Storage
	loadFromFile: () => Promise<void>;
	saveToFile: () => Promise<void>;
	toggleAutoSave: () => void;

	// Inter-app communication
	createNoteFromExpense: (expense: Expense) => void;
}

const useAppStore = create<AppStore>()(
	subscribeWithSelector((set, get) => ({
		// Initial state
		notes: [],
		notesFolders: {},
		subfolders: [],
		expenses: [],
		mindMaps: [],
		isLoading: true,
		lastSaved: null,
		autoSaveEnabled: true,

		// Getters
		getIsLoading: () => get().isLoading,

		// Note actions
		addNote: (noteData) => {
			const note: Note = {
				...noteData,
				id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			set((state) => ({
				notes: [...state.notes, note],
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		updateNote: (id, updates) => {
			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		deleteNote: (id) => {
			set((state) => ({
				notes: state.notes.filter((note) => note.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
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
		},

		// Notes Folder Actions
		setSubfolders: (subfolders) => set({ subfolders: subfolders }),

		addSubFolder: (subfolder) => set((state) => {
			return {
				subfolders: [...state.subfolders, subfolder],
			};
		}),

		updateSubFolder: (id, updates) => {
			set((state) => ({
				subfolders: state.subfolders.map((subfolder) =>
					subfolder.id === id ? { ...subfolder, ...updates } : subfolder
				),
			}));
		},

		removeSubfolder: (id) => {
			const subfolder = get().subfolders.find((subfolder) => subfolder.id === id);
			set((state) => ({
				// Move note to subbfolder's parent folder
				notes: state.notes.map((note) =>
					subfolder && note.folder === subfolder.name
						? { ...note, folder: subfolder?.parent || "Inbox" }
						: { ...note, folder: "Inbox" }
				),
				// Remove subfolder
				subfolders: state.subfolders.filter((subfolder) => subfolder.id !== id),
			}));
		},

		// Expense actions
		addExpense: (expenseData) => {
			const expense: Expense = {
				...expenseData,
				id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			};

			set((state) => ({
				expenses: [...state.expenses, expense],
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		updateExpense: (id, updates) => {
			set((state) => ({
				expenses: state.expenses.map((expense) =>
					expense.id === id ? { ...expense, ...updates } : expense
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		deleteExpense: (id) => {
			set((state) => ({
				expenses: state.expenses.filter((expense) => expense.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		checkDueExpenses: () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const dueExpenses = get().expenses.filter((expense) => {
				const dueDate = new Date(expense.dueDate);
				dueDate.setHours(0, 0, 0, 0);
				return dueDate.getTime() === today.getTime() && !expense.isPaid;
			});

			// Create notes for due expenses
			dueExpenses.forEach((expense) => {
				get().createNoteFromExpense(expense);
			});
		},

		// Mind map actions
		addMindMapNode: (nodeData) => {
			const node: MindMapNode = {
				...nodeData,
				id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			};

			set((state) => ({
				mindMaps: [...state.mindMaps, node],
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		updateMindMapNode: (id, updates) => {
			set((state) => ({
				mindMaps: state.mindMaps.map((node) =>
					node.id === id ? { ...node, ...updates } : node
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		deleteMindMapNode: (id) => {
			set((state) => ({
				mindMaps: state.mindMaps.filter((node) => node.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile();
			}
		},

		// Storage actions
		loadFromFile: async () => {
			set({ isLoading: true });
			try {
				const data = await fileStorage.loadData();
				set({
					notes: data.notes,
					notesFolders: data.notesFolders,
					subfolders: data.subfolders,
					expenses: data.expenses,
					mindMaps: data.mindMaps,
					lastSaved: data.lastSaved,
				});
				set({ isLoading: false });
			} catch (error) {
				console.error("Failed to load data:", error);
				set({ isLoading: false });
			}
		},

		saveToFile: async () => {
			const state = get();
			try {
				await fileStorage.saveData({
					notes: state.notes,
					notesFolders: state.notesFolders,
					subfolders: state.subfolders,
					expenses: state.expenses,
					mindMaps: state.mindMaps,
					lastSaved: new Date(),
				});
				set({ lastSaved: new Date() });
			} catch (error) {
				console.error("Failed to save data:", error);
			}
		},

		toggleAutoSave: () => {
			set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled }));
		},

		// Inter-app communication
		createNoteFromExpense: (expense) => {
			const note = {
				title: `Payment Due: ${expense.name}`,
				content: `Amount: $${expense.amount}\nCategory: ${
					expense.category
				}\nDue: ${new Date(expense.dueDate).toLocaleDateString()}`,
				category: "Finance",
				folder: "Inbox",
			};
			get().addNote(note);
		},
	}))
);

export default useAppStore;
