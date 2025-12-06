import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import {
	AppSettings,
	DEFAULT_SETTINGS,
	ExpenseViewType,
	WeekStartDay,
} from "@/types/settings";
import { IncomeViewType } from "@/types/income";
import { AppToSave } from "@/types";

interface SettingsStore extends AppSettings {
	// Actions
	setSettings: (settings: Partial<AppSettings>, skipSave?: boolean) => void;
	setAutoSaveEnabled: (enabled: boolean) => void;
	setNotesDefaultFolder: (folderId: string) => void;
	setExpenseDefaultView: (view: ExpenseViewType) => void;
	setExpenseCurrency: (currency: string) => void;
	setIncomeDefaultView: (view: IncomeViewType) => void;
	setIncomeWeekStartDay: (day: WeekStartDay) => void;
	setIncomeCurrency: (currency: string) => void;
	resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
	subscribeWithSelector((set) => ({
		...DEFAULT_SETTINGS,

		setSettings: (settings, skipSave = false) => {
			set(settings);

			// Sync autoSaveEnabled with app store if it's being updated
			if (settings.autoSaveEnabled !== undefined) {
				const appStore = useAppStore.getState();
				if (appStore.autoSaveEnabled !== settings.autoSaveEnabled) {
					appStore.toggleAutoSave();
				}
			}

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setAutoSaveEnabled: (enabled) => {
			set({ autoSaveEnabled: enabled });

			// Keep in sync with app store
			const appStore = useAppStore.getState();
			if (appStore.autoSaveEnabled !== enabled) {
				appStore.toggleAutoSave();
			}

			// Always save when changing autosave (so the preference persists)
			useAppStore.getState().saveToFile(AppToSave.All);
		},

		setNotesDefaultFolder: (folderId) => {
			set({ notesDefaultFolder: folderId });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setExpenseDefaultView: (view) => {
			set({ expenseDefaultView: view });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setExpenseCurrency: (currency) => {
			set({ expenseCurrency: currency });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setIncomeDefaultView: (view) => {
			set({ incomeDefaultView: view });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setIncomeWeekStartDay: (day) => {
			set({ incomeWeekStartDay: day });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setIncomeCurrency: (currency) => {
			set({ incomeCurrency: currency });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		resetToDefaults: () => {
			set(DEFAULT_SETTINGS);

			// Sync autoSaveEnabled with app store
			const appStore = useAppStore.getState();
			if (appStore.autoSaveEnabled !== DEFAULT_SETTINGS.autoSaveEnabled) {
				appStore.toggleAutoSave();
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},
	}))
);
