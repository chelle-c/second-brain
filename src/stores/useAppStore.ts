import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Note, NotesFolder, NotesFolders, Subfolder } from "../types/notes";
import { Expense, ExpensesData, RecurringExpense, Income, IncomeMonthlyData, BudgetItem } from "../types/finance";
import { MindMapNode, MindMapsData } from "../types/mindmap";
import { AppToSave } from "../types";
import { fileStorage } from "../lib/fileStorage";

interface AppStore {
	// State
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];
	expenses: Expense[];
	mindMaps: MindMapNode[];
	budgetItems: BudgetItem[];
	incomePayments: Income[];
	monthlyData: IncomeMonthlyData[];
	recurringExpenses: RecurringExpense[];
	expensesData: ExpensesData;
	mindMapsData: MindMapsData;
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
	setNotesFolders: (folders: NotesFolders) => void;

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
	saveToFile: (appToSave: AppToSave) => Promise<void>;
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
		budgetItems: [], 
		incomePayments: [], 
		monthlyData: [], 
		recurringExpenses: [], 
		expensesData: {
			expenses: [],
			version: "",
		},
		mindMapsData: {
			mindMaps: [],
			version: "",
		},
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
				get().saveToFile(AppToSave.NotesApp);
			}
		},

		updateNote: (id, updates) => {
			set((state) => ({
				notes: state.notes.map((note) =>
					note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
			}
		},

		deleteNote: (id) => {
			set((state) => ({
				notes: state.notes.filter((note) => note.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
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

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
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

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
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

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
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

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
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

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.NotesApp);
			}
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
				get().saveToFile(AppToSave.ExpensesApp);
			}
		},

		updateExpense: (id, updates) => {
			set((state) => ({
				expenses: state.expenses.map((expense) =>
					expense.id === id ? { ...expense, ...updates } : expense
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.ExpensesApp);
			}
		},

		deleteExpense: (id) => {
			set((state) => ({
				expenses: state.expenses.filter((expense) => expense.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.ExpensesApp);
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
				get().saveToFile(AppToSave.MindMapsApp);
			}
		},

		updateMindMapNode: (id, updates) => {
			set((state) => ({
				mindMaps: state.mindMaps.map((node) =>
					node.id === id ? { ...node, ...updates } : node
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.MindMapsApp);
			}
		},

		deleteMindMapNode: (id) => {
			set((state) => ({
				mindMaps: state.mindMaps.filter((node) => node.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.MindMapsApp);
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

		saveToFile: async (appToSave: AppToSave) => {
			const state = get();
			try {
				await fileStorage.saveData(
					{
						notes: state.notes,
						notesFolders: state.notesFolders,
						subfolders: state.subfolders,
						expenses: state.expenses,
						mindMaps: state.mindMaps,
						budgetItems: state.budgetItems, 
						incomePayments: state.incomePayments, 
						monthlyData: state.monthlyData, 
						recurringExpenses: state.recurringExpenses, 
						expensesData: state.expensesData,
						mindMapsData: state.mindMapsData,
						lastSaved: new Date(),
					},
					appToSave
				);
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
