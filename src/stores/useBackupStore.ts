import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { backupService, sqlStorage } from "@/lib/storage";
import {
	BackupSettings,
	BackupInfo,
	BackupResult,
	RestoreResult,
	DatabaseEnvironment,
	DEFAULT_BACKUP_SETTINGS,
	ImportResult,
	ExpenseExportData,
} from "@/types/backup";
import useAppStore from "./useAppStore";
import { useExpenseStore } from "./useExpenseStore";
import { AppToSave } from "@/types";

interface BackupStore {
	// State
	settings: BackupSettings;
	backups: BackupInfo[];
	isLoading: boolean;
	lastBackupResult: BackupResult | null;
	lastRestoreResult: RestoreResult | null;
	lastImportResult: ImportResult | null;

	// Actions
	initialize: () => Promise<void>;
	loadBackups: () => Promise<void>;
	createBackup: (description?: string) => Promise<BackupResult>;
	deleteBackup: (filename: string) => Promise<boolean>;
	restoreFromBackup: (
		filename: string,
		targetEnvironment?: DatabaseEnvironment
	) => Promise<RestoreResult>;

	// Import/Export
	exportExpensesToFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
	importExpensesFromFile: (filePath: string, mode: "replace" | "merge") => Promise<ImportResult>;
	getExpenseExportPath: (backupFilename: string) => Promise<string | null>;

	// Validation
	canRestoreToEnvironment: (
		backup: BackupInfo,
		targetEnvironment: DatabaseEnvironment
	) => { allowed: boolean; reason?: string };

	// Settings actions
	setAutoBackupEnabled: (enabled: boolean) => Promise<void>;
	setAutoBackupInterval: (hours: number) => Promise<void>;
	setMaxAutoBackups: (count: number) => Promise<void>;
	setCustomBackupPath: (path: string | null) => Promise<boolean>;

	// Environment actions
	switchEnvironment: (environment: DatabaseEnvironment) => Promise<void>;
	getCurrentEnvironment: () => DatabaseEnvironment;

	// Utility actions
	openBackupFolder: () => Promise<void>;
	getDefaultDocumentsPath: () => Promise<string>;
	clearResults: () => void;
}

export const useBackupStore = create<BackupStore>()(
	subscribeWithSelector((set, get) => ({
		// Initial state
		settings: DEFAULT_BACKUP_SETTINGS,
		backups: [],
		isLoading: false,
		lastBackupResult: null,
		lastRestoreResult: null,
		lastImportResult: null,

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

				if (result.success) {
					await get().loadBackups();
				}

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
				}
				return success;
			} catch (error) {
				console.error("Failed to delete backup:", error);
				return false;
			}
		},

		canRestoreToEnvironment: (backup: BackupInfo, targetEnvironment: DatabaseEnvironment) => {
			return backupService.validateRestoreEnvironment(
				backup.metadata.environment,
				targetEnvironment
			);
		},

		restoreFromBackup: async (filename: string, targetEnvironment?: DatabaseEnvironment) => {
			set({ isLoading: true });
			const currentEnvironment = get().settings.databaseEnvironment;

			try {
				const actualTarget = targetEnvironment || currentEnvironment;

				const backup = get().backups.find((b) => b.filename === filename);
				if (backup) {
					const validation = backupService.validateRestoreEnvironment(
						backup.metadata.environment,
						actualTarget
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

				console.log(`Starting restore of ${filename} to ${actualTarget} environment...`);

				await sqlStorage.close();

				const result = await backupService.restoreFromBackup(filename, {
					targetEnvironment: actualTarget,
				});

				if (result.success) {
					await sqlStorage.initialize(actualTarget);
					await useAppStore.getState().loadFromFile();
					await get().loadBackups();
					console.log("Restore completed successfully");
				} else {
					console.error("Restore failed:", result.error);
					try {
						await sqlStorage.initialize(currentEnvironment);
						await useAppStore.getState().loadFromFile();
					} catch (reinitError) {
						console.error(
							"Failed to recover database after failed restore:",
							reinitError
						);
					}
				}

				set({ lastRestoreResult: result, isLoading: false });
				return result;
			} catch (error) {
				console.error("Restore error:", error);

				const result: RestoreResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastRestoreResult: result, isLoading: false });

				try {
					await sqlStorage.initialize(currentEnvironment);
					await useAppStore.getState().loadFromFile();
				} catch (reinitError) {
					console.error("Failed to recover database after error:", reinitError);
				}

				return result;
			}
		},

		// Export current expenses to a file
		exportExpensesToFile: async (filePath: string) => {
			set({ isLoading: true });
			try {
				const expenseStore = useExpenseStore.getState();

				const exportData: ExpenseExportData = backupService.createExpenseExportData(
					expenseStore.expenses,
					expenseStore.categories,
					expenseStore.categoryColors,
					expenseStore.paymentMethods,
					expenseStore.selectedMonth || new Date(),
					expenseStore.overviewMode
				);

				const success = await backupService.exportExpensesToJson(exportData, filePath);

				set({ isLoading: false });

				if (success) {
					return { success: true };
				} else {
					return { success: false, error: "Failed to write export file" };
				}
			} catch (error) {
				console.error("Export error:", error);
				set({ isLoading: false });
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},

		// Import expenses from a file
		importExpensesFromFile: async (filePath: string, mode: "replace" | "merge") => {
			set({ isLoading: true });

			try {
				const importResult = await backupService.importExpensesFromJson(filePath);

				if (!importResult.success || !importResult.data) {
					const result: ImportResult = {
						success: false,
						error: importResult.error || "Failed to read export file",
					};
					set({ lastImportResult: result, isLoading: false });
					return result;
				}

				const exportData: ExpenseExportData = importResult.data;
				const expenseStore = useExpenseStore.getState();

				if (mode === "replace") {
					// Replace all expense data with imported data
					expenseStore.setExpenseData({
						expenses: exportData.data.expenses,
						selectedMonth: new Date(exportData.data.selectedMonth),
						overviewMode: exportData.data.overviewMode as any,
						categories: exportData.data.categories,
						categoryColors: exportData.data.categoryColors,
						paymentMethods: exportData.data.paymentMethods,
					});

					// Save to database
					await useAppStore.getState().saveToFile(AppToSave.Expenses);

					const result: ImportResult = {
						success: true,
						importedCount: exportData.data.expenses.length,
						skippedCount: 0,
					};
					set({ lastImportResult: result, isLoading: false });
					return result;
				} else {
					// Merge mode - add new expenses, skip duplicates by ID
					const existingIds = new Set(expenseStore.expenses.map((e) => e.id));
					const newExpenses = exportData.data.expenses.filter(
						(e: any) => !existingIds.has(e.id)
					);

					// Merge categories and colors
					const mergedCategories = Array.from(
						new Set([...expenseStore.categories, ...exportData.data.categories])
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

					const mergedColors = {
						...expenseStore.categoryColors,
						...exportData.data.categoryColors,
					};

					const mergedPaymentMethods = Array.from(
						new Set([...expenseStore.paymentMethods, ...exportData.data.paymentMethods])
					).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

					expenseStore.setExpenseData({
						expenses: [...expenseStore.expenses, ...newExpenses],
						selectedMonth: expenseStore.selectedMonth || new Date(),
						overviewMode: expenseStore.overviewMode,
						categories: mergedCategories,
						categoryColors: mergedColors,
						paymentMethods: mergedPaymentMethods,
					});

					// Save to database
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
				console.error("Import error:", error);
				const result: ImportResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastImportResult: result, isLoading: false });
				return result;
			}
		},

		getExpenseExportPath: async (backupFilename: string) => {
			return backupService.getExpenseExportPath(backupFilename);
		},

		setAutoBackupEnabled: async (enabled: boolean) => {
			const settings = { ...get().settings, autoBackupEnabled: enabled };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setAutoBackupInterval: async (hours: number) => {
			const settings = { ...get().settings, autoBackupIntervalHours: hours };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setMaxAutoBackups: async (count: number) => {
			const settings = { ...get().settings, maxAutoBackups: count };
			await backupService.saveSettings(settings);
			set({ settings });
		},

		setCustomBackupPath: async (path: string | null) => {
			const success = await backupService.setCustomBackupPath(path);
			if (success) {
				const settings = { ...get().settings, customBackupPath: path };
				set({ settings });
				await get().loadBackups();
			}
			return success;
		},

		switchEnvironment: async (environment: DatabaseEnvironment) => {
			set({ isLoading: true });
			try {
				await backupService.switchEnvironment(environment);
				await sqlStorage.switchEnvironment(environment);
				await useAppStore.getState().loadFromFile();

				const settings = backupService.getSettings();
				set({ settings, isLoading: false });
			} catch (error) {
				console.error("Failed to switch environment:", error);
				set({ isLoading: false });
			}
		},

		getCurrentEnvironment: () => {
			return get().settings.databaseEnvironment;
		},

		openBackupFolder: async () => {
			await backupService.openBackupFolder();
		},

		getDefaultDocumentsPath: async () => {
			return backupService.getDefaultDocumentsPath();
		},

		clearResults: () => {
			set({ lastBackupResult: null, lastRestoreResult: null, lastImportResult: null });
		},
	}))
);
