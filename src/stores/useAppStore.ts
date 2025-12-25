import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
	DEFAULT_CATEGORY_COLORS,
	DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/expenseHelpers";
import { sqlStorage } from "@/lib/storage";
import type { AppToSave } from "@/types";
import type { Expense } from "@/types/expense";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { DEFAULT_THEME_SETTINGS } from "@/types/theme";
import { useExpenseStore } from "./useExpenseStore";
import { useIncomeStore } from "./useIncomeStore";
import { useNotesStore } from "./useNotesStore";
import { useSettingsStore } from "./useSettingsStore";
import { useThemeStore } from "./useThemeStore";

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
		loadFromFile: async () => {
			set({ isLoading: true });
			try {
				const data = await sqlStorage.loadData();

				// Use setters that don't trigger save for notes
				useNotesStore.getState().setNotes(data.notes || []);
				useNotesStore.getState().setNotesFolders(data.notesFolders || []);
				useNotesStore.getState().setSubfolders(data.subfolders || []);

				// Use setters that don't trigger save for income
				useIncomeStore.getState().setIncomeEntries(data.income.entries || []);
				useIncomeStore
					.getState()
					.setIncomeWeeklyTargets(data.income.weeklyTargets || []);
				useIncomeStore
					.getState()
					.setIncomeViewType(data.income.viewType || "weekly");

				// Process expenses data
				const processedExpenses = data.expenses.expenses.map((e: Expense) => ({
					...e,
					dueDate: e.dueDate ? new Date(e.dueDate) : null,
					paymentDate: e.paymentDate ? new Date(e.paymentDate) : null,
					createdAt: new Date(e.createdAt),
					updatedAt: new Date(e.updatedAt),
					isPaid: e.isPaid ?? false,
					type: e.type || "need",
					importance: e.importance || "none",
					paymentMethod: e.paymentMethod || "None",
					parentExpenseId: e.parentExpenseId,
					monthlyOverrides: e.monthlyOverrides || {},
					isModified: e.isModified || false,
					initialState: e.initialState
						? {
								amount: e.initialState.amount,
								dueDate: e.initialState.dueDate
									? new Date(e.initialState.dueDate)
									: null,
								paymentMethod: e.initialState.paymentMethod || "None",
							}
						: undefined,
				}));

				// Use bulk setter that doesn't trigger saves
				useExpenseStore.getState().setExpenseData({
					expenses: processedExpenses,
					selectedMonth: data.expenses.selectedMonth
						? new Date(data.expenses.selectedMonth)
						: new Date(),
					overviewMode: data.expenses.overviewMode || "remaining",
					categories: data.expenses.categories || DEFAULT_EXPENSE_CATEGORIES,
					categoryColors:
						data.expenses.categoryColors || DEFAULT_CATEGORY_COLORS,
					paymentMethods:
						data.expenses.paymentMethods || DEFAULT_PAYMENT_METHODS,
				});

				// Load settings (skipSave=true to avoid unnecessary save on load)
				const settings = data.settings || DEFAULT_SETTINGS;
				useSettingsStore.getState().setSettings(settings, true);

				// Load theme settings
				const themeSettings = data.theme || DEFAULT_THEME_SETTINGS;
				useThemeStore.getState().setThemeSettings(themeSettings, true);
				useThemeStore.getState().initializeTheme();

				set({
					lastSaved: data.lastSaved || null,
					autoSaveEnabled: settings.autoSaveEnabled,
				});
				set({ isLoading: false });

				console.log(
					`Loaded ${processedExpenses.length} expenses, ${
						Object.keys(data.expenses.categoryColors || {}).length
					} category colors`,
				);
			} catch (error) {
				console.error("Failed to load data:", error);
				set({ isLoading: false });
			}
		},

		saveToFile: async (appToSave: AppToSave) => {
			const state = get();
			const settingsState = useSettingsStore.getState();
			const themeState = useThemeStore.getState();
			const expenseState = useExpenseStore.getState();

			try {
				await sqlStorage.saveData(
					{
						notes: useNotesStore.getState().notes,
						notesFolders: useNotesStore.getState().notesFolders,
						subfolders: useNotesStore.getState().subfolders,
						tags: useNotesStore.getState().tags,
						expenses: {
							expenses: expenseState.expenses,
							selectedMonth: expenseState.selectedMonth || new Date(),
							overviewMode: expenseState.overviewMode,
							categories: expenseState.categories.sort(),
							categoryColors: expenseState.categoryColors,
							paymentMethods: expenseState.paymentMethods,
						},
						income: {
							entries: useIncomeStore.getState().incomeEntries,
							weeklyTargets: useIncomeStore.getState().incomeWeeklyTargets,
							viewType: useIncomeStore.getState().incomeViewType,
						},
						settings: {
							autoSaveEnabled: settingsState.autoSaveEnabled,
							notesDefaultFolder: settingsState.notesDefaultFolder,
							expenseDefaultView: settingsState.expenseDefaultView,
							expenseCurrency: settingsState.expenseCurrency,
							incomeDefaultView: settingsState.incomeDefaultView,
							incomeWeekStartDay: settingsState.incomeWeekStartDay,
							incomeCurrency: settingsState.incomeCurrency,
							incomeDefaultWeeklyTarget:
								settingsState.incomeDefaultWeeklyTarget,
						},
						theme: {
							mode: themeState.mode,
							palette: themeState.palette,
						},
						isLoading: state.isLoading,
						lastSaved: new Date(),
						autoSaveEnabled: state.autoSaveEnabled,
					},
					appToSave,
				);
				set({ lastSaved: new Date() });
			} catch (error) {
				console.error("Failed to save data:", error);
			}
		},

		toggleAutoSave: () => {
			set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled }));
		},
	})),
);

export default useAppStore;
