import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useNotesStore } from "./useNotesStore";
import { useIncomeStore } from "./useIncomeStore";
import { useExpenseStore } from "./useExpenseStore";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { AppToSave } from "@/types";
import { fileStorage } from "@/lib/fileStorage";

interface AppStore {

	// -- Metadata
	isLoading: boolean;
	lastSaved: Date | null;
	autoSaveEnabled: boolean;

	// Getters
	getIsLoading: () => boolean;

	// Actions - Storage
	loadFromFile: () => Promise<void>;
	saveToFile: (appToSave: AppToSave) => Promise<void>;
	toggleAutoSave: () => void;
}

const useAppStore = create<AppStore>()(
	subscribeWithSelector((set, get) => ({
		// Initial state
		isLoading: true,
		lastSaved: null,
		autoSaveEnabled: true,

		// Getters
		getIsLoading: () => get().isLoading,

		// Setters

		// Storage actions
		loadFromFile: async () => {
			set({ isLoading: true });
			try {
				const data = await fileStorage.loadData();

				useNotesStore.getState().setNotes(data.notes || []);
				useNotesStore.getState().setNotesFolders(data.notesFolders || []);
				useNotesStore.getState().setSubfolders(data.subfolders || []);

				useIncomeStore.getState().setIncomeEntries(data.income.entries || []);
				useIncomeStore.getState().setIncomeWeeklyTargets(data.income.weeklyTargets || []);
				useIncomeStore.getState().setIncomeViewType(data.income.viewType || "weekly");

				useExpenseStore.getState().setExpenses(
					data.expenses.expenses.map((e: any) => ({
						...e,
						dueDate: e.dueDate ? new Date(e.dueDate) : null,
						paymentDate: e.paymentDate ? new Date(e.paymentDate) : null,
						createdAt: new Date(e.createdAt),
						updatedAt: new Date(e.updatedAt),
						isPaid: e.isPaid ?? false,
						type: e.type || "need",
						importance: e.importance || "none",
						parentExpenseId: e.parentExpenseId,
						monthlyOverrides: e.monthlyOverrides || {},
						isModified: e.isModified || false,
						initialState: e.initialState
							? {
									amount: e.initialState.amount,
									dueDate: e.initialState.dueDate
										? new Date(e.initialState.dueDate)
										: null,
							  }
							: undefined,
					}))
				);

				useExpenseStore
					.getState()
					.setSelectedMonth(
						data.expenses.selectedMonth
							? new Date(data.expenses.selectedMonth)
							: new Date()
					);
				useExpenseStore
					.getState()
					.setOverviewMode(data.expenses.overviewMode || "remaining");
				useExpenseStore
					.getState()
					.setCategories(data.expenses.categories || DEFAULT_EXPENSE_CATEGORIES);
				useExpenseStore
					.getState()
					.setCategoryColors(data.expenses.categoryColors || DEFAULT_CATEGORY_COLORS);

				set({
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
						notes: useNotesStore.getState().notes,
						notesFolders: useNotesStore.getState().notesFolders,
						subfolders: useNotesStore.getState().subfolders,
						expenses: {
							expenses: useExpenseStore.getState().expenses,
							selectedMonth: useExpenseStore.getState().selectedMonth || new Date(),
							overviewMode: useExpenseStore.getState().overviewMode,
							categories: useExpenseStore.getState().categories.sort(),
							categoryColors: useExpenseStore.getState().categoryColors,
						},
						income: {
							entries: useIncomeStore.getState().incomeEntries,
							weeklyTargets: useIncomeStore.getState().incomeWeeklyTargets,
							viewType: useIncomeStore.getState().incomeViewType,
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
	}))
);

export default useAppStore;
