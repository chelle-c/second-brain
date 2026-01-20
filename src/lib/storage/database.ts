import { invoke } from "@tauri-apps/api/core";
import { appDataDir, sep } from "@tauri-apps/api/path";
import Database from "@tauri-apps/plugin-sql";
import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
import { type AppData, type AppMetadata, AppToSave } from "@/types";
import type { DatabaseEnvironment } from "@/types/backup";
import type { Folder, Note, Tag } from "@/types/notes";
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
	private initPromise: Promise<void> | null = null;
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
		return this.currentEnvironment === "production" ? DB_NAME_PRODUCTION : DB_NAME_TEST;
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

	private queueOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
		// Ensure database is initialized before any operation
		if (!this.initialized) {
			await this.initialize();
		}

		const timeoutPromise = new Promise<T>((_, reject) => {
			setTimeout(
				() => reject(new Error("Database operation timeout after 10 seconds")),
				10000
			);
		});

		const operationPromise = this.operationQueue.then(operation).catch((error) => {
			console.error("Database operation failed:", error);
			throw error;
		});

		const result = Promise.race([operationPromise, timeoutPromise]);

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
		// If already initializing, wait for the existing promise
		if (this.initPromise) {
			return this.initPromise;
		}

		// If environment is specified and different from current, force re-initialization
		if (environment && environment !== this.currentEnvironment && this.initialized) {
			await this.close();
		}

		if (this.initialized && this.db) {
			return;
		}

		this.initPromise = this._doInitialize(environment);

		try {
			await this.initPromise;
		} finally {
			this.initPromise = null;
		}
	}

	private async _doInitialize(environment?: DatabaseEnvironment): Promise<void> {

		try {
			if (!environment) {
				const isDev = await checkIsDevMode();
				this.currentEnvironment = isDev ? "test" : "production";
			} else {
				this.currentEnvironment = environment;
			}

			const dataPath = await this.getDataPath();
			const dbFileName = this.getDatabaseFileName();
			const dbPath = joinPath(dataPath, dbFileName);

			console.log(`Connecting to database: ${dbPath}`);
			this.db = await Database.load(`sqlite:${dbPath}`);

			await this.db.execute("PRAGMA journal_mode=WAL");
			await this.db.execute("PRAGMA synchronous=NORMAL");
			await this.db.execute("PRAGMA busy_timeout=5000");

			await this.createTables();
			await this.runMigrations();
			await this.verifySchema();

			this.notesStorage = new NotesStorage(this.getContext());
			this.expensesStorage = new ExpensesStorage(this.getContext());
			this.incomeStorage = new IncomeStorage(this.getContext());

			this.initialized = true;
			console.log(
				`Database initialized (${this.currentEnvironment} environment, file: ${dbFileName}, version: ${DATA_VERSION})`
			);
		} catch (error) {
			console.error("Failed to initialize database:", error);
			this.initialized = false;
			this.db = null;
			throw error;
		} finally {
		}
	}

	private async createTables(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		// Create notes table with folder field
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS notes (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				tags TEXT DEFAULT '[]',
				folder TEXT NOT NULL DEFAULT 'inbox',
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				archived INTEGER DEFAULT 0
			)
		`);

		// Legacy folders table (single row JSON)
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS folders (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				data TEXT NOT NULL
			)
		`);

		// New normalized folders table
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS folders_new (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				parentId TEXT,
				icon TEXT,
				archived INTEGER DEFAULT 0,
				\`order\` INTEGER DEFAULT 0,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				FOREIGN KEY (parentId) REFERENCES folders_new(id) ON DELETE CASCADE
			)
		`);

		await this.db.execute(`
			CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders_new(parentId)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS tags (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				color TEXT NOT NULL,
				icon TEXT NOT NULL
			)
		`);

		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS expenses (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				amount REAL NOT NULL,
				category TEXT NOT NULL,
				paymentMethod TEXT DEFAULT 'None',
				dueDate TEXT,
				isRecurring INTEGER NOT NULL,
				recurrence TEXT,
				isArchived INTEGER NOT NULL,
				isPaid INTEGER NOT NULL,
				paymentDate TEXT,
				type TEXT NOT NULL,
				importance TEXT NOT NULL,
				notify INTEGER DEFAULT 0,
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

		let currentVersion = "0.0.0";

		try {
			const versionResult = await this.db.select<Array<{ version: string }>>(
				"SELECT version FROM metadata WHERE id = 1"
			);
			if (versionResult.length > 0 && versionResult[0].version) {
				currentVersion = versionResult[0].version;
			}
		} catch (_) {
			// No metadata found, assuming version 0.0.0
		}

		await this.ensureExpensesColumns();
		await this.migrateFoldersTable();
		await this.migrateNotesTable();

		if (currentVersion !== DATA_VERSION) {
			try {
				await this.db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[new Date().toISOString(), DATA_VERSION]
				);
			} catch (error) {
				console.error("Failed to update metadata version:", error);
			}
		}
	}

	private async migrateFoldersTable(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			const tables = await this.db.select<Array<{ name: string }>>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='folders_new'"
			);

			if (tables.length === 0) {
				await this.db.execute(`
					CREATE TABLE folders_new (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL,
						parentId TEXT,
						icon TEXT,
						archived INTEGER DEFAULT 0,
						\`order\` INTEGER DEFAULT 0,
						createdAt TEXT NOT NULL,
						updatedAt TEXT NOT NULL,
						FOREIGN KEY (parentId) REFERENCES folders_new(id) ON DELETE CASCADE
					)
				`);

				await this.db.execute(`
					CREATE INDEX idx_folders_parent ON folders_new(parentId)
				`);
			}
		} catch (error) {
			console.error("Error migrating folders table:", error);
			throw error;
		}
	}

	private async migrateNotesTable(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			const tableInfo = await this.db.select<Array<{ name: string }>>(
				"PRAGMA table_info(notes)"
			);

			const columnNames = tableInfo.map((col) => col.name);

			const hasOldColumn = columnNames.includes("folderId");
			const hasNewColumn = columnNames.includes("folder");

			if (hasOldColumn && !hasNewColumn) {
				await this.db.execute(`
					ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'
				`);

				await this.db.execute(`
					UPDATE notes SET folder = COALESCE(folderId, 'inbox')
				`);
			} else if (!hasNewColumn) {
				await this.db.execute(`
					ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'
				`);
			}

			await this.db.execute(`
				UPDATE notes SET folder = 'inbox'
				WHERE folder IS NULL OR folder = '' OR TRIM(folder) = ''
			`);
		} catch (error) {
			console.error("Error migrating notes table:", error);
			throw error;
		}
	}

	private async ensureExpensesColumns(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			const tableInfo = await this.db.select<Array<{ name: string; type: string }>>(
				"PRAGMA table_info(expenses)"
			);

			const existingColumns = new Set(tableInfo.map((col) => col.name));

			const requiredColumns: Array<{
				name: string;
				type: string;
				defaultValue: string;
			}> = [
				{ name: "paymentMethod", type: "TEXT", defaultValue: "'None'" },
				{ name: "notify", type: "INTEGER", defaultValue: "0" },
			];

			for (const column of requiredColumns) {
				if (!existingColumns.has(column.name)) {
					try {
						await this.db.execute(
							`ALTER TABLE expenses ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
						);
					} catch (alterError) {
						console.error(`Failed to add column ${column.name}:`, alterError);
						throw alterError;
					}
				}
			}

			const paymentMethodsResult = await this.db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_paymentMethods'"
			);

			if (paymentMethodsResult.length === 0) {
				await this.db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_paymentMethods', ?)`,
					[JSON.stringify(DEFAULT_PAYMENT_METHODS)]
				);
			}
		} catch (error) {
			console.error("Error ensuring expenses columns:", error);
			throw error;
		}
	}

	private async verifySchema(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		try {
			const tableInfo = await this.db.select<Array<{ name: string }>>(
				"PRAGMA table_info(expenses)"
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
						", "
					)}`
				);
			}
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

	async saveFolders(folders: Folder[]) {
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
			const results = await this.assertDb().select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings"
			);

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
					[key, JSON.stringify(value)]
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
			const results = await this.assertDb().select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings WHERE key LIKE 'theme_%'"
			);

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
					[`theme_${key}`, JSON.stringify(value)]
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
					[defaultMetadata.lastSaved.toISOString(), defaultMetadata.version]
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
				[metadata.lastSaved.toISOString(), metadata.version]
			);
		});
	}

	// Verify database connection is working
	private async verifyConnection(): Promise<boolean> {
		try {
			const result = await this.assertDb().select<Array<{ test: number }>>(
				"SELECT 1 as test"
			);
			return result.length > 0 && result[0].test === 1;
		} catch (error) {
			console.error("Database connection verification failed:", error);
			return false;
		}
	}

	// Load all data with retry logic
	async loadData(retryCount = 0): Promise<AppData> {
		const MAX_RETRIES = 2;
		const RETRY_DELAY_MS = 500;

		if (!this.initialized) await this.initialize();

		// Verify connection before loading
		const isConnected = await this.verifyConnection();
		if (!isConnected) {
			console.warn("Database connection verification failed, attempting to reinitialize...");
			this.initialized = false;
			await this.initialize();
		}

		try {
			const notes = await this.loadNotes();
			const folders = await this.loadFolders();
			const tags = await this.loadTags();
			const expenses = await this.loadExpenses();
			const metadata = await this.loadMetadata();
			const income = await this.loadIncome();
			const settings = await this.loadSettings();
			const theme = await this.loadTheme();

			// Check if folders loaded correctly (should always have at least initial folders)
			// If folders are empty, this likely indicates a loading issue - retry
			if (folders.length === 0 && retryCount < MAX_RETRIES) {
				console.warn(
					`Data load returned empty folders (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying...`
				);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
				return this.loadData(retryCount + 1);
			}

			return {
				notes,
				folders,
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

			// Retry on failure
			if (retryCount < MAX_RETRIES) {
				console.warn(
					`Data load failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying...`
				);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
				return this.loadData(retryCount + 1);
			}

			return {
				notes: [],
				folders: [],
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
				const foldersChanged = this.notesStorage.hasFoldersChanged(data.folders);
				const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});

				if (notesChanged || foldersChanged || tagsChanged) {
					hasChanges = true;
					if (notesChanged) await this.saveNotes(data.notes);
					if (foldersChanged) await this.saveFolders(data.folders);
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
				const foldersChanged = this.notesStorage.hasFoldersChanged(data.folders);
				const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});
				const expensesChanged = this.expensesStorage.hasExpensesChanged(data.expenses);
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
					if (foldersChanged) await this.saveFolders(data.folders);
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

		return this.queueOperation(async () => {
			await this.assertDb().execute("DELETE FROM notes");
			await this.assertDb().execute("DELETE FROM folders");
			await this.assertDb().execute("DELETE FROM folders_new");
			await this.assertDb().execute("DELETE FROM tags");
			await this.assertDb().execute("DELETE FROM expenses");
			await this.assertDb().execute("DELETE FROM income_entries");
			await this.assertDb().execute("DELETE FROM income_weekly_targets");
			await this.assertDb().execute("DELETE FROM settings");
			await this.assertDb().execute("DELETE FROM metadata");

			// Clear cache
			this.cache = {};
		});
	}

	// Checkpoint the WAL file without closing the database
	// Useful when minimizing to tray to ensure data is persisted
	async checkpoint(): Promise<void> {
		if (!this.db || !this.initialized) return;

		try {
			await this.operationQueue;
			await this.db.execute("PRAGMA wal_checkpoint(PASSIVE)");
			console.log("Database checkpoint completed");
		} catch (error) {
			console.error("Error during database checkpoint:", error);
		}
	}

	async close(): Promise<void> {
		// Wait for any pending operations to complete
		try {
			await this.operationQueue;
		} catch {
			// Ignore errors from pending operations
		}

		this.operationQueue = Promise.resolve();

		if (this.db) {
			try {
				await this.db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
				await this.db.close();
			} catch (error) {
				console.error("Error closing database:", error);
			}
			this.db = null;
		}

		this.initialized = false;
		this.initPromise = null;
		this.cache = {};
	}

	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		await this.close();
		this.currentEnvironment = environment;
		await this.initialize(environment);
	}

	async reinitialize(): Promise<void> {
		await this.close();
		await this.initialize(this.currentEnvironment);
	}

	async getDatabaseFilePath(): Promise<string> {
		const dataPath = await this.getDataPath();
		return joinPath(dataPath, this.getDatabaseFileName());
	}

	isInitialized(): boolean {
		return this.initialized && this.db !== null;
	}
}

export const sqlStorage = new SqlStorage();
