import { appDataDir, documentDir, sep } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, writeTextFile, remove, copyFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import {
	BackupMetadata,
	BackupSettings,
	BackupInfo,
	BackupResult,
	RestoreResult,
	DatabaseEnvironment,
	DEFAULT_BACKUP_SETTINGS,
	MigrationStep,
} from "@/types/backup";
import { DATA_VERSION } from "@/types/storage";

const BACKUP_DIR_NAME = "backups";
const BACKUP_SETTINGS_FILE = "backup-settings.json";
const DB_NAME_PRODUCTION = "appdata.db";
const DB_NAME_TEST = "appdata-test.db";

// Helper to join paths with proper separator
const joinPath = (...parts: string[]): string => {
	return parts.join(sep());
};

// Migration steps - add new migrations here as the schema evolves
const MIGRATIONS: MigrationStep[] = [
	// Example migration (for future use):
	// {
	// 	fromVersion: "0.0.3",
	// 	toVersion: "0.0.4",
	// 	description: "Added monthly overrides to expenses",
	// 	migrate: (data) => {
	// 		// Transform data from 0.0.3 to 0.0.4 format
	// 		return {
	// 			...data,
	// 			expenses: data.expenses.map((e: any) => ({
	// 				...e,
	// 				monthlyOverrides: e.monthlyOverrides || {},
	// 			})),
	// 		};
	// 	},
	// },
];

class BackupService {
	private settings: BackupSettings = DEFAULT_BACKUP_SETTINGS;
	private appDataPath: string | null = null;
	private autoBackupInterval: NodeJS.Timeout | null = null;

	async initialize(): Promise<void> {
		this.appDataPath = await appDataDir();
		await this.loadSettings();

		// Automatically set environment based on Rust is_dev
		const isDev = await this.isDevMode();
		const expectedEnvironment: DatabaseEnvironment = isDev ? "test" : "production";
		if (this.settings.databaseEnvironment !== expectedEnvironment) {
			this.settings.databaseEnvironment = expectedEnvironment;
			await this.saveSettings(this.settings);
		}

		await this.ensureBackupDirectory();
		this.startAutoBackupScheduler();
	}

	private async getAppDataPath(): Promise<string> {
		if (!this.appDataPath) {
			this.appDataPath = await appDataDir();
		}
		return this.appDataPath;
	}

	private async getBackupPath(): Promise<string> {
		if (this.settings.customBackupPath) {
			return this.settings.customBackupPath;
		}
		const appData = await this.getAppDataPath();
		return joinPath(appData, BACKUP_DIR_NAME);
	}

	private async ensureBackupDirectory(): Promise<void> {
		const backupPath = await this.getBackupPath();
		try {
			const dirExists = await exists(backupPath);
			if (!dirExists) {
				await mkdir(backupPath, { recursive: true });
			}
		} catch (error) {
			console.error("Failed to create backup directory:", error);
		}
	}

	// Settings management
	async loadSettings(): Promise<BackupSettings> {
		try {
			const appData = await this.getAppDataPath();
			const settingsPath = joinPath(appData, BACKUP_SETTINGS_FILE);

			const settingsExists = await exists(settingsPath);
			if (!settingsExists) {
				this.settings = DEFAULT_BACKUP_SETTINGS;
				await this.saveSettings(this.settings);
				return this.settings;
			}

			const content = await readTextFile(settingsPath);
			this.settings = { ...DEFAULT_BACKUP_SETTINGS, ...JSON.parse(content) };
			return this.settings;
		} catch (error) {
			console.error("Failed to load backup settings:", error);
			this.settings = DEFAULT_BACKUP_SETTINGS;
			return this.settings;
		}
	}

	async saveSettings(settings: BackupSettings): Promise<void> {
		try {
			this.settings = settings;
			const appData = await this.getAppDataPath();
			const settingsPath = joinPath(appData, BACKUP_SETTINGS_FILE);
			await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

			// Restart auto-backup scheduler with new settings
			this.startAutoBackupScheduler();

			// If custom path changed, ensure the new directory exists
			if (settings.customBackupPath) {
				await this.ensureBackupDirectory();
			}
		} catch (error) {
			console.error("Failed to save backup settings:", error);
		}
	}

	getSettings(): BackupSettings {
		return this.settings;
	}

	// Database environment management
	getDatabaseFileName(): string {
		return this.settings.databaseEnvironment === "production"
			? DB_NAME_PRODUCTION
			: DB_NAME_TEST;
	}

	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		this.settings.databaseEnvironment = environment;
		await this.saveSettings(this.settings);
	}

	// Auto-backup scheduler
	private startAutoBackupScheduler(): void {
		// Clear existing interval
		if (this.autoBackupInterval) {
			clearInterval(this.autoBackupInterval);
			this.autoBackupInterval = null;
		}

		if (!this.settings.autoBackupEnabled || this.settings.autoBackupIntervalHours <= 0) {
			return;
		}

		const intervalMs = this.settings.autoBackupIntervalHours * 60 * 60 * 1000;

		this.autoBackupInterval = setInterval(async () => {
			await this.performAutoBackup();
		}, intervalMs);

		// Check if we need an immediate backup
		this.checkInitialAutoBackup();
	}

	private async checkInitialAutoBackup(): Promise<void> {
		const backups = await this.listBackups();
		const autoBackups = backups.filter(b => b.metadata.description?.startsWith("Auto-backup"));

		if (autoBackups.length === 0) {
			// No auto-backups exist, create one
			await this.performAutoBackup();
			return;
		}

		// Check if the most recent auto-backup is older than the interval
		const mostRecent = autoBackups.sort(
			(a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
		)[0];

		const lastBackupTime = new Date(mostRecent.metadata.createdAt).getTime();
		const intervalMs = this.settings.autoBackupIntervalHours * 60 * 60 * 1000;
		const now = Date.now();

		if (now - lastBackupTime > intervalMs) {
			await this.performAutoBackup();
		}
	}

	private async performAutoBackup(): Promise<void> {
		try {
			const result = await this.createBackup("Auto-backup");
			if (result.success) {
				await this.cleanupOldAutoBackups();
			}
		} catch (error) {
			console.error("Auto-backup failed:", error);
		}
	}

	private async cleanupOldAutoBackups(): Promise<void> {
		const backups = await this.listBackups();
		const autoBackups = backups
			.filter(b => b.metadata.description?.startsWith("Auto-backup"))
			.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());

		// Remove backups beyond the max count
		const toRemove = autoBackups.slice(this.settings.maxAutoBackups);
		for (const backup of toRemove) {
			await this.deleteBackup(backup.filename);
		}
	}

	// Backup operations
	async createBackup(description?: string): Promise<BackupResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const dbFileName = this.getDatabaseFileName();
			const sourcePath = joinPath(appData, dbFileName);

			// Check if source database exists
			const sourceExists = await exists(sourcePath);
			if (!sourceExists) {
				return {
					success: false,
					error: "Source database does not exist",
				};
			}

			// Generate backup filename with timestamp
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const backupFilename = `backup-${this.settings.databaseEnvironment}-${timestamp}.db`;
			const backupFilePath = joinPath(backupPath, backupFilename);

			// Copy database file
			await copyFile(sourcePath, backupFilePath);

			// Create metadata
			const metadata: BackupMetadata = {
				id: crypto.randomUUID(),
				createdAt: new Date(),
				version: DATA_VERSION,
				environment: this.settings.databaseEnvironment,
				description,
			};

			// Save metadata alongside backup
			const metadataPath = joinPath(backupPath, `${backupFilename}.meta.json`);
			await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

			const backupInfo: BackupInfo = {
				filename: backupFilename,
				metadata,
				path: backupFilePath,
			};

			return {
				success: true,
				backup: backupInfo,
			};
		} catch (error) {
			console.error("Backup creation failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async listBackups(): Promise<BackupInfo[]> {
		try {
			const backupPath = await this.getBackupPath();

			const dirExists = await exists(backupPath);
			if (!dirExists) {
				return [];
			}

			const entries = await readDir(backupPath);
			const backups: BackupInfo[] = [];

			for (const entry of entries) {
				if (entry.name && entry.name.endsWith(".db") && !entry.name.endsWith(".meta.json")) {
					const metadataPath = joinPath(backupPath, `${entry.name}.meta.json`);

					try {
						const metadataExists = await exists(metadataPath);
						if (metadataExists) {
							const metadataContent = await readTextFile(metadataPath);
							const metadata = JSON.parse(metadataContent) as BackupMetadata;
							metadata.createdAt = new Date(metadata.createdAt);

							backups.push({
								filename: entry.name,
								metadata,
								path: joinPath(backupPath, entry.name),
							});
						} else {
							// Create basic metadata for backups without metadata file
							const match = entry.name.match(/backup-(\w+)-(.+)\.db/);
							backups.push({
								filename: entry.name,
								metadata: {
									id: crypto.randomUUID(),
									createdAt: new Date(),
									version: "unknown",
									environment: (match?.[1] as DatabaseEnvironment) || "production",
									description: "Legacy backup (no metadata)",
								},
								path: joinPath(backupPath, entry.name),
							});
						}
					} catch {
						// Skip files we can't read metadata for
					}
				}
			}

			// Sort by creation date, newest first
			return backups.sort(
				(a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
			);
		} catch (error) {
			console.error("Failed to list backups:", error);
			return [];
		}
	}

	async deleteBackup(filename: string): Promise<boolean> {
		try {
			const backupPath = await this.getBackupPath();
			const filePath = joinPath(backupPath, filename);
			const metadataPath = joinPath(backupPath, `${filename}.meta.json`);

			await remove(filePath);

			const metaExists = await exists(metadataPath);
			if (metaExists) {
				await remove(metadataPath);
			}

			return true;
		} catch (error) {
			console.error("Failed to delete backup:", error);
			return false;
		}
	}

	// Restore operations
	async restoreFromBackup(filename: string): Promise<RestoreResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const backupFilePath = joinPath(backupPath, filename);
			const metadataPath = joinPath(backupPath, `${filename}.meta.json`);

			// Verify backup exists
			const backupExists = await exists(backupFilePath);
			if (!backupExists) {
				return {
					success: false,
					error: "Backup file not found",
				};
			}

			// Load backup metadata
			let sourceVersion = "unknown";
			try {
				const metaExists = await exists(metadataPath);
				if (metaExists) {
					const metadataContent = await readTextFile(metadataPath);
					const metadata = JSON.parse(metadataContent) as BackupMetadata;
					sourceVersion = metadata.version;
				}
			} catch {
				// Continue without metadata
			}

			// Check if migration is needed
			if (sourceVersion !== DATA_VERSION && sourceVersion !== "unknown") {
				const canMigrate = this.canMigrate(sourceVersion, DATA_VERSION);
				if (!canMigrate) {
					return {
						success: false,
						error: `Cannot migrate from version ${sourceVersion} to ${DATA_VERSION}`,
						requiresMigration: true,
						sourceVersion,
						targetVersion: DATA_VERSION,
					};
				}
			}

			// Create a backup of current database before restoring
			const preRestoreBackup = await this.createBackup("Pre-restore backup");
			if (!preRestoreBackup.success) {
				console.warn("Could not create pre-restore backup:", preRestoreBackup.error);
			}

			// Determine target database based on current environment
			const dbFileName = this.getDatabaseFileName();
			const targetPath = joinPath(appData, dbFileName);

			// Copy backup to target location
			await copyFile(backupFilePath, targetPath);

			return {
				success: true,
				sourceVersion,
				targetVersion: DATA_VERSION,
			};
		} catch (error) {
			console.error("Restore failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// Migration support
	private canMigrate(fromVersion: string, toVersion: string): boolean {
		if (fromVersion === toVersion) return true;

		// Build migration path
		let currentVersion = fromVersion;
		while (currentVersion !== toVersion) {
			const nextMigration = MIGRATIONS.find(m => m.fromVersion === currentVersion);
			if (!nextMigration) {
				return false;
			}
			currentVersion = nextMigration.toVersion;
		}
		return true;
	}

	getMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
		const path: MigrationStep[] = [];
		let currentVersion = fromVersion;

		while (currentVersion !== toVersion) {
			const nextMigration = MIGRATIONS.find(m => m.fromVersion === currentVersion);
			if (!nextMigration) {
				break;
			}
			path.push(nextMigration);
			currentVersion = nextMigration.toVersion;
		}

		return path;
	}

	// Custom backup location
	async setCustomBackupPath(path: string | null): Promise<boolean> {
		try {
			if (path) {
				// Verify the path exists or can be created
				const pathExists = await exists(path);
				if (!pathExists) {
					await mkdir(path, { recursive: true });
				}
			}

			this.settings.customBackupPath = path;
			await this.saveSettings(this.settings);
			return true;
		} catch (error) {
			console.error("Failed to set custom backup path:", error);
			return false;
		}
	}

	async getDefaultDocumentsPath(): Promise<string> {
		const docs = await documentDir();
		return joinPath(docs, "SecondBrain-Backups");
	}

	// Check if running in dev mode using Rust is_dev command
	async isDevMode(): Promise<boolean> {
		try {
			return await invoke<boolean>("is_dev");
		} catch {
			return false;
		}
	}

	// Open backup folder
	async openBackupFolder(): Promise<void> {
		try {
			const { openPath } = await import("@tauri-apps/plugin-opener");
			const backupPath = await this.getBackupPath();
			await openPath(backupPath);
		} catch (error) {
			console.error("Failed to open backup folder:", error);
		}
	}

	// Cleanup
	destroy(): void {
		if (this.autoBackupInterval) {
			clearInterval(this.autoBackupInterval);
			this.autoBackupInterval = null;
		}
	}
}

export const backupService = new BackupService();
