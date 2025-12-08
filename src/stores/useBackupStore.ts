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
} from "@/types/backup";
import useAppStore from "./useAppStore";

interface BackupStore {
	// State
	settings: BackupSettings;
	backups: BackupInfo[];
	isLoading: boolean;
	lastBackupResult: BackupResult | null;
	lastRestoreResult: RestoreResult | null;

	// Actions
	initialize: () => Promise<void>;
	loadBackups: () => Promise<void>;
	createBackup: (description?: string) => Promise<BackupResult>;
	deleteBackup: (filename: string) => Promise<boolean>;
	restoreFromBackup: (filename: string) => Promise<RestoreResult>;

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

		// Initialize backup service and load settings
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

		// Load backups list
		loadBackups: async () => {
			try {
				const backups = await backupService.listBackups();
				set({ backups });
			} catch (error) {
				console.error("Failed to load backups:", error);
			}
		},

		// Create a new backup
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

		// Delete a backup
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

		// Restore from backup
		restoreFromBackup: async (filename: string) => {
			set({ isLoading: true });
			try {
				const result = await backupService.restoreFromBackup(filename);
				set({ lastRestoreResult: result, isLoading: false });

				if (result.success) {
					// Reload the app data after restore
					await useAppStore.getState().loadFromFile();
				}

				return result;
			} catch (error) {
				const result: RestoreResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
				set({ lastRestoreResult: result, isLoading: false });
				return result;
			}
		},

		// Settings actions
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

		// Environment actions
		switchEnvironment: async (environment: DatabaseEnvironment) => {
			set({ isLoading: true });
			try {
				// Update backup service settings
				await backupService.switchEnvironment(environment);

				// Switch database
				await sqlStorage.switchEnvironment(environment);

				// Reload app data
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

		// Utility actions
		openBackupFolder: async () => {
			await backupService.openBackupFolder();
		},

		getDefaultDocumentsPath: async () => {
			return backupService.getDefaultDocumentsPath();
		},

		clearResults: () => {
			set({ lastBackupResult: null, lastRestoreResult: null });
		},
	}))
);
