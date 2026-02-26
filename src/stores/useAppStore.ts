import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
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
	isLoading: boolean;
	lastSaved: Date | null;
	autoSaveEnabled: boolean;
	getIsLoading: () => boolean;
	loadFromFile: () => Promise<void>;
	saveToFile: (appToSave: AppToSave) => Promise<void>;
	toggleAutoSave: () => void;
}

const useAppStore = create<AppStore>()(
	subscribeWithSelector((set, get) => ({
		isLoading: true,
		lastSaved: null,
		autoSaveEnabled: true,

		getIsLoading: () => get().isLoading,

		loadFromFile: async () => {
			set({ isLoading: true });
			try {
				if (!sqlStorage.isInitialized()) {
					await sqlStorage.initialize();
				}

				const data = await sqlStorage.loadData();

				useNotesStore.getState().setNotes(data.notes || [], true);
				useNotesStore.getState().setFolders(data.folders || [], true);
				useNotesStore.getState().setTags(data.tags || {});

				useIncomeStore.getState().setIncomeEntries(data.income.entries || []);
				useIncomeStore.getState().setIncomeWeeklyTargets(data.income.weeklyTargets || []);
				useIncomeStore.getState().setIncomeViewType(data.income.viewType || "weekly");

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
					// Preserve amountData if it exists, otherwise leave undefined
					// so the table falls back to displaying the numeric `amount`
					amountData: e.amountData ?? undefined,
					initialState:
						e.initialState ?
							{
								amount: e.initialState.amount,
								dueDate:
									e.initialState.dueDate ?
										new Date(e.initialState.dueDate)
									:	null,
								paymentMethod: e.initialState.paymentMethod || "None",
							}
						:	undefined,
				}));

				useExpenseStore.getState().setExpenseData({
					expenses: processedExpenses,
					selectedMonth:
						data.expenses.selectedMonth ?
							new Date(data.expenses.selectedMonth)
						:	new Date(),
					overviewMode: data.expenses.overviewMode || "remaining",
					categories: data.expenses.categories || DEFAULT_EXPENSE_CATEGORIES,
					categoryColors: data.expenses.categoryColors || DEFAULT_CATEGORY_COLORS,
					paymentMethods: data.expenses.paymentMethods || DEFAULT_PAYMENT_METHODS,
				});

				const settings = data.settings || DEFAULT_SETTINGS;
				useSettingsStore.getState().setSettings(settings, true);

				const themeSettings = data.theme || DEFAULT_THEME_SETTINGS;
				useThemeStore.getState().setThemeSettings(themeSettings, true);
				useThemeStore.getState().initializeTheme();

				set({
					lastSaved: data.lastSaved || null,
					autoSaveEnabled: settings.autoSaveEnabled,
				});
				set({ isLoading: false });

				console.log(`Loaded ${data.notes.length} notes and ${data.folders.length} folders`);
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
			const notesState = useNotesStore.getState();

			try {
				if (!sqlStorage.isInitialized()) {
					await sqlStorage.initialize();
				}

				await sqlStorage.saveData(
					{
						notes: notesState.notes,
						folders: notesState.folders,
						tags: notesState.tags,
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
							launchAtLogin: settingsState.launchAtLogin,
							minimizeToTray: settingsState.minimizeToTray,
							notificationsEnabled: settingsState.notificationsEnabled,
							notesDefaultFolder: settingsState.notesDefaultFolder,
							expenseDefaultView: settingsState.expenseDefaultView,
							expenseCurrency: settingsState.expenseCurrency,
							expenseNotificationLeadDays: settingsState.expenseNotificationLeadDays,
							incomeDefaultView: settingsState.incomeDefaultView,
							incomeWeekStartDay: settingsState.incomeWeekStartDay,
							incomeCurrency: settingsState.incomeCurrency,
							incomeDefaultWeeklyTarget: settingsState.incomeDefaultWeeklyTarget,
							calendarDayStartHour: settingsState.calendarDayStartHour,
							calendarDefaultView: settingsState.calendarDefaultView,
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
