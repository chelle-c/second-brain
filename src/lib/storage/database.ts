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
	private db: Database | null = null;
	private appDataPath: string | null = null;
	private operationQueue: Promise<void> = Promise.resolve();
	private cache: StorageCache = {};
	private currentEnvironment: DatabaseEnvironment = "production";
	private environmentInitialized = false;
	private tablesCreated = false;
	private storageInitialized = false;

	// Connection management
	private connectionRefCount = 0;
	private closeTimeout: ReturnType<typeof setTimeout> | null = null;
	private connectionPromise: Promise<void> | null = null;
	private static readonly CLOSE_DELAY_MS = 2000; // Close after 2 seconds of inactivity

	private notesStorage!: NotesStorage;
	private expensesStorage!: ExpensesStorage;
	private incomeStorage!: IncomeStorage;

	private getDb(): Database {
		if (!this.db) {
			throw new Error("Database connection not open");
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

	// Check if connection is currently open
	isOpen(): boolean {
		return this.db !== null;
	}

	// Ensure environment is determined (only needs to happen once)
	private async ensureEnvironment(): Promise<void> {
		if (this.environmentInitialized) return;

		const isDev = await checkIsDevMode();
		this.currentEnvironment = isDev ? "test" : "production";
		this.environmentInitialized = true;
	}

	// Open the database connection
	private async openConnection(): Promise<void> {
		// If already connecting, wait for that to complete
		if (this.connectionPromise) {
			await this.connectionPromise;
			return;
		}

		if (this.db) {
			// Connection already open
			return;
		}

		// Create a promise to track the connection process
		this.connectionPromise = this.doOpenConnection();
		try {
			await this.connectionPromise;
		} finally {
			this.connectionPromise = null;
		}
	}

	private async doOpenConnection(): Promise<void> {
		await this.ensureEnvironment();

		const dataPath = await this.getDataPath();
		const dbFileName = this.getDatabaseFileName();
		const dbPath = joinPath(dataPath, dbFileName);

		console.log(`Opening database connection: ${dbPath}`);
		this.db = await Database.load(`sqlite:${dbPath}`);

		// Use DELETE journal mode instead of WAL for better compatibility with open/close pattern
		await this.db.execute("PRAGMA journal_mode=DELETE");
		await this.db.execute("PRAGMA synchronous=FULL");
		await this.db.execute("PRAGMA busy_timeout=5000");

		// Create tables if needed (only on first connection)
		if (!this.tablesCreated) {
			await this.createTables();
			await this.runMigrations();
			await this.verifySchema();
			this.tablesCreated = true;
		}

		// Initialize storage classes once
		if (!this.storageInitialized) {
			const context = this.getContext();
			this.notesStorage = new NotesStorage(context);
			this.expensesStorage = new ExpensesStorage(context);
			this.incomeStorage = new IncomeStorage(context);
			this.storageInitialized = true;
		}

		console.log(`Database connection opened (${this.currentEnvironment} environment)`);
	}

	// Close the database connection immediately
	private async closeConnectionNow(): Promise<void> {
		if (!this.db) {
			// Connection already closed
			return;
		}

		try {
			await this.db.close();
			console.log("Database connection closed");
		} catch (error) {
			console.error("Error closing database connection:", error);
		}

		this.db = null;
	}

	// Schedule the connection to close after a delay
	private scheduleClose(): void {
		// Cancel any existing close timer
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}

		// Only schedule close if no pending operations
		if (this.connectionRefCount === 0) {
			this.closeTimeout = setTimeout(() => {
				this.closeTimeout = null;
				if (this.connectionRefCount === 0) {
					this.closeConnectionNow();
				}
			}, SqlStorage.CLOSE_DELAY_MS);
		}
	}

	// Execute a function with an open database connection
	// Connection stays open and closes after a period of inactivity
	private async withConnection<T>(fn: () => Promise<T>): Promise<T> {
		// Cancel any pending close
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}

		this.connectionRefCount++;

		try {
			await this.openConnection();
			return await fn();
		} finally {
			this.connectionRefCount--;
			// Schedule delayed close
			this.scheduleClose();
		}
	}

	private queueOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
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
		return {
			getDb: () => this.getDb(),
			queueOperation: this.queueOperation,
			cache: this.cache,
		};
	}

	// Legacy initialize method for backward compatibility
	async initialize(environment?: DatabaseEnvironment): Promise<void> {
		if (environment) {
			this.currentEnvironment = environment;
			this.environmentInitialized = true;
		}
		// Just ensure environment is set, actual connection happens on-demand
		await this.ensureEnvironment();
	}

	private async createTables(): Promise<void> {
		const db = this.getDb();

		// Create notes table with folder field
		await db.execute(`
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
		await db.execute(`
			CREATE TABLE IF NOT EXISTS folders (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				data TEXT NOT NULL
			)
		`);

		// New normalized folders table
		await db.execute(`
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

		await db.execute(`
			CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders_new(parentId)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS tags (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				color TEXT NOT NULL,
				icon TEXT NOT NULL
			)
		`);

		await db.execute(`
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

		await db.execute(`
			CREATE TABLE IF NOT EXISTS income_entries (
				id TEXT PRIMARY KEY,
				date TEXT NOT NULL,
				amount REAL NOT NULL,
				hours INTEGER,
				minutes INTEGER
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS income_weekly_targets (
				id TEXT PRIMARY KEY,
				amount REAL NOT NULL
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS metadata (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				lastSaved TEXT NOT NULL,
				version TEXT NOT NULL
			)
		`);
	}

	private async runMigrations(): Promise<void> {
		const db = this.getDb();

		let currentVersion = "0.0.0";

		try {
			const versionResult = await db.select<Array<{ version: string }>>(
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
				await db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[new Date().toISOString(), DATA_VERSION]
				);
			} catch (error) {
				console.error("Failed to update metadata version:", error);
			}
		}
	}

	private async migrateFoldersTable(): Promise<void> {
		const db = this.getDb();

		try {
			const tables = await db.select<Array<{ name: string }>>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='folders_new'"
			);

			if (tables.length === 0) {
				await db.execute(`
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

				await db.execute(`
					CREATE INDEX idx_folders_parent ON folders_new(parentId)
				`);
			}
		} catch (error) {
			console.error("Error migrating folders table:", error);
			throw error;
		}
	}

	private async migrateNotesTable(): Promise<void> {
		const db = this.getDb();

		try {
			const tableInfo = await db.select<Array<{ name: string }>>(
				"PRAGMA table_info(notes)"
			);

			const columnNames = tableInfo.map((col) => col.name);

			const hasOldColumn = columnNames.includes("folderId");
			const hasNewColumn = columnNames.includes("folder");

			if (hasOldColumn && !hasNewColumn) {
				await db.execute(`
					ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'
				`);

				await db.execute(`
					UPDATE notes SET folder = COALESCE(folderId, 'inbox')
				`);
			} else if (!hasNewColumn) {
				await db.execute(`
					ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'
				`);
			}

			await db.execute(`
				UPDATE notes SET folder = 'inbox'
				WHERE folder IS NULL OR folder = '' OR TRIM(folder) = ''
			`);
		} catch (error) {
			console.error("Error migrating notes table:", error);
			throw error;
		}
	}

	private async ensureExpensesColumns(): Promise<void> {
		const db = this.getDb();

		try {
			const tableInfo = await db.select<Array<{ name: string; type: string }>>(
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
						await db.execute(
							`ALTER TABLE expenses ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`
						);
					} catch (alterError) {
						console.error(`Failed to add column ${column.name}:`, alterError);
						throw alterError;
					}
				}
			}

			const paymentMethodsResult = await db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_paymentMethods'"
			);

			if (paymentMethodsResult.length === 0) {
				await db.execute(
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
		const db = this.getDb();

		try {
			const tableInfo = await db.select<Array<{ name: string }>>(
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
		return this.withConnection(async () => {
			return this.notesStorage.loadNotes();
		});
	}

	async saveNotes(notes: Note[]) {
		return this.withConnection(async () => {
			return this.notesStorage.saveNotes(notes);
		});
	}

	async loadFolders() {
		return this.withConnection(async () => {
			return this.notesStorage.loadFolders();
		});
	}

	async saveFolders(folders: Folder[]) {
		return this.withConnection(async () => {
			return this.notesStorage.saveFolders(folders);
		});
	}

	async loadTags() {
		return this.withConnection(async () => {
			return this.notesStorage.loadTags();
		});
	}

	async saveTags(tags: Record<string, Tag>) {
		return this.withConnection(async () => {
			return this.notesStorage.saveTags(tags);
		});
	}

	// Public API - Expenses
	async loadExpenses() {
		return this.withConnection(async () => {
			return this.expensesStorage.loadExpenses();
		});
	}

	async saveExpenses(expenses: AppData["expenses"]) {
		return this.withConnection(async () => {
			return this.expensesStorage.saveExpenses(expenses);
		});
	}

	// Public API - Income
	async loadIncome() {
		return this.withConnection(async () => {
			return this.incomeStorage.loadIncome();
		});
	}

	async saveIncome(income: AppData["income"]) {
		return this.withConnection(async () => {
			return this.incomeStorage.saveIncome(income);
		});
	}

	// Public API - Settings
	async loadSettings(): Promise<AppSettings> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<Array<{ key: string; value: string }>>(
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
		});
	}

	async saveSettings(settings: AppSettings): Promise<void> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				for (const [key, value] of Object.entries(settings)) {
					await db.execute(
						`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
						[key, JSON.stringify(value)]
					);
				}
				this.cache.settings = settings;
			});
		});
	}

	hasSettingsChanged(settings: AppSettings): boolean {
		if (!this.cache.settings) return true;
		return JSON.stringify(this.cache.settings) !== JSON.stringify(settings);
	}

	// Public API - Theme
	async loadTheme(): Promise<ThemeSettings> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<Array<{ key: string; value: string }>>(
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
		});
	}

	async saveTheme(theme: ThemeSettings): Promise<void> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				for (const [key, value] of Object.entries(theme)) {
					await db.execute(
						`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
						[`theme_${key}`, JSON.stringify(value)]
					);
				}
				this.cache.theme = theme;
			});
		});
	}

	hasThemeChanged(theme: ThemeSettings): boolean {
		if (!this.cache.theme) return true;
		return JSON.stringify(this.cache.theme) !== JSON.stringify(theme);
	}

	// Metadata
	async loadMetadata(): Promise<AppMetadata> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<
					Array<{ lastSaved: string; version: string }>
				>("SELECT * FROM metadata WHERE id = 1");

				if (results.length === 0) {
					const defaultMetadata: AppMetadata = {
						lastSaved: new Date(),
						version: DATA_VERSION,
					};
					await db.execute(
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
		});
	}

	async saveMetadata(metadata: AppMetadata): Promise<void> {
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				await db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[metadata.lastSaved.toISOString(), metadata.version]
				);
			});
		});
	}

	// Load all data with retry logic
	async loadData(retryCount = 0): Promise<AppData> {
		const MAX_RETRIES = 2;
		const RETRY_DELAY_MS = 500;

		return this.withConnection(async () => {
			try {
				const notes = await this.notesStorage.loadNotes();
				const folders = await this.notesStorage.loadFolders();
				const tags = await this.notesStorage.loadTags();
				const expenses = await this.expensesStorage.loadExpenses();
				const income = await this.incomeStorage.loadIncome();

				// Load settings inline
				const settingsResults = await this.getDb().select<Array<{ key: string; value: string }>>(
					"SELECT key, value FROM settings"
				);
				const settingsObj: Record<string, unknown> = {};
				for (const row of settingsResults) {
					try {
						settingsObj[row.key] = JSON.parse(row.value);
					} catch {
						settingsObj[row.key] = row.value;
					}
				}
				const settings = { ...DEFAULT_SETTINGS, ...(settingsObj as Partial<AppSettings>) };
				this.cache.settings = settings;

				// Load theme inline
				const themeResults = await this.getDb().select<Array<{ key: string; value: string }>>(
					"SELECT key, value FROM settings WHERE key LIKE 'theme_%'"
				);
				const themeObj: Record<string, unknown> = {};
				for (const row of themeResults) {
					const key = row.key.replace("theme_", "");
					try {
						themeObj[key] = JSON.parse(row.value);
					} catch {
						themeObj[key] = row.value;
					}
				}
				const theme = { ...DEFAULT_THEME_SETTINGS, ...(themeObj as Partial<ThemeSettings>) };
				this.cache.theme = theme;

				// Load metadata inline
				const metadataResults = await this.getDb().select<
					Array<{ lastSaved: string; version: string }>
				>("SELECT * FROM metadata WHERE id = 1");
				const metadata = metadataResults.length > 0
					? { lastSaved: new Date(metadataResults[0].lastSaved), version: metadataResults[0].version }
					: { lastSaved: new Date(), version: DATA_VERSION };

				// Check if folders loaded correctly (should always have at least initial folders)
				if (folders.length === 0 && retryCount < MAX_RETRIES) {
					console.warn(
						`Data load returned empty folders (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying...`
					);
					// Close connection before retry
					await this.closeConnectionNow();
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
					// Close connection before retry
					await this.closeConnectionNow();
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
		});
	}

	// Save data with change detection
	async saveData(data: AppData, appToSave: AppToSave): Promise<void> {
		return this.withConnection(async () => {
			try {
				let hasChanges = false;

				if (appToSave === AppToSave.NotesApp) {
					const notesChanged = this.notesStorage.hasNotesChanged(data.notes);
					const foldersChanged = this.notesStorage.hasFoldersChanged(data.folders);
					const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});

					if (notesChanged || foldersChanged || tagsChanged) {
						hasChanges = true;
						if (notesChanged) await this.notesStorage.saveNotes(data.notes);
						if (foldersChanged) await this.notesStorage.saveFolders(data.folders);
						if (tagsChanged) await this.notesStorage.saveTags(data.tags || {});
					}
				} else if (appToSave === AppToSave.Expenses) {
					if (this.expensesStorage.hasExpensesChanged(data.expenses)) {
						hasChanges = true;
						await this.expensesStorage.saveExpenses(data.expenses);
					}
				} else if (appToSave === AppToSave.Income) {
					if (this.incomeStorage.hasIncomeChanged(data.income)) {
						hasChanges = true;
						await this.incomeStorage.saveIncome(data.income);
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
						if (notesChanged) await this.notesStorage.saveNotes(data.notes);
						if (foldersChanged) await this.notesStorage.saveFolders(data.folders);
						if (tagsChanged) await this.notesStorage.saveTags(data.tags || {});
						if (expensesChanged) await this.expensesStorage.saveExpenses(data.expenses);
						if (incomeChanged) await this.incomeStorage.saveIncome(data.income);
						if (settingsChanged) {
							const db = this.getDb();
							for (const [key, value] of Object.entries(data.settings)) {
								await db.execute(
									`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
									[key, JSON.stringify(value)]
								);
							}
							this.cache.settings = data.settings;
						}
						if (themeChanged) {
							const db = this.getDb();
							for (const [key, value] of Object.entries(data.theme)) {
								await db.execute(
									`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
									[`theme_${key}`, JSON.stringify(value)]
								);
							}
							this.cache.theme = data.theme;
						}
					}
				}

				if (hasChanges) {
					const metadata: AppMetadata = {
						lastSaved: new Date(),
						version: DATA_VERSION,
					};
					const db = this.getDb();
					await db.execute(
						`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
						[metadata.lastSaved.toISOString(), metadata.version]
					);
				}
			} catch (error) {
				console.error("Failed to save data:", error);
				throw error;
			}
		});
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
		return this.withConnection(async () => {
			return this.queueOperation(async () => {
				const db = this.getDb();
				await db.execute("DELETE FROM notes");
				await db.execute("DELETE FROM folders");
				await db.execute("DELETE FROM folders_new");
				await db.execute("DELETE FROM tags");
				await db.execute("DELETE FROM expenses");
				await db.execute("DELETE FROM income_entries");
				await db.execute("DELETE FROM income_weekly_targets");
				await db.execute("DELETE FROM settings");
				await db.execute("DELETE FROM metadata");

				// Clear cache
				this.cache = {};
			});
		});
	}

	// Checkpoint method - no longer needed with DELETE journal mode
	// Kept for backward compatibility, does nothing
	async checkpoint(): Promise<void> {
		// No-op - DELETE journal mode doesn't use WAL files
		console.log("Checkpoint called (no-op with DELETE journal mode)");
	}

	// Close method - ensures connection is closed
	async close(): Promise<void> {
		// Cancel any pending close timer
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}

		// Wait for any pending operations to complete
		try {
			await this.operationQueue;
		} catch {
			// Ignore errors from pending operations
		}

		// Wait for any pending connection to complete
		if (this.connectionPromise) {
			try {
				await this.connectionPromise;
			} catch {
				// Ignore connection errors
			}
		}

		this.operationQueue = Promise.resolve();
		this.connectionRefCount = 0;
		await this.closeConnectionNow();
	}

	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		await this.close();
		this.currentEnvironment = environment;
		this.environmentInitialized = true;
		this.tablesCreated = false; // Force table check on next connection
		this.storageInitialized = false; // Force storage class re-initialization
	}

	async reinitialize(): Promise<void> {
		await this.close();
		this.tablesCreated = false; // Force table check on next connection
		this.storageInitialized = false; // Force storage class re-initialization
	}

	async getDatabaseFilePath(): Promise<string> {
		await this.ensureEnvironment();
		const dataPath = await this.getDataPath();
		return joinPath(dataPath, this.getDatabaseFileName());
	}

	// Check if database is currently initialized (connection could be open)
	isInitialized(): boolean {
		return this.environmentInitialized;
	}
}

export const sqlStorage = new SqlStorage();
