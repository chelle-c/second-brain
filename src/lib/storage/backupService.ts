import { appDataDir, documentDir, sep } from "@tauri-apps/api/path";
import {
	exists,
	mkdir,
	readDir,
	readTextFile,
	writeTextFile,
	remove,
	copyFile,
} from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import {
	BackupMetadata,
	BackupSettings,
	BackupInfo,
	BackupResult,
	RestoreResult,
	DatabaseEnvironment,
	DEFAULT_BACKUP_SETTINGS,
	MigrationStep,
	ExpenseExportData,
} from "@/types/backup";
import { DATA_VERSION, DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { Expense } from "@/types/expense";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";

const BACKUP_DIR_NAME = "backups";
const BACKUP_SETTINGS_FILE = "backup-settings.json";
const DB_NAME_PRODUCTION = "appdata.db";
const DB_NAME_TEST = "appdata-test.db";

// Helper to join paths with proper separator
const joinPath = (...parts: string[]): string => {
	return parts.join(sep());
};

// Format date for short filename: YYYYMMDD-HHmmss
const formatDateForFilename = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

// Migration steps
const MIGRATIONS: MigrationStep[] = [
	{
		fromVersion: "0.0.4",
		toVersion: "0.0.5",
		description: "Added paymentMethod to expenses",
		migrate: (data: any) => {
			return {
				...data,
				expenses: {
					...data.expenses,
					paymentMethods: data.expenses?.paymentMethods || ["Default"],
					expenses: (data.expenses?.expenses || []).map((e: any) => ({
						...e,
						paymentMethod: e.paymentMethod || "None",
						initialState: e.initialState
							? {
									...e.initialState,
									paymentMethod: e.initialState.paymentMethod || "None",
							  }
							: undefined,
					})),
				},
			};
		},
	},
];

class BackupService {
	private settings: BackupSettings = DEFAULT_BACKUP_SETTINGS;
	private appDataPath: string | null = null;
	private autoBackupInterval: NodeJS.Timeout | null = null;

	async initialize(): Promise<void> {
		this.appDataPath = await appDataDir();
		await this.loadSettings();

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

			this.startAutoBackupScheduler();

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

	getDatabaseFileName(environment?: DatabaseEnvironment): string {
		const env = environment || this.settings.databaseEnvironment;
		return env === "production" ? DB_NAME_PRODUCTION : DB_NAME_TEST;
	}

	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		this.settings.databaseEnvironment = environment;
		await this.saveSettings(this.settings);
	}

	private startAutoBackupScheduler(): void {
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

		this.checkInitialAutoBackup();
	}

	private async checkInitialAutoBackup(): Promise<void> {
		const backups = await this.listBackups();
		const autoBackups = backups.filter((b) =>
			b.metadata.description?.startsWith("Auto-backup")
		);

		if (autoBackups.length === 0) {
			await this.performAutoBackup();
			return;
		}

		const mostRecent = autoBackups.sort(
			(a, b) =>
				new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
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
			.filter((b) => b.metadata.description?.startsWith("Auto-backup"))
			.sort(
				(a, b) =>
					new Date(b.metadata.createdAt).getTime() -
					new Date(a.metadata.createdAt).getTime()
			);

		const toRemove = autoBackups.slice(this.settings.maxAutoBackups);
		for (const backup of toRemove) {
			await this.deleteBackup(backup.filename);
		}
	}

	private async flushWAL(dbPath: string): Promise<void> {
		let tempDb: Database | null = null;
		try {
			console.log("Flushing WAL before backup...");
			tempDb = await Database.load(`sqlite:${dbPath}`);
			await tempDb.execute("PRAGMA wal_checkpoint(TRUNCATE)");
			console.log("WAL flushed successfully");
		} catch (error) {
			console.warn("Could not flush WAL:", error);
		} finally {
			if (tempDb) {
				try {
					await tempDb.close();
				} catch {
					// Ignore close errors
				}
			}
		}
	}

	private generateBackupFilename(timestamp: string, isPreRestore: boolean = false): string {
		const prefix = isPreRestore ? "pre-restore" : "backup";
		const envSuffix = this.settings.databaseEnvironment === "test" ? "-test" : "";
		return `${prefix}${envSuffix}-${timestamp}.db`;
	}

	/**
	 * Create export data object from expenses
	 */
	createExpenseExportData(
		expenses: Expense[],
		categories: string[],
		categoryColors: Record<string, string>,
		paymentMethods: string[],
		selectedMonth: Date,
		overviewMode: string,
		description?: string
	): ExpenseExportData {
		return {
			version: DATA_VERSION,
			exportedAt: new Date().toISOString(),
			environment: this.settings.databaseEnvironment,
			description,
			data: {
				expenses: expenses.map((e) => ({
					...e,
					dueDate: e.dueDate?.toISOString() || null,
					paymentDate: e.paymentDate?.toISOString() || null,
					createdAt: e.createdAt.toISOString(),
					updatedAt: e.updatedAt.toISOString(),
					initialState: e.initialState
						? {
								amount: e.initialState.amount,
								dueDate: e.initialState.dueDate?.toISOString() || null,
								paymentMethod: e.initialState.paymentMethod || "None",
						  }
						: undefined,
				})),
				categories,
				categoryColors,
				paymentMethods,
				selectedMonth: selectedMonth.toISOString(),
				overviewMode,
			},
		};
	}

	/**
	 * Export expenses to JSON file
	 */
	async exportExpensesToJson(
		exportData: ExpenseExportData,
		outputPath: string
	): Promise<boolean> {
		try {
			const jsonContent = JSON.stringify(exportData, null, 2);
			await writeTextFile(outputPath, jsonContent);
			console.log(`Exported ${exportData.data.expenses.length} expenses to ${outputPath}`);
			return true;
		} catch (error) {
			console.error("Failed to export expenses:", error);
			return false;
		}
	}

	/**
	 * Import expenses from JSON file
	 */
	async importExpensesFromJson(filePath: string): Promise<{
		success: boolean;
		data?: ExpenseExportData;
		error?: string;
	}> {
		try {
			const fileExists = await exists(filePath);
			if (!fileExists) {
				return { success: false, error: "File not found" };
			}

			const content = await readTextFile(filePath);
			const data = JSON.parse(content) as ExpenseExportData;

			// Validate structure
			if (!data.version || !data.data || !Array.isArray(data.data.expenses)) {
				return { success: false, error: "Invalid export file format" };
			}

			// Convert date strings back to Date objects
			data.data.expenses = data.data.expenses.map((e: any) => ({
				...e,
				dueDate: e.dueDate ? new Date(e.dueDate) : null,
				paymentDate: e.paymentDate ? new Date(e.paymentDate) : null,
				createdAt: new Date(e.createdAt),
				updatedAt: new Date(e.updatedAt),
				paymentMethod: e.paymentMethod || "None",
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

			console.log(`Parsed ${data.data.expenses.length} expenses from ${filePath}`);
			return { success: true, data };
		} catch (error) {
			console.error("Failed to import expenses:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Read expenses directly from database for export
	 */
	private async readExpensesFromDatabase(dbPath: string): Promise<{
		expenses: Expense[];
		categories: string[];
		categoryColors: Record<string, string>;
		paymentMethods: string[];
		selectedMonth: Date;
		overviewMode: string;
	} | null> {
		let tempDb: Database | null = null;
		try {
			tempDb = await Database.load(`sqlite:${dbPath}`);

			// Check if paymentMethod column exists
			const tableInfo = await tempDb.select<Array<{ name: string }>>(
				"PRAGMA table_info(expenses)"
			);
			const hasPaymentMethod = tableInfo.some((col) => col.name === "paymentMethod");

			// Read expenses
			const selectQuery = hasPaymentMethod
				? "SELECT * FROM expenses"
				: `SELECT id, name, amount, category, 'None' as paymentMethod, dueDate, isRecurring, 
				   recurrence, isArchived, isPaid, paymentDate, type, importance, createdAt, 
				   updatedAt, parentExpenseId, monthlyOverrides, isModified, initialState 
				   FROM expenses`;

			const rawExpenses = await tempDb.select<any[]>(selectQuery);

			// Convert raw rows to Expense objects
			const expenses: Expense[] = rawExpenses.map((row: any) => ({
				id: row.id,
				name: row.name,
				amount: row.amount,
				category: row.category,
				paymentMethod: row.paymentMethod || "None",
				dueDate: row.dueDate ? new Date(row.dueDate) : null,
				isRecurring: row.isRecurring === 1,
				recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined,
				isArchived: row.isArchived === 1,
				isPaid: row.isPaid === 1,
				paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
				type: row.type || "need",
				importance: row.importance || "none",
				createdAt: new Date(row.createdAt),
				updatedAt: new Date(row.updatedAt),
				parentExpenseId: row.parentExpenseId || undefined,
				monthlyOverrides: row.monthlyOverrides ? JSON.parse(row.monthlyOverrides) : {},
				isModified: row.isModified === 1,
				initialState: row.initialState
					? (() => {
							const parsed = JSON.parse(row.initialState);
							return {
								amount: parsed.amount,
								dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
								paymentMethod: parsed.paymentMethod || "None",
							};
					  })()
					: undefined,
			}));

			// Read settings
			const settingsResults = await tempDb.select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings WHERE key LIKE 'expense_%'"
			);

			const settingsMap: Record<string, any> = {};
			for (const row of settingsResults) {
				try {
					settingsMap[row.key] = JSON.parse(row.value);
				} catch {
					settingsMap[row.key] = row.value;
				}
			}

			console.log(`Read ${expenses.length} expenses from database`);

			return {
				expenses,
				categories: settingsMap["expense_categories"] || DEFAULT_EXPENSE_CATEGORIES,
				categoryColors: settingsMap["expense_categoryColors"] || DEFAULT_CATEGORY_COLORS,
				paymentMethods: settingsMap["expense_paymentMethods"] || DEFAULT_PAYMENT_METHODS,
				selectedMonth: settingsMap["expense_selectedMonth"]
					? new Date(settingsMap["expense_selectedMonth"])
					: new Date(),
				overviewMode: settingsMap["expense_overviewMode"] || "remaining",
			};
		} catch (error) {
			console.error("Failed to read expenses from database:", error);
			return null;
		} finally {
			if (tempDb) {
				try {
					await tempDb.close();
				} catch {
					// Ignore close errors
				}
			}
		}
	}

	async createBackup(description?: string): Promise<BackupResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const dbFileName = this.getDatabaseFileName();
			const sourcePath = joinPath(appData, dbFileName);

			const sourceExists = await exists(sourcePath);
			if (!sourceExists) {
				return {
					success: false,
					error: "Source database does not exist",
				};
			}

			// Flush WAL to ensure all data is in the main database file
			await this.flushWAL(sourcePath);

			const now = new Date();
			const timestamp = formatDateForFilename(now);
			const backupFilename = this.generateBackupFilename(timestamp);
			const backupFilePath = joinPath(backupPath, backupFilename);

			// Copy database file
			await copyFile(sourcePath, backupFilePath);
			console.log(`Database backed up to ${backupFilename}`);

			// Export expenses to JSON alongside the backup
			let hasExpenseExport = false;
			const expenseExportFilename = backupFilename.replace(".db", "-expenses.json");
			const expenseExportPath = joinPath(backupPath, expenseExportFilename);

			const expenseData = await this.readExpensesFromDatabase(sourcePath);
			if (expenseData && expenseData.expenses.length > 0) {
				const exportData = this.createExpenseExportData(
					expenseData.expenses,
					expenseData.categories,
					expenseData.categoryColors,
					expenseData.paymentMethods,
					expenseData.selectedMonth,
					expenseData.overviewMode,
					description
				);

				hasExpenseExport = await this.exportExpensesToJson(exportData, expenseExportPath);

				if (hasExpenseExport) {
					console.log(`Expense export created: ${expenseExportFilename}`);
				}
			} else {
				console.log("No expenses to export or failed to read expenses");
			}

			// Create metadata
			const metadata: BackupMetadata = {
				id: crypto.randomUUID(),
				createdAt: now,
				version: DATA_VERSION,
				environment: this.settings.databaseEnvironment,
				description: description || "Manual backup",
				hasExpenseExport,
			};

			const metadataPath = joinPath(backupPath, `${backupFilename}.meta.json`);
			await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

			const backupInfo: BackupInfo = {
				filename: backupFilename,
				metadata,
				path: backupFilePath,
				expenseExportPath: hasExpenseExport ? expenseExportPath : undefined,
			};

			console.log(
				`Backup created: ${backupFilename}${
					hasExpenseExport ? " (with expense export)" : ""
				}`
			);

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
				if (
					entry.name &&
					entry.name.endsWith(".db") &&
					!entry.name.endsWith(".meta.json")
				) {
					const metadataPath = joinPath(backupPath, `${entry.name}.meta.json`);
					const expenseExportPath = joinPath(
						backupPath,
						entry.name.replace(".db", "-expenses.json")
					);

					try {
						const metadataExists = await exists(metadataPath);
						const expenseExportExists = await exists(expenseExportPath);

						if (metadataExists) {
							const metadataContent = await readTextFile(metadataPath);
							const metadata = JSON.parse(metadataContent) as BackupMetadata;
							metadata.createdAt = new Date(metadata.createdAt);
							metadata.hasExpenseExport = expenseExportExists;

							backups.push({
								filename: entry.name,
								metadata,
								path: joinPath(backupPath, entry.name),
								expenseExportPath: expenseExportExists
									? expenseExportPath
									: undefined,
							});
						} else {
							// Parse from filename for legacy backups
							let environment: DatabaseEnvironment = "production";
							let createdAt = new Date();

							const prodMatch = entry.name.match(/^backup-(\d{8})-(\d{6})\.db$/);
							const testMatch = entry.name.match(/^backup-test-(\d{8})-(\d{6})\.db$/);
							const oldMatch = entry.name.match(
								/backup-(prod|production|test)-(\d{8})-(\d{6})\.db/
							);
							const veryOldMatch = entry.name.match(
								/backup-(production|test)-(.+)\.db/
							);

							if (prodMatch) {
								environment = "production";
								const dateStr = prodMatch[1];
								const timeStr = prodMatch[2];
								createdAt = new Date(
									parseInt(dateStr.slice(0, 4)),
									parseInt(dateStr.slice(4, 6)) - 1,
									parseInt(dateStr.slice(6, 8)),
									parseInt(timeStr.slice(0, 2)),
									parseInt(timeStr.slice(2, 4)),
									parseInt(timeStr.slice(4, 6))
								);
							} else if (testMatch) {
								environment = "test";
								const dateStr = testMatch[1];
								const timeStr = testMatch[2];
								createdAt = new Date(
									parseInt(dateStr.slice(0, 4)),
									parseInt(dateStr.slice(4, 6)) - 1,
									parseInt(dateStr.slice(6, 8)),
									parseInt(timeStr.slice(0, 2)),
									parseInt(timeStr.slice(2, 4)),
									parseInt(timeStr.slice(4, 6))
								);
							} else if (oldMatch) {
								environment = oldMatch[1] === "test" ? "test" : "production";
								const dateStr = oldMatch[2];
								const timeStr = oldMatch[3];
								createdAt = new Date(
									parseInt(dateStr.slice(0, 4)),
									parseInt(dateStr.slice(4, 6)) - 1,
									parseInt(dateStr.slice(6, 8)),
									parseInt(timeStr.slice(0, 2)),
									parseInt(timeStr.slice(2, 4)),
									parseInt(timeStr.slice(4, 6))
								);
							} else if (veryOldMatch) {
								environment = veryOldMatch[1] as DatabaseEnvironment;
								try {
									createdAt = new Date(
										veryOldMatch[2].replace(/-/g, ":").replace("T", " ")
									);
								} catch {
									// Keep default date
								}
							}

							backups.push({
								filename: entry.name,
								metadata: {
									id: crypto.randomUUID(),
									createdAt,
									version: "unknown",
									environment,
									description: "Legacy backup (no metadata)",
									hasExpenseExport: expenseExportExists,
								},
								path: joinPath(backupPath, entry.name),
								expenseExportPath: expenseExportExists
									? expenseExportPath
									: undefined,
							});
						}
					} catch {
						// Skip files we can't read metadata for
					}
				}
			}

			return backups.sort(
				(a, b) =>
					new Date(b.metadata.createdAt).getTime() -
					new Date(a.metadata.createdAt).getTime()
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
			const expenseExportPath = joinPath(
				backupPath,
				filename.replace(".db", "-expenses.json")
			);

			await remove(filePath);

			if (await exists(metadataPath)) {
				await remove(metadataPath);
			}

			if (await exists(expenseExportPath)) {
				await remove(expenseExportPath);
			}

			return true;
		} catch (error) {
			console.error("Failed to delete backup:", error);
			return false;
		}
	}

	validateRestoreEnvironment(
		backupEnvironment: DatabaseEnvironment,
		targetEnvironment: DatabaseEnvironment
	): { allowed: boolean; reason?: string } {
		if (backupEnvironment === "test" && targetEnvironment === "production") {
			return {
				allowed: false,
				reason: "Cannot restore test environment backup to production database. This is a safety measure to prevent test data from overwriting production data.",
			};
		}
		return { allowed: true };
	}

	async restoreFromBackup(
		filename: string,
		options?: {
			targetEnvironment?: DatabaseEnvironment;
			skipEnvironmentCheck?: boolean;
		}
	): Promise<RestoreResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const backupFilePath = joinPath(backupPath, filename);
			const metadataPath = joinPath(backupPath, `${filename}.meta.json`);

			const backupExists = await exists(backupFilePath);
			if (!backupExists) {
				return {
					success: false,
					error: "Backup file not found",
				};
			}

			let sourceVersion = "unknown";
			let backupEnvironment: DatabaseEnvironment = "production";

			try {
				const metaExists = await exists(metadataPath);
				if (metaExists) {
					const metadataContent = await readTextFile(metadataPath);
					const backupMetadata = JSON.parse(metadataContent) as BackupMetadata;
					sourceVersion = backupMetadata.version;
					backupEnvironment = backupMetadata.environment;
				} else {
					if (filename.includes("-test-")) {
						backupEnvironment = "test";
					}
				}
			} catch {
				console.warn("Could not read backup metadata, assuming production environment");
			}

			const targetEnvironment =
				options?.targetEnvironment || this.settings.databaseEnvironment;

			if (!options?.skipEnvironmentCheck) {
				const validation = this.validateRestoreEnvironment(
					backupEnvironment,
					targetEnvironment
				);
				if (!validation.allowed) {
					return {
						success: false,
						error: validation.reason,
					};
				}
			}

			if (sourceVersion !== DATA_VERSION && sourceVersion !== "unknown") {
				const canMigrate = this.canMigrate(sourceVersion, DATA_VERSION);
				if (!canMigrate) {
					return {
						success: false,
						error: `Cannot migrate from version ${sourceVersion} to ${DATA_VERSION}. The backup may be from a newer version of the application.`,
						requiresMigration: true,
						sourceVersion,
						targetVersion: DATA_VERSION,
					};
				}
			}

			const currentDbFileName = this.getDatabaseFileName(targetEnvironment);
			const currentDbPath = joinPath(appData, currentDbFileName);
			const currentDbExists = await exists(currentDbPath);

			if (currentDbExists) {
				await this.flushWAL(currentDbPath);

				const timestamp = formatDateForFilename(new Date());
				const savedEnv = this.settings.databaseEnvironment;
				this.settings.databaseEnvironment = targetEnvironment;
				const preRestoreBackupName = this.generateBackupFilename(timestamp, true);
				this.settings.databaseEnvironment = savedEnv;

				const preRestoreBackupPath = joinPath(backupPath, preRestoreBackupName);

				try {
					await copyFile(currentDbPath, preRestoreBackupPath);

					const preRestoreMetadata: BackupMetadata = {
						id: crypto.randomUUID(),
						createdAt: new Date(),
						version: DATA_VERSION,
						environment: targetEnvironment,
						description: `Pre-restore backup (before restoring ${filename})`,
					};
					await writeTextFile(
						joinPath(backupPath, `${preRestoreBackupName}.meta.json`),
						JSON.stringify(preRestoreMetadata, null, 2)
					);

					console.log(`Created pre-restore backup: ${preRestoreBackupName}`);
				} catch (preRestoreError) {
					console.warn("Could not create pre-restore backup:", preRestoreError);
				}
			}

			const targetPath = joinPath(appData, this.getDatabaseFileName(targetEnvironment));

			if (currentDbExists) {
				try {
					await remove(targetPath);
				} catch (removeError) {
					console.warn("Could not remove existing database:", removeError);
				}

				try {
					const walPath = targetPath + "-wal";
					const shmPath = targetPath + "-shm";
					if (await exists(walPath)) await remove(walPath);
					if (await exists(shmPath)) await remove(shmPath);
				} catch {
					// Ignore errors removing WAL files
				}
			}

			await copyFile(backupFilePath, targetPath);

			console.log(
				`Restored backup ${filename} (${backupEnvironment}) to ${targetEnvironment} environment`
			);

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

	async getExpenseExportPath(backupFilename: string): Promise<string | null> {
		const backupPath = await this.getBackupPath();
		const exportPath = joinPath(backupPath, backupFilename.replace(".db", "-expenses.json"));

		if (await exists(exportPath)) {
			return exportPath;
		}
		return null;
	}

	private canMigrate(fromVersion: string, toVersion: string): boolean {
		if (fromVersion === toVersion) return true;

		if (this.compareVersions(fromVersion, toVersion) > 0) {
			return false;
		}

		let currentVersion = fromVersion;
		while (currentVersion !== toVersion) {
			const nextMigration = MIGRATIONS.find((m) => m.fromVersion === currentVersion);
			if (!nextMigration) {
				return this.compareVersions(fromVersion, toVersion) <= 0;
			}
			currentVersion = nextMigration.toVersion;
		}
		return true;
	}

	private compareVersions(v1: string, v2: string): number {
		const parts1 = v1.split(".").map(Number);
		const parts2 = v2.split(".").map(Number);

		for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
			const p1 = parts1[i] || 0;
			const p2 = parts2[i] || 0;
			if (p1 < p2) return -1;
			if (p1 > p2) return 1;
		}
		return 0;
	}

	getMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
		const path: MigrationStep[] = [];
		let currentVersion = fromVersion;

		while (currentVersion !== toVersion) {
			const nextMigration = MIGRATIONS.find((m) => m.fromVersion === currentVersion);
			if (!nextMigration) {
				break;
			}
			path.push(nextMigration);
			currentVersion = nextMigration.toVersion;
		}

		return path;
	}

	async setCustomBackupPath(path: string | null): Promise<boolean> {
		try {
			if (path) {
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

	async isDevMode(): Promise<boolean> {
		try {
			return await invoke<boolean>("is_dev");
		} catch {
			return false;
		}
	}

	async openBackupFolder(): Promise<void> {
		try {
			const { openPath } = await import("@tauri-apps/plugin-opener");
			const backupPath = await this.getBackupPath();
			await openPath(backupPath);
		} catch (error) {
			console.error("Failed to open backup folder:", error);
		}
	}

	destroy(): void {
		if (this.autoBackupInterval) {
			clearInterval(this.autoBackupInterval);
			this.autoBackupInterval = null;
		}
	}
}

export const backupService = new BackupService();
