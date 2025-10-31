import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Note, NotesFolder, NotesFolders, Subfolder } from "../types/notes";
import {
	Expense,
	ExpensesData,
	RecurringExpense,
	ExpenseMonthlyData,
	BudgetItem,
	IncomeEntry,
	IncomeWeeklyTargets,
	IncomeDayData,
	IncomeParsedEntry,
	IncomeWeekSelection,
	IncomeWeekInfo,
	IncomeMonthlyData,
	IncomeYearlyData,
	IncomeViewType,
} from "../types/finance";
import { MindMapNode, MindMapsData } from "../types/mindmap";
import { AppToSave } from "../types";
import { fileStorage } from "../lib/fileStorage";

interface AppStore {
	// State

	// -- Notes
	notes: Note[];
	notesFolders: NotesFolders;
	subfolders: Subfolder[];

	// -- Finance
	// -- Finance/Expenses
	expenses: Expense[];
	budgetItems: BudgetItem[];
	expenseMonthlyData: ExpenseMonthlyData[];
	recurringExpenses: RecurringExpense[];
	expensesData: ExpensesData;

	// -- Finance/Income
	incomeEntries: IncomeEntry[];
	incomeWeeklyTargets: IncomeWeeklyTargets[];
	incomeDayData: IncomeDayData[];
	incomeParsedEntries: IncomeParsedEntry[];
	incomeWeekSelection: IncomeWeekSelection;
	incomeWeekInfo: IncomeWeekInfo[];
	incomeMonthlyData: IncomeMonthlyData[];
	incomeYearlyData: IncomeYearlyData[];
	incomeViewType: IncomeViewType;

	// -- Mind map
	mindMaps: MindMapNode[];
	mindMapsData: MindMapsData;

	// -- Metadata
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

	// Actions - Income
	addIncomeEntry: (entry: IncomeEntry) => void;
	updateIncomeEntry: (updates: IncomeEntry) => void;
	deleteIncomeEntry: (id: string) => void;

	addIncomeWeeklyTarget: (id: string, amount: number) => void;
	updateIncomeWeeklyTarget: (updates: IncomeWeeklyTargets) => void;
	deleteIncomeWeeklyTarget: (id: string) => void;

	updateIncomeViewType: (viewType: IncomeViewType) => void;

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
		budgetItems: [],
		expenseMonthlyData: [],
		recurringExpenses: [],
		expensesData: {
			expenses: [],
			version: "",
		},

		incomeEntries: [],
		incomeWeeklyTargets: [],
		incomeDayData: [],
		incomeParsedEntries: [],
		incomeWeekSelection: {
			year: 0,
			week: 0,
			startDate: new Date(),
			endDate: new Date(),
		},
		incomeWeekInfo: [],
		incomeMonthlyData: [],
		incomeYearlyData: [],
		incomeViewType: "monthly",

		mindMaps: [],
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
				id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		updateExpense: (id, updates) => {
			set((state) => ({
				expenses: state.expenses.map((expense) =>
					expense.id === id ? { ...expense, ...updates } : expense
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		deleteExpense: (id) => {
			set((state) => ({
				expenses: state.expenses.filter((expense) => expense.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
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

		// Income actions
		addIncomeEntry: (paymentData) => {
			const entry: IncomeEntry = {
				...paymentData,
			};

			const existingEntry = get().incomeEntries.find((p) => p.date === entry.date);
			console.log("Existing entry:", existingEntry);
			if (existingEntry) {
				set((state) => ({
					...state,
					incomeEntries: state.incomeEntries.map((payment) =>
						payment.date === entry.date ? { ...payment, ...entry } : payment
					),
				}));
			} else {
				set((state) => ({
					...state,
					incomeEntries: [...state.incomeEntries, entry],
				}));
			}

			console.log("Income entries:", get().incomeEntries);

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		updateIncomeEntry: (updates) => {
			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.map((payment) =>
					payment.date === updates.date ? { ...payment, ...updates } : payment
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		deleteIncomeEntry: (id) => {
			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.filter((payment) => payment.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		addIncomeWeeklyTarget: (id: string, amount: number) => {
			const target: IncomeWeeklyTargets = {
				id: id,
				amount: amount,
			};

			set((state) => {
				const incomeWeeklyTargets = Array.isArray(state.incomeWeeklyTargets)
					? state.incomeWeeklyTargets
					: [];

				incomeWeeklyTargets.push(target);

				return {
					incomeWeeklyTargets: incomeWeeklyTargets
				};
			});

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		updateIncomeWeeklyTarget: (updates) => {
			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.map((target) =>
					target.id === updates.id ? { ...target, ...updates } : target
				),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		deleteIncomeWeeklyTarget: (id) => {
			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.filter((target) => target.id !== id),
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
		},

		updateIncomeViewType: (viewType) => {
			set((_) => ({
				incomeViewType: viewType,
			}));

			if (get().autoSaveEnabled) {
				get().saveToFile(AppToSave.FinanceApp);
			}
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
					notes: data.notes || [],
					notesFolders: data.notesFolders || [],
					subfolders: data.subfolders || [],
					expenses: data.expenses || [],
					incomeEntries: data.income.entries || [],
					incomeWeeklyTargets: data.income.weeklyTargets || [],
					incomeViewType: data.income.viewType || "weekly",
					lastSaved: data.lastSaved || null,
					autoSaveEnabled: data.autoSaveEnabled,
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
						income: {
							entries: state.incomeEntries,
							weeklyTargets: state.incomeWeeklyTargets,
							viewType: state.incomeViewType,
						},
						isLoading: state.isLoading,
						lastSaved: new Date(),
						autoSaveEnabled: state.autoSaveEnabled,
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
