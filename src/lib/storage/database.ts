import { invoke } from "@tauri-apps/api/core";
import { appDataDir, sep } from "@tauri-apps/api/path";
import Database from "@tauri-apps/plugin-sql";
import {
	DEFAULT_CATEGORY_COLORS,
	DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/expenseHelpers";
import { type AppData, type AppMetadata, AppToSave } from "@/types";
import type { DatabaseEnvironment } from "@/types/backup";
import type { Note, NotesFolders, Tag } from "@/types/notes";
import { type AppSettings, DEFAULT_SETTINGS } from "@/types/settings";
import {
	DATA_VERSION,
	type DatabaseContext,
	DEFAULT_PAYMENT_METHODS,
	type StorageCache,
} from "@/types/storage";
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from "@/types/theme";
import { ExpensesStorage } from "./expensesStorage";
import { IncomeStorage } from "./incomeStorage";
import { NotesStorage } from "./notesStorage";

const DB_NAME_PRODUCTION = "appdata.db";
const DB_NAME_TEST = "appdata-test.db";

const joinPath = (...parts: string[]): string => {
	return parts.join(sep());
};

const checkIsDevMode = async (): Promise<boolean> => {
	try {
		return await invoke<boolean>("is_dev");
	} catch {
		return false;
	}
};

class SqlStorage {
	private initialized = false;
	private initializing = false;
	private db: Database | null = null;
	private appDataPath: string | null = null;
	private operationQueue: Promise<void> = Promise.resolve();
	private cache: StorageCache = {};
	private currentEnvironment: DatabaseEnvironment = "production";

	private notesStorage!: NotesStorage;
	private expensesStorage!: ExpensesStorage;
	private incomeStorage!: IncomeStorage;

	private assertDb(): Database {
		if (!this.db) {
			throw new Error("Database not initialized");
		}
		return this.db;
	}

	private getDatabaseFileName(): string {
		return this.currentEnvironment === "production"
			? DB_NAME_PRODUCTION
			: DB_NAME_TEST;
	}

	getCurrentEnvironment(): DatabaseEnvironment {
		return this.currentEnvironment;
	}

	async getDataPath(): Promise<string> {
		if (!this.appDataPath) {
			this.appDataPath = await appDataDir();
		}
		return this.appDataPath;
	}

	private queueOperation = async <T>(
		operation: () => Promise<T>,
	): Promise<T> => {
		const result = this.operationQueue.then(operation).catch((error) => {
			console.error("Database operation failed:", error);
			throw error;
		});
		this.operationQueue = result.then(() => {}).catch(() => {});
		return result;
	};

	private getContext(): DatabaseContext {
		if (!this.db) throw new Error("Database not initialized");
		return {
			db: this.db,
			queueOperation: this.queueOperation,
			cache: this.cache,
		};
	}

	async initialize(environment?: DatabaseEnvironment): Promise<void> {
		// If environment is specified and different from current, force re-initialization
		if (environment && environment !== this.currentEnvironment) {
			await this.close();
			this.currentEnvironment = environment;
		}

		if (this.initialized) return;
		if (this.initializing) {
			while (this.initializing) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			return;
		}

		this.initializing = true;

		try {
			if (!environment) {
				const isDev = await checkIsDevMode();
				this.currentEnvironment = isDev ? "test" : "production";
			}

			const dataPath = await this.getDataPath();
			const dbFileName = this.getDatabaseFileName();
			const dbPath = joinPath(dataPath, dbFileName);

			console.log(`Connecting to database: ${dbPath}`);
			this.db = await Database.load(`sqlite:${dbPath}`);

			await this.db.execute("PRAGMA journal_mode=WAL");
			await this.db.execute("PRAGMA synchronous=NORMAL");
			await this.db.execute("PRAGMA busy_timeout=5000");

			// Create tables (for new installations or missing tables)
			await this.createTables();

			// Run migrations to update schema
			await this.runMigrations();

			// Verify schema after migrations
			await this.verifySchema();

			// Initialize sub-storage modules
			this.notesStorage = new NotesStorage(this.getContext());
			this.expensesStorage = new ExpensesStorage(this.getContext());
			this.incomeStorage = new IncomeStorage(this.getContext());

			this.initialized = true;
			console.log(
				`Database initialized (${this.currentEnvironment} environment, file: ${dbFileName}, version: ${DATA_VERSION})`,
			);
		} catch (error) {
			console.error("Failed to initialize database:", error);
			this.initialized = false;
			throw error;
		} finally {
			this.initializing = false;
		}
	}

	private async createTables(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		// Create notes table
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS notes (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				tags TEXT DEFAULT '[]',
				folder TEXT NOT NULL,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				archived INTEGER DEFAULT 0
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS folders (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				data TEXT NOT NULL
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS tags (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				color TEXT NOT NULL,
				icon TEXT NOT NULL
			)
		`);

		// Note: paymentMethod column is added via migration for existing tables
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS expenses (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				amount REAL NOT NULL,
				category TEXT NOT NULL,
				dueDate TEXT,
				isRecurring INTEGER NOT NULL,
				recurrence TEXT,
				isArchived INTEGER NOT NULL,
				isPaid INTEGER NOT NULL,
				paymentDate TEXT,
				type TEXT NOT NULL,
				importance TEXT NOT NULL,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				parentExpenseId TEXT,
				monthlyOverrides TEXT,
				isModified INTEGER,
				initialState TEXT
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS income_entries (
				id TEXT PRIMARY KEY,
				date TEXT NOT NULL,
				amount REAL NOT NULL,
				hours INTEGER,
				minutes INTEGER
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS income_weekly_targets (
				id TEXT PRIMARY KEY,
				amount REAL NOT NULL
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS metadata (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				lastSaved TEXT NOT NULL,
				version TEXT NOT NULL
			)
		`);
	}

	private async runMigrations(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		// Get current version from metadata
		let currentVersion = "0.0.0";

		try {
			const versionResult = await this.db.select<Array<{ version: string }>>(
				"SELECT version FROM metadata WHERE id = 1",
			);
			if (versionResult.length > 0 && versionResult[0].version) {
				currentVersion = versionResult[0].version;
			}
		} catch (_) {
			console.log("No metadata found, assuming version 0.0.0");
		}

		console.log(
			`Database migration check: current version ${currentVersion}, target version ${DATA_VERSION}`,
		);

		// Always check and add missing columns regardless of version
		// This handles cases where version metadata might be incorrect
		await this.ensureExpensesColumns();

		// Update metadata version
		if (currentVersion !== DATA_VERSION) {
			try {
				await this.db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[new Date().toISOString(), DATA_VERSION],
				);
				console.log(`Updated database version to ${DATA_VERSION}`);
			} catch (error) {
				console.error("Failed to update metadata version:", error);
			}
		}
	}

	private async ensureExpensesColumns(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			// Get current columns in expenses table
			const tableInfo = await this.db.select<
				Array<{ name: string; type: string }>
			>("PRAGMA table_info(expenses)");

			const existingColumns = new Set(tableInfo.map((col) => col.name));
			console.log(
				`Expenses table columns: ${Array.from(existingColumns).join(", ")}`,
			);

			// Define columns that should exist with their defaults
			const requiredColumns: Array<{
				name: string;
				type: string;
				defaultValue: string;
			}> = [{ name: "paymentMethod", type: "TEXT", defaultValue: "'None'" }];

			// Add any missing columns
			for (const column of requiredColumns) {
				if (!existingColumns.has(column.name)) {
					console.log(`Adding missing column: ${column.name}`);
					try {
						await this.db.execute(
							`ALTER TABLE expenses ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`,
						);
						console.log(`Successfully added column: ${column.name}`);
					} catch (alterError) {
						console.error(`Failed to add column ${column.name}:`, alterError);
						throw alterError;
					}
				}
			}

			// Ensure payment methods setting exists
			const paymentMethodsResult = await this.db.select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_paymentMethods'");

			if (paymentMethodsResult.length === 0) {
				await this.db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_paymentMethods', ?)`,
					[JSON.stringify(DEFAULT_PAYMENT_METHODS)],
				);
				console.log("Added default payment methods setting");
			}
		} catch (error) {
			console.error("Error ensuring expenses columns:", error);
			throw error;
		}
	}

	private async verifySchema(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			// Verify expenses table has all required columns
			const tableInfo = await this.db.select<Array<{ name: string }>>(
				"PRAGMA table_info(expenses)",
			);

			const columns = new Set(tableInfo.map((col) => col.name));
			const requiredColumns = [
				"id",
				"name",
				"amount",
				"category",
				"dueDate",
				"isRecurring",
				"recurrence",
				"isArchived",
				"isPaid",
				"paymentDate",
				"type",
				"importance",
				"createdAt",
				"updatedAt",
				"parentExpenseId",
				"monthlyOverrides",
				"isModified",
				"initialState",
				"paymentMethod",
			];

			const missingColumns = requiredColumns.filter((col) => !columns.has(col));

			if (missingColumns.length > 0) {
				throw new Error(
					`Schema verification failed. Missing columns in expenses table: ${missingColumns.join(
						", ",
					)}`,
				);
			}

			console.log("Schema verification passed");
		} catch (error) {
			console.error("Schema verification failed:", error);
			throw error;
		}
	}

	// Public API - Notes
	async loadNotes() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadNotes();
	}

	async saveNotes(notes: Note[]) {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.saveNotes(notes);
	}

	async loadFolders() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadFolders();
	}

	async saveFolders(folders: NotesFolders) {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.saveFolders(folders);
	}

	async loadTags() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadTags();
	}

	async saveTags(tags: Record<string, Tag>) {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.saveTags(tags);
	}

	// Public API - Expenses
	async loadExpenses() {
		if (!this.initialized) await this.initialize();
		return this.expensesStorage.loadExpenses();
	}

	async saveExpenses(expenses: AppData["expenses"]) {
		if (!this.initialized) await this.initialize();
		return this.expensesStorage.saveExpenses(expenses);
	}

	// Public API - Income
	async loadIncome() {
		if (!this.initialized) await this.initialize();
		return this.incomeStorage.loadIncome();
	}

	async saveIncome(income: AppData["income"]) {
		if (!this.initialized) await this.initialize();
		return this.incomeStorage.saveIncome(income);
	}

	// Public API - Settings
	async loadSettings(): Promise<AppSettings> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			const results = await this.assertDb().select<
				Array<{ key: string; value: string }>
			>("SELECT key, value FROM settings");

			if (results.length === 0) {
				return DEFAULT_SETTINGS;
			}

			const settings: Record<string, unknown> = {};
			for (const row of results) {
				try {
					settings[row.key] = JSON.parse(row.value);
				} catch {
					settings[row.key] = row.value;
				}
			}

			this.cache.settings = {
				...DEFAULT_SETTINGS,
				...(settings as Partial<AppSettings>),
			};
			return this.cache.settings;
		});
	}

	async saveSettings(settings: AppSettings): Promise<void> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			for (const [key, value] of Object.entries(settings)) {
				await this.assertDb().execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
					[key, JSON.stringify(value)],
				);
			}
			this.cache.settings = settings;
		});
	}

	hasSettingsChanged(settings: AppSettings): boolean {
		if (!this.cache.settings) return true;
		return JSON.stringify(this.cache.settings) !== JSON.stringify(settings);
	}

	// Public API - Theme
	async loadTheme(): Promise<ThemeSettings> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			const results = await this.assertDb().select<
				Array<{ key: string; value: string }>
			>("SELECT key, value FROM settings WHERE key LIKE 'theme_%'");

			if (results.length === 0) {
				this.cache.theme = DEFAULT_THEME_SETTINGS;
				return DEFAULT_THEME_SETTINGS;
			}

			const theme: Record<string, unknown> = {};
			for (const row of results) {
				const key = row.key.replace("theme_", "");
				try {
					theme[key] = JSON.parse(row.value);
				} catch {
					theme[key] = row.value;
				}
			}

			const fullTheme = {
				...DEFAULT_THEME_SETTINGS,
				...(theme as Partial<ThemeSettings>),
			};
			this.cache.theme = fullTheme;
			return fullTheme;
		});
	}

	async saveTheme(theme: ThemeSettings): Promise<void> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			for (const [key, value] of Object.entries(theme)) {
				await this.assertDb().execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
					[`theme_${key}`, JSON.stringify(value)],
				);
			}
			this.cache.theme = theme;
		});
	}

	hasThemeChanged(theme: ThemeSettings): boolean {
		if (!this.cache.theme) return true;
		return JSON.stringify(this.cache.theme) !== JSON.stringify(theme);
	}

	// Metadata
	async loadMetadata(): Promise<AppMetadata> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			const results = await this.assertDb().select<
				Array<{ lastSaved: string; version: string }>
			>("SELECT * FROM metadata WHERE id = 1");

			if (results.length === 0) {
				const defaultMetadata: AppMetadata = {
					lastSaved: new Date(),
					version: DATA_VERSION,
				};
				await this.assertDb().execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[defaultMetadata.lastSaved.toISOString(), defaultMetadata.version],
				);
				return defaultMetadata;
			}

			return {
				lastSaved: new Date(results[0].lastSaved),
				version: results[0].version,
			};
		});
	}

	async saveMetadata(metadata: AppMetadata): Promise<void> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			await this.assertDb().execute(
				`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
				[metadata.lastSaved.toISOString(), metadata.version],
			);
		});
	}

	// Load all data
	async loadData(): Promise<AppData> {
		if (!this.initialized) await this.initialize();

		try {
			const notes = await this.loadNotes();
			const folders = await this.loadFolders();
			const tags = await this.loadTags();
			const expenses = await this.loadExpenses();
			const metadata = await this.loadMetadata();
			const income = await this.loadIncome();
			const settings = await this.loadSettings();
			const theme = await this.loadTheme();

			const subfolders =
				this.notesStorage.extractSubfoldersFromHierarchy(folders);

			return {
				notes,
				notesFolders: folders,
				subfolders,
				tags,
				expenses,
				income,
				settings,
				theme,
				isLoading: false,
				lastSaved: metadata.lastSaved,
				autoSaveEnabled: settings.autoSaveEnabled,
			};
		} catch (error) {
			console.error("Failed to load data:", error);
			return {
				notes: [],
				notesFolders: {},
				subfolders: [],
				tags: {},
				expenses: {
					expenses: [],
					selectedMonth: new Date(),
					overviewMode: "remaining",
					categories: DEFAULT_EXPENSE_CATEGORIES,
					categoryColors: DEFAULT_CATEGORY_COLORS,
					paymentMethods: DEFAULT_PAYMENT_METHODS,
				},
				income: {
					entries: [],
					weeklyTargets: [],
					viewType: "weekly",
				},
				settings: DEFAULT_SETTINGS,
				theme: DEFAULT_THEME_SETTINGS,
				isLoading: false,
				lastSaved: new Date(),
				autoSaveEnabled: DEFAULT_SETTINGS.autoSaveEnabled,
			};
		}
	}

	// Save data with change detection
	async saveData(data: AppData, appToSave: AppToSave): Promise<void> {
		if (!this.initialized) await this.initialize();

		try {
			let hasChanges = false;

			if (appToSave === AppToSave.NotesApp) {
				const notesChanged = this.notesStorage.hasNotesChanged(data.notes);
				const foldersChanged = this.notesStorage.hasFoldersChanged(
					data.notesFolders,
				);
				const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});

				if (notesChanged || foldersChanged || tagsChanged) {
					hasChanges = true;
					if (notesChanged) await this.saveNotes(data.notes);
					if (foldersChanged) await this.saveFolders(data.notesFolders);
					if (tagsChanged) await this.saveTags(data.tags || {});
				}
			} else if (appToSave === AppToSave.Expenses) {
				if (this.expensesStorage.hasExpensesChanged(data.expenses)) {
					hasChanges = true;
					await this.saveExpenses(data.expenses);
				}
			} else if (appToSave === AppToSave.Income) {
				if (this.incomeStorage.hasIncomeChanged(data.income)) {
					hasChanges = true;
					await this.saveIncome(data.income);
				}
			} else if (appToSave === AppToSave.All) {
				const notesChanged = this.notesStorage.hasNotesChanged(data.notes);
				const foldersChanged = this.notesStorage.hasFoldersChanged(
					data.notesFolders,
				);
				const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});
				const expensesChanged = this.expensesStorage.hasExpensesChanged(
					data.expenses,
				);
				const incomeChanged = this.incomeStorage.hasIncomeChanged(data.income);
				const settingsChanged = this.hasSettingsChanged(data.settings);
				const themeChanged = this.hasThemeChanged(data.theme);

				if (
					notesChanged ||
					foldersChanged ||
					tagsChanged ||
					expensesChanged ||
					incomeChanged ||
					settingsChanged ||
					themeChanged
				) {
					hasChanges = true;
					if (notesChanged) await this.saveNotes(data.notes);
					if (foldersChanged) await this.saveFolders(data.notesFolders);
					if (tagsChanged) await this.saveTags(data.tags || {});
					if (expensesChanged) await this.saveExpenses(data.expenses);
					if (incomeChanged) await this.saveIncome(data.income);
					if (settingsChanged) await this.saveSettings(data.settings);
					if (themeChanged) await this.saveTheme(data.theme);
				}
			}

			if (hasChanges) {
				const metadata: AppMetadata = {
					lastSaved: new Date(),
					version: DATA_VERSION,
				};
				await this.saveMetadata(metadata);
			}
		} catch (error) {
			console.error("Failed to save data:", error);
			throw error;
		}
	}

	// Utility methods
	async openDataFolder(): Promise<void> {
		try {
			const { openPath } = await import("@tauri-apps/plugin-opener");
			const path = await this.getDataPath();
			await openPath(path);
		} catch (error) {
			console.error("Failed to open data folder:", error);
		}
	}

	async clearAllData(): Promise<void> {
		if (!this.initialized) await this.initialize();

		await this.queueOperation(async () => {
			await this.assertDb().execute("DELETE FROM notes");
			await this.assertDb().execute("DELETE FROM folders");
			await this.assertDb().execute("DELETE FROM tags");
			await this.assertDb().execute("DELETE FROM expenses");
			await this.assertDb().execute("DELETE FROM income_entries");
			await this.assertDb().execute("DELETE FROM income_weekly_targets");
			await this.assertDb().execute("DELETE FROM settings");
			await this.assertDb().execute("DELETE FROM metadata");
		});

		this.cache = {};
		console.log("All data cleared");
	}

	// Close database connection
	async close(): Promise<void> {
		// Wait for any pending operations to complete
		try {
			await this.operationQueue;
		} catch {
			// Ignore errors from pending operations
		}

		// Reset the operation queue
		this.operationQueue = Promise.resolve();

		if (this.db) {
			try {
				// Flush WAL to ensure all data is written to the main database file
				console.log("Flushing WAL before close...");
				await this.db.execute("PRAGMA wal_checkpoint(TRUNCATE)");

				await this.db.close();
				console.log("Database connection closed");
			} catch (error) {
				console.error("Error closing database:", error);
			}
			this.db = null;
		}

		this.initialized = false;
		this.initializing = false;
		this.cache = {};
	}

	// Switch between production and test environments
	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		console.log(
			`Switching database environment from ${this.currentEnvironment} to: ${environment}`,
		);

		// Always close and reinitialize when switching
		await this.close();
		this.currentEnvironment = environment;
		await this.initialize(environment);
	}

	// Force reinitialize (useful after restore)
	async reinitialize(): Promise<void> {
		console.log("Force reinitializing database...");
		await this.close();
		await this.initialize(this.currentEnvironment);
	}

	// Get current database file path
	async getDatabaseFilePath(): Promise<string> {
		const dataPath = await this.getDataPath();
		return joinPath(dataPath, this.getDatabaseFileName());
	}
}

export const sqlStorage = new SqlStorage();
