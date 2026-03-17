import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { backupService, sqlStorage } from "@/lib/storage";
import { AppToSave } from "@/types";
import type { Expense, OverviewMode } from "@/types/expense";
import {
	type BackupInfo,
	type BackupResult,
	type BackupSettings,
	type DatabaseEnvironment,
	DEFAULT_BACKUP_SETTINGS,
	type ImportResult,
	type RestoreResult,
	type SerializedExpense,
} from "@/types/backup";
import useAppStore from "./useAppStore";
import { useExpenseStore } from "./useExpenseStore";
import { useIncomeStore } from "./useIncomeStore";
import { useNotesStore } from "./useNotesStore";

export type RestoreMode = "replace" | "merge";

const deserializeExpenses = (serialized: SerializedExpense[]): Expense[] =>
	serialized.map((e) => ({
		...e,
		dueDate: e.dueDate ? new Date(e.dueDate) : null,
		paymentDate: e.paymentDate ? new Date(e.paymentDate) : null,
		createdAt: new Date(e.createdAt),
		updatedAt: new Date(e.updatedAt),
		initialState:
			e.initialState ?
				{
					amount: e.initialState.amount,
					dueDate: e.initialState.dueDate ? new Date(e.initialState.dueDate) : null,
					paymentMethod: e.initialState.paymentMethod,
				}
			:	undefined,
	}));

interface BackupStore {
	settings: BackupSettings;
	backups: BackupInfo[];
	isLoading: boolean;
	lastBackupResult: BackupResult | null;
	lastRestoreResult: RestoreResult | null;
	lastImportResult: ImportResult | null;

	selectedForDeletion: Set<string>;

	initialize: () => Promise<void>;
	loadBackups: () => Promise<void>;
	createBackup: (description?: string) => Promise<BackupResult>;
	deleteBackup: (filename: string) => Promise<boolean>;

	deleteSelectedBackups: () => Promise<void>;
	toggleSelectForDeletion: (filename: string) => void;
	selectAllForDeletion: () => void;
	selectByEnvironment: (environment: DatabaseEnvironment) => void;
	selectPreRestoreBackups: () => void;
	clearSelection: () => void;

	restoreFromBackup: (
		filename: string,
		options?: {
			targetEnvironment?: DatabaseEnvironment;
			skipPreRestoreBackup?: boolean;
			mode?: RestoreMode;
		},
	) => Promise<RestoreResult>;

	exportExpensesToFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
	importExpensesFromFile: (filePath: string, mode: "replace" | "merge") => Promise<ImportResult>;
	getExpenseExportPath: (backupFilename: string) => Promise<string | null>;

	canRestoreToEnvironment: (
		backup: BackupInfo,
		targetEnvironment: DatabaseEnvironment,
	) => { allowed: boolean; reason?: string };

	setAutoBackupEnabled: (enabled: boolean) => Promise<void>;
	setAutoBackupInterval: (hours: number) => Promise<void>;
	setMaxAutoBackups: (count: number) => Promise<void>;
	setCustomBackupPath: (path: string | null) => Promise<boolean>;

	switchEnvironment: (environment: DatabaseEnvironment) => Promise<void>;
	getCurrentEnvironment: () => DatabaseEnvironment;

	openBackupFolder: () => Promise<void>;
	getDefaultDocumentsPath: () => Promise<string>;
	clearResults: () => void;

	// Data clearing
	clearDatabase: () => Promise<void>;
	clearLocalStorage: () => void;
}

export const useBackupStore = create<BackupStore>()(
	subscribeWithSelector((set, get) => ({
		settings: DEFAULT_BACKUP_SETTINGS,
		backups: [],
		isLoading: false,
		lastBackupResult: null,
		lastRestoreResult: null,
		lastImportResult: null,
		selectedForDeletion: new Set<string>(),

		initialize: async () => {
			set({ isLoading: true });
			try {
				await backupService.initialize();
				const settings = backupService.getSettings();
				const backups = await backupService.listBackups();
				set({ settings, backups, isLoading: false });
			} catch (error) {
				console.error("Failed to initialize backup service:", error);
				set({ isLoading: false });
			}
		},

		loadBackups: async () => {
			try {
				const backups = await backupService.listBackups();
				set({ backups });
			} catch (error) {
				console.error("Failed to load backups:", error);
			}
		},

		createBackup: async (description?: string) => {
			set({ isLoading: true });
			try {
				const result = await backupService.createBackup(description);
				set({ lastBackupResult: result, isLoading: false });
				if (result.success) await get().loadBackups();
				return result;
			} catch (error) {
				const result: BackupResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastBackupResult: result, isLoading: false });
				return result;
			}
		},

		deleteBackup: async (filename: string) => {
			try {
				const success = await backupService.deleteBackup(filename);
				if (success) {
					await get().loadBackups();
					const sel = new Set(get().selectedForDeletion);
					sel.delete(filename);
					set({ selectedForDeletion: sel });
				}
				return success;
			} catch (error) {
				console.error("Failed to delete backup:", error);
				return false;
			}
		},

		deleteSelectedBackups: async () => {
			const { selectedForDeletion } = get();
			if (selectedForDeletion.size === 0) return;

			set({ isLoading: true });
			try {
				for (const filename of selectedForDeletion) {
					await backupService.deleteBackup(filename);
				}
				set({ selectedForDeletion: new Set() });
				await get().loadBackups();
			} finally {
				set({ isLoading: false });
			}
		},

		toggleSelectForDeletion: (filename: string) => {
			const sel = new Set(get().selectedForDeletion);
			if (sel.has(filename)) {
				sel.delete(filename);
			} else {
				sel.add(filename);
			}
			set({ selectedForDeletion: sel });
		},

		selectAllForDeletion: () => {
			const sel = new Set(get().backups.map((b) => b.filename));
			set({ selectedForDeletion: sel });
		},

		selectByEnvironment: (environment: DatabaseEnvironment) => {
			const sel = new Set(
				get()
					.backups.filter((b) => b.metadata.environment === environment)
					.map((b) => b.filename),
			);
			set({ selectedForDeletion: sel });
		},

		selectPreRestoreBackups: () => {
			const sel = new Set(
				get()
					.backups.filter((b) => b.metadata.description?.startsWith("Pre-restore"))
					.map((b) => b.filename),
			);
			set({ selectedForDeletion: sel });
		},

		clearSelection: () => {
			set({ selectedForDeletion: new Set() });
		},

		canRestoreToEnvironment: (backup, targetEnvironment) =>
			backupService.validateRestoreEnvironment(
				backup.metadata.environment,
				targetEnvironment,
			),

		restoreFromBackup: async (filename, options = {}) => {
			const { targetEnvironment, skipPreRestoreBackup = false, mode = "replace" } = options;

			set({ isLoading: true });
			const currentEnvironment = get().settings.databaseEnvironment;

			try {
				const actualTarget = targetEnvironment ?? currentEnvironment;
				const backup = get().backups.find((b) => b.filename === filename);

				if (backup) {
					const validation = backupService.validateRestoreEnvironment(
						backup.metadata.environment,
						actualTarget,
					);
					if (!validation.allowed) {
						const result: RestoreResult = {
							success: false,
							error: validation.reason,
						};
						set({ lastRestoreResult: result, isLoading: false });
						return result;
					}
				}

				if (mode === "replace") {
					// Close the existing connection
					await sqlStorage.close();

					// Clear localStorage cache so backup data takes priority
					sqlStorage.clearLocalStorageCache();

					// Full replace: restore backup to database file
					const result = await backupService.restoreFromBackup(filename, {
						targetEnvironment: actualTarget,
						skipPreRestoreBackup,
					});

					if (result.success) {
						await sqlStorage.initialize(actualTarget);
						await useAppStore.getState().loadFromFile();
						await get().loadBackups();
					} else {
						console.error("Restore failed:", result.error);
						try {
							await sqlStorage.initialize(currentEnvironment);
							await useAppStore.getState().loadFromFile();
						} catch (reinitError) {
							console.error("Failed to recover after failed restore:", reinitError);
						}
					}

					set({ lastRestoreResult: result, isLoading: false });
					return result;
				} else {
					// Merge mode: read backup data directly without replacing database

					// Create pre-restore backup if requested
					if (!skipPreRestoreBackup) {
						await backupService.createBackup("Pre-restore");
					}

					// Read data directly from the backup file
					const backupReadResult = await backupService.readBackupData(filename);

					if (!backupReadResult.success || !backupReadResult.data) {
						const result: RestoreResult = {
							success: false,
							error: backupReadResult.error || "Failed to read backup data",
						};
						set({ lastRestoreResult: result, isLoading: false });
						return result;
					}

					const backupData = backupReadResult.data;

					// Get current data from stores
					const currentNotes = useNotesStore.getState().notes;
					const currentFolders = useNotesStore.getState().folders;
					const currentTags = useNotesStore.getState().tags;
					const currentExpenses = useExpenseStore.getState().expenses;
					const currentIncomeEntries = useIncomeStore.getState().incomeEntries;
					const currentWeeklyTargets = useIncomeStore.getState().incomeWeeklyTargets;

					// Merge notes
					const mergedNotes = [...currentNotes];
					const existingNoteIds = new Set(currentNotes.map((n) => n.id));
					let addedNotes = 0;
					for (const note of backupData.notes) {
						if (!existingNoteIds.has(note.id)) {
							mergedNotes.push(note);
							addedNotes++;
						}
					}

					// Merge folders
					const mergedFolders = [...currentFolders];
					const existingFolderIds = new Set(currentFolders.map((f) => f.id));
					let addedFolders = 0;
					for (const folder of backupData.folders) {
						if (!existingFolderIds.has(folder.id)) {
							mergedFolders.push(folder);
							addedFolders++;
						}
					}

					// Merge tags
					const mergedTags = { ...currentTags };
					let addedTags = 0;
					for (const [id, tag] of Object.entries(backupData.tags)) {
						if (!mergedTags[id]) {
							mergedTags[id] = tag;
							addedTags++;
						}
					}

					// Merge expenses
					const mergedExpenses = [...currentExpenses];
					const existingExpenseIds = new Set(currentExpenses.map((e) => e.id));
					let addedExpenses = 0;
					for (const expense of backupData.expenses.expenses) {
						if (!existingExpenseIds.has(expense.id)) {
							mergedExpenses.push(expense);
							addedExpenses++;
						}
					}

					// Merge income entries
					const mergedIncomeEntries = [...currentIncomeEntries];
					const existingIncomeIds = new Set(currentIncomeEntries.map((e) => e.id));
					let addedIncomeEntries = 0;
					for (const entry of backupData.income.entries) {
						if (!existingIncomeIds.has(entry.id)) {
							mergedIncomeEntries.push(entry);
							addedIncomeEntries++;
						}
					}

					// Merge weekly targets
					const mergedWeeklyTargets = [...currentWeeklyTargets];
					const existingTargetIds = new Set(currentWeeklyTargets.map((t) => t.id));
					for (const target of backupData.income.weeklyTargets) {
						if (!existingTargetIds.has(target.id)) {
							mergedWeeklyTargets.push(target);
						}
					}

					// Merge categories and payment methods
					const expenseStore = useExpenseStore.getState();
					const mergedCategories = Array.from(
						new Set([...expenseStore.categories, ...backupData.expenses.categories]),
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

					const mergedCategoryColors = {
						...backupData.expenses.categoryColors,
						...expenseStore.categoryColors,
					};

					const mergedPaymentMethods = Array.from(
						new Set([
							...expenseStore.paymentMethods,
							...backupData.expenses.paymentMethods,
						]),
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

					// Update stores with merged data
					useNotesStore.getState().setNotes(mergedNotes, true);
					useNotesStore.getState().setFolders(mergedFolders, true);
					useNotesStore.getState().setTags(mergedTags);

					useExpenseStore.getState().setExpenseData({
						expenses: mergedExpenses,
						selectedMonth: expenseStore.selectedMonth ?? new Date(),
						overviewMode: expenseStore.overviewMode,
						categories: mergedCategories,
						categoryColors: mergedCategoryColors,
						paymentMethods: mergedPaymentMethods,
					});

					useIncomeStore.getState().setIncomeEntries(mergedIncomeEntries);
					useIncomeStore.getState().setIncomeWeeklyTargets(mergedWeeklyTargets);

					// Save merged data to database and localStorage
					await useAppStore.getState().saveToFile(AppToSave.All);
					await get().loadBackups();

					const totalAdded =
						addedNotes + addedFolders + addedTags + addedExpenses + addedIncomeEntries;

					const result: RestoreResult = {
						success: true,
						mergedCount: totalAdded,
					};
					set({ lastRestoreResult: result, isLoading: false });
					return result;
				}
			} catch (error) {
				const result: RestoreResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastRestoreResult: result, isLoading: false });

				try {
					await sqlStorage.initialize(currentEnvironment);
					await useAppStore.getState().loadFromFile();
				} catch {
					// Best effort
				}
				return result;
			}
		},

		exportExpensesToFile: async (filePath: string) => {
			set({ isLoading: true });
			try {
				const s = useExpenseStore.getState();
				const exportData = backupService.createExpenseExportData(
					s.expenses,
					s.categories,
					s.categoryColors,
					s.paymentMethods,
					s.selectedMonth ?? new Date(),
					s.overviewMode,
				);
				const success = await backupService.exportExpensesToJson(exportData, filePath);
				set({ isLoading: false });
				return success ?
						{ success: true }
					:	{ success: false, error: "Failed to write export file" };
			} catch (error) {
				set({ isLoading: false });
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},

		importExpensesFromFile: async (filePath: string, mode: "replace" | "merge") => {
			set({ isLoading: true });
			try {
				const importResult = await backupService.importExpensesFromJson(filePath);
				if (!importResult.success || !importResult.data) {
					const result: ImportResult = {
						success: false,
						error: importResult.error ?? "Failed to read export file",
					};
					set({ lastImportResult: result, isLoading: false });
					return result;
				}

				const exportData = importResult.data;
				const expenseStore = useExpenseStore.getState();
				const deserialized = deserializeExpenses(exportData.data.expenses);

				if (mode === "replace") {
					expenseStore.setExpenseData({
						expenses: deserialized,
						selectedMonth: new Date(exportData.data.selectedMonth),
						overviewMode: exportData.data.overviewMode as OverviewMode,
						categories: exportData.data.categories,
						categoryColors: exportData.data.categoryColors,
						paymentMethods: exportData.data.paymentMethods,
					});
					await useAppStore.getState().saveToFile(AppToSave.Expenses);
					const result: ImportResult = {
						success: true,
						importedCount: exportData.data.expenses.length,
						skippedCount: 0,
					};
					set({ lastImportResult: result, isLoading: false });
					return result;
				} else {
					const existingIds = new Set(expenseStore.expenses.map((e) => e.id));
					const newExpenses = deserialized.filter((e) => !existingIds.has(e.id));
					const mergedCategories = Array.from(
						new Set([...expenseStore.categories, ...exportData.data.categories]),
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
					const mergedColors = {
						...expenseStore.categoryColors,
						...exportData.data.categoryColors,
					};
					const mergedPaymentMethods = Array.from(
						new Set([
							...expenseStore.paymentMethods,
							...exportData.data.paymentMethods,
						]),
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

					expenseStore.setExpenseData({
						expenses: [...expenseStore.expenses, ...newExpenses],
						selectedMonth: expenseStore.selectedMonth ?? new Date(),
						overviewMode: expenseStore.overviewMode,
						categories: mergedCategories,
						categoryColors: mergedColors,
						paymentMethods: mergedPaymentMethods,
					});
					await useAppStore.getState().saveToFile(AppToSave.Expenses);
					const result: ImportResult = {
						success: true,
						importedCount: newExpenses.length,
						skippedCount: exportData.data.expenses.length - newExpenses.length,
					};
					set({ lastImportResult: result, isLoading: false });
					return result;
				}
			} catch (error) {
				const result: ImportResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastImportResult: result, isLoading: false });
				return result;
			}
		},

		getExpenseExportPath: (backupFilename) =>
			backupService.getExpenseExportPath(backupFilename),

		setAutoBackupEnabled: async (enabled) => {
			const settings = { ...get().settings, autoBackupEnabled: enabled };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setAutoBackupInterval: async (hours) => {
			const settings = { ...get().settings, autoBackupIntervalHours: hours };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setMaxAutoBackups: async (count) => {
			const settings = { ...get().settings, maxAutoBackups: count };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setCustomBackupPath: async (path) => {
			const success = await backupService.setCustomBackupPath(path);
			if (success) {
				const settings = { ...get().settings, customBackupPath: path };
				set({ settings });
				await get().loadBackups();
			}
			return success;
		},

		switchEnvironment: async (environment) => {
			set({ isLoading: true });
			try {
				await backupService.switchEnvironment(environment);
				await sqlStorage.switchEnvironment(environment);
				await useAppStore.getState().loadFromFile();
				set({ settings: backupService.getSettings(), isLoading: false });
			} catch (error) {
				console.error("Failed to switch environment:", error);
				set({ isLoading: false });
			}
		},

		getCurrentEnvironment: () => get().settings.databaseEnvironment,

		openBackupFolder: () => backupService.openBackupFolder(),
		getDefaultDocumentsPath: () => backupService.getDefaultDocumentsPath(),

		clearResults: () =>
			set({ lastBackupResult: null, lastRestoreResult: null, lastImportResult: null }),

		clearDatabase: async () => {
			set({ isLoading: true });
			try {
				await sqlStorage.clearAllData();
				await useAppStore.getState().loadFromFile();
			} finally {
				set({ isLoading: false });
			}
		},

		clearLocalStorage: () => {
			sqlStorage.clearLocalStorageCache();
		},
	})),
);
