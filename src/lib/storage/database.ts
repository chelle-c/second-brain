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
import { localStorageCache } from "./localStorageCache";
import { ExpensesStorage } from "./expensesStorage";
import { IncomeStorage } from "./incomeStorage";
import { NotesStorage } from "./notesStorage";

const DB_NAME_PRODUCTION = "appdata.db";
const DB_NAME_TEST = "appdata-test.db";

const joinPath = (...parts: string[]): string => parts.join(sep());

const checkIsDevMode = async (): Promise<boolean> => {
	try {
		return await invoke<boolean>("is_dev");
	} catch {
		return false;
	}
};

/**
 * Exponential back-off retry for transient SQLite errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4, baseDelayMs = 150): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			const msg = String(err).toLowerCase();
			if (!msg.includes("locked") && !msg.includes("busy")) throw err;
			const delay = baseDelayMs * 2 ** attempt + Math.random() * 50;
			console.warn(
				`DB locked (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(delay)}ms…`,
			);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	throw lastError;
}

class SqlStorage {
	private db: Database | null = null;
	private appDataPath: string | null = null;
	private cache: StorageCache = {};
	private currentEnvironment: DatabaseEnvironment = "production";
	private environmentInitialized = false;
	private tablesCreated = false;

	private notesStorage!: NotesStorage;
	private expensesStorage!: ExpensesStorage;
	private incomeStorage!: IncomeStorage;

	/**
	 * Global connection-level gate.
	 *
	 * Every call that needs the database is chained onto this promise.
	 * This means:
	 *   - Operations are strictly serialised – no two calls can hold the
	 *     connection at the same time.
	 *   - A "close" that is in-flight will block the next caller until it
	 *     finishes, so the caller always finds a clean, closed connection
	 *     that it can safely open.
	 *   - No separate "isClosing" flag or ref-counting is needed; the queue
	 *     itself acts as the mutex.
	 */
	private gate: Promise<void> = Promise.resolve();

	// Idle-close timer
	private closeTimeout: ReturnType<typeof setTimeout> | null = null;
	private static readonly CLOSE_DELAY_MS = 5000;

	// ── Helpers ──────────────────────────────────────────────────────────────

	private getDb(): Database {
		if (!this.db) throw new Error("Database connection not open");
		return this.db;
	}

	private getDatabaseFileName(): string {
		return this.currentEnvironment === "production" ? DB_NAME_PRODUCTION : DB_NAME_TEST;
	}

	getCurrentEnvironment(): DatabaseEnvironment {
		return this.currentEnvironment;
	}

	async getDataPath(): Promise<string> {
		if (!this.appDataPath) this.appDataPath = await appDataDir();
		return this.appDataPath;
	}

	isOpen(): boolean {
		return this.db !== null;
	}

	// ── Environment ──────────────────────────────────────────────────────────

	private async ensureEnvironment(): Promise<void> {
		if (this.environmentInitialized) return;
		const isDev = await checkIsDevMode();
		this.currentEnvironment = isDev ? "test" : "production";
		this.environmentInitialized = true;
	}

	// ── Connection management ────────────────────────────────────────────────

	private async openConnection(): Promise<void> {
		// Already open – nothing to do
		if (this.db) return;

		await this.ensureEnvironment();
		const dataPath = await this.getDataPath();
		const dbPath = joinPath(dataPath, this.getDatabaseFileName());

		console.log(`Opening database: ${dbPath}`);
		this.db = await Database.load(`sqlite:${dbPath}`);

		await this.db.execute("PRAGMA journal_mode=WAL");
		await this.db.execute("PRAGMA synchronous=NORMAL");
		await this.db.execute("PRAGMA busy_timeout=30000");

		if (!this.tablesCreated) {
			await this.createTables();
			await this.runMigrations();
			await this.verifySchema();
			this.tablesCreated = true;
		}

		this.rebuildStorageHelpers();
		console.log(`DB open (${this.currentEnvironment})`);
	}

	private async closeConnectionNow(): Promise<void> {
		if (!this.db) return;
		try {
			try {
				await this.db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
			} catch {
				// Ignore checkpoint errors
			}
			await this.db.close();
			console.log("Database connection closed");
		} catch (error) {
			console.error("Error closing database:", error);
		}
		this.db = null;
	}

	/**
	 * Cancel any pending idle-close and schedule a fresh one.
	 * Called after every operation completes.
	 */
	private rescheduleClose(): void {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}
		this.closeTimeout = setTimeout(() => {
			this.closeTimeout = null;
			// Chain the close onto the gate so it cannot race with any queued work
			this.gate = this.gate.then(() => this.closeConnectionNow());
		}, SqlStorage.CLOSE_DELAY_MS);
	}

	/**
	 * Run `fn` inside an open connection, serialised through the global gate.
	 *
	 * The gate ensures:
	 *   1. Any in-flight close finishes before we open again.
	 *   2. Concurrent callers are queued and run one at a time.
	 */
	private withConnection<T>(fn: () => Promise<T>): Promise<T> {
		// Chain onto the gate; each call waits for the previous to complete
		const result = this.gate.then(async () => {
			// Cancel idle-close because we are about to use the connection
			if (this.closeTimeout) {
				clearTimeout(this.closeTimeout);
				this.closeTimeout = null;
			}

			await this.openConnection();

			try {
				return await fn();
			} finally {
				// Reschedule idle-close after each operation
				this.rescheduleClose();
			}
		});

		// Advance the gate, swallowing errors so a failing call doesn't
		// permanently break the queue for subsequent callers
		this.gate = result.then(
			() => {},
			() => {},
		);

		return result;
	}

	/**
	 * Serialise individual DB statements within a connection.
	 * Wrapped with retry logic for transient lock errors.
	 */
	private queueOperation = <T>(operation: () => Promise<T>): Promise<T> => {
		return withRetry(operation);
	};

	private rebuildStorageHelpers(): void {
		const context = this.getContext();
		this.notesStorage = new NotesStorage(context);
		this.expensesStorage = new ExpensesStorage(context);
		this.incomeStorage = new IncomeStorage(context);
	}

	private getContext(): DatabaseContext {
		return {
			getDb: () => this.getDb(),
			queueOperation: this.queueOperation,
			cache: this.cache,
		};
	}

	// ── Public initialise ────────────────────────────────────────────────────

	async initialize(environment?: DatabaseEnvironment): Promise<void> {
		if (environment) {
			this.currentEnvironment = environment;
			this.environmentInitialized = true;
		}
		await this.ensureEnvironment();
	}

	// ── Schema ───────────────────────────────────────────────────────────────

	private async createTables(): Promise<void> {
		const db = this.getDb();

		await db.execute(`
			CREATE TABLE IF NOT EXISTS notes (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				content TEXT NOT NULL,
				tags TEXT DEFAULT '[]',
				folder TEXT NOT NULL DEFAULT 'inbox',
				reminder TEXT DEFAULT NULL,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL,
				archived INTEGER DEFAULT 0
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS folders (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				data TEXT NOT NULL
			)
		`);

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
				amountData TEXT,
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
				initialState TEXT,
				subscriptionStatus TEXT
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
				"SELECT version FROM metadata WHERE id = 1",
			);
			if (versionResult.length > 0 && versionResult[0].version) {
				currentVersion = versionResult[0].version;
			}
		} catch {
			// No metadata row yet
		}

		await this.ensureExpensesColumns();
		await this.migrateFoldersTable();
		await this.migrateNotesTable();
		await this.migrateNotesReminders();

		if (currentVersion !== DATA_VERSION) {
			try {
				await db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[new Date().toISOString(), DATA_VERSION],
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
				"SELECT name FROM sqlite_master WHERE type='table' AND name='folders_new'",
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
			const tableInfo = await db.select<Array<{ name: string }>>("PRAGMA table_info(notes)");
			const columnNames = tableInfo.map((col) => col.name);
			if (columnNames.includes("folderId") && !columnNames.includes("folder")) {
				await db.execute(`ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'`);
				await db.execute(`UPDATE notes SET folder = COALESCE(folderId, 'inbox')`);
			} else if (!columnNames.includes("folder")) {
				await db.execute(`ALTER TABLE notes ADD COLUMN folder TEXT DEFAULT 'inbox'`);
			}
			await db.execute(
				`UPDATE notes SET folder = 'inbox' WHERE folder IS NULL OR TRIM(folder) = ''`,
			);
		} catch (error) {
			console.error("Error migrating notes table:", error);
			throw error;
		}
	}

	private async migrateNotesReminders(): Promise<void> {
		const db = this.getDb();
		try {
			const tableInfo = await db.select<Array<{ name: string }>>("PRAGMA table_info(notes)");
			if (!tableInfo.some((col) => col.name === "reminder")) {
				await db.execute(`ALTER TABLE notes ADD COLUMN reminder TEXT DEFAULT NULL`);
				console.log("Migration: added 'reminder' column to notes");
			}
		} catch (error) {
			console.error("Error migrating notes reminder column:", error);
			throw error;
		}
	}

	private async ensureExpensesColumns(): Promise<void> {
		const db = this.getDb();
		try {
			const tableInfo = await db.select<Array<{ name: string; type: string }>>(
				"PRAGMA table_info(expenses)",
			);
			const existingColumns = new Set(tableInfo.map((col) => col.name));

			const requiredColumns = [
				{ name: "paymentMethod", type: "TEXT", defaultValue: "'None'" },
				{ name: "notify", type: "INTEGER", defaultValue: "0" },
				{ name: "amountData", type: "TEXT", defaultValue: "NULL" },
				{ name: "subscriptionStatus", type: "TEXT", defaultValue: "NULL" },
			];

			for (const column of requiredColumns) {
				if (!existingColumns.has(column.name)) {
					await db.execute(
						`ALTER TABLE expenses ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`,
					);
				}
			}

			const pmResult = await db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_paymentMethods'",
			);
			if (pmResult.length === 0) {
				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_paymentMethods', ?)`,
					[JSON.stringify(DEFAULT_PAYMENT_METHODS)],
				);
			}
		} catch (error) {
			console.error("Error ensuring expenses columns:", error);
			throw error;
		}
	}

	private async verifySchema(): Promise<void> {
		const db = this.getDb();
		const tableInfo = await db.select<Array<{ name: string }>>("PRAGMA table_info(expenses)");
		const columns = new Set(tableInfo.map((col) => col.name));
		const required = [
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
		const missing = required.filter((c) => !columns.has(c));
		if (missing.length > 0) {
			throw new Error(`Schema verification failed. Missing columns: ${missing.join(", ")}`);
		}
	}

	// ── Public API — Notes ───────────────────────────────────────────────────

	async loadNotes() {
		return this.withConnection(() => this.notesStorage.loadNotes());
	}
	async saveNotes(notes: Note[]) {
		return this.withConnection(() => this.notesStorage.saveNotes(notes));
	}
	async loadFolders() {
		return this.withConnection(() => this.notesStorage.loadFolders());
	}
	async saveFolders(folders: Folder[]) {
		return this.withConnection(() => this.notesStorage.saveFolders(folders));
	}
	async loadTags() {
		return this.withConnection(() => this.notesStorage.loadTags());
	}
	async saveTags(tags: Record<string, Tag>) {
		return this.withConnection(() => this.notesStorage.saveTags(tags));
	}

	// ── Public API — Expenses ────────────────────────────────────────────────

	async loadExpenses() {
		return this.withConnection(() => this.expensesStorage.loadExpenses());
	}
	async saveExpenses(expenses: AppData["expenses"]) {
		return this.withConnection(() => this.expensesStorage.saveExpenses(expenses));
	}

	// ── Public API — Income ──────────────────────────────────────────────────

	async loadIncome() {
		return this.withConnection(() => this.incomeStorage.loadIncome());
	}
	async saveIncome(income: AppData["income"]) {
		return this.withConnection(() => this.incomeStorage.saveIncome(income));
	}

	// ── Public API — Settings ────────────────────────────────────────────────

	async loadSettings(): Promise<AppSettings> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<Array<{ key: string; value: string }>>(
					"SELECT key, value FROM settings",
				);
				if (results.length === 0) return DEFAULT_SETTINGS;
				const settings: Record<string, unknown> = {};
				for (const row of results) {
					try {
						settings[row.key] = JSON.parse(row.value);
					} catch {
						settings[row.key] = row.value;
					}
				}
				const merged = {
					...DEFAULT_SETTINGS,
					...(settings as Partial<AppSettings>),
				};
				this.cache.settings = merged;
				return merged;
			}),
		);
	}

	async saveSettings(settings: AppSettings): Promise<void> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				for (const [key, value] of Object.entries(settings)) {
					await db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [
						key,
						JSON.stringify(value),
					]);
				}
				this.cache.settings = settings;
			}),
		);
	}

	hasSettingsChanged(settings: AppSettings): boolean {
		if (!this.cache.settings) return true;
		return JSON.stringify(this.cache.settings) !== JSON.stringify(settings);
	}

	// ── Public API — Theme ───────────────────────────────────────────────────

	async loadTheme(): Promise<ThemeSettings> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<Array<{ key: string; value: string }>>(
					"SELECT key, value FROM settings WHERE key LIKE 'theme_%'",
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
			}),
		);
	}

	async saveTheme(theme: ThemeSettings): Promise<void> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				for (const [key, value] of Object.entries(theme)) {
					await db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [
						`theme_${key}`,
						JSON.stringify(value),
					]);
				}
				this.cache.theme = theme;
			}),
		);
	}

	hasThemeChanged(theme: ThemeSettings): boolean {
		if (!this.cache.theme) return true;
		return JSON.stringify(this.cache.theme) !== JSON.stringify(theme);
	}

	// ── Public API — Metadata ────────────────────────────────────────────────

	async loadMetadata(): Promise<AppMetadata> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				const results = await db.select<Array<{ lastSaved: string; version: string }>>(
					"SELECT * FROM metadata WHERE id = 1",
				);
				if (results.length === 0) {
					const defaultMetadata: AppMetadata = {
						lastSaved: new Date(),
						version: DATA_VERSION,
					};
					await db.execute(
						`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
						[defaultMetadata.lastSaved.toISOString(), defaultMetadata.version],
					);
					return defaultMetadata;
				}
				return {
					lastSaved: new Date(results[0].lastSaved),
					version: results[0].version,
				};
			}),
		);
	}

	async saveMetadata(metadata: AppMetadata): Promise<void> {
		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				await db.execute(
					`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
					[metadata.lastSaved.toISOString(), metadata.version],
				);
			}),
		);
	}

	// ── Load all data ────────────────────────────────────────────────────────

	async loadData(): Promise<AppData> {
		// Try to load from database first
		let dbData: AppData | null = null;
		try {
			dbData = await this.loadDataFromDatabase();

			const hasData =
				dbData.notes.length > 0 ||
				dbData.folders.length > 0 ||
				dbData.expenses.expenses.length > 0 ||
				dbData.income.entries.length > 0;

			if (hasData) {
				localStorageCache.save(dbData);
				return dbData;
			}
		} catch (error) {
			console.warn("Failed to load from database:", error);
		}

		// Database empty or failed - check localStorage
		const cachedData = localStorageCache.load();
		if (cachedData) {
			const hasCache =
				cachedData.notes.length > 0 ||
				cachedData.folders.length > 0 ||
				cachedData.expenses.expenses.length > 0 ||
				cachedData.income.entries.length > 0;

			if (hasCache) {
				console.log("Using localStorage cache (database empty or unavailable)");
				return cachedData;
			}
		}

		if (dbData) {
			localStorageCache.save(dbData);
			return dbData;
		}

		console.log("No existing data found, returning defaults");
		return this.emptyAppData();
	}

	private async loadDataFromDatabase(): Promise<AppData> {
		return this.withConnection(async () => {
			const notes = await this.notesStorage.loadNotes();
			const folders = await this.notesStorage.loadFolders();
			const tags = await this.notesStorage.loadTags();
			const expenses = await this.expensesStorage.loadExpenses();
			const income = await this.incomeStorage.loadIncome();

			const db = this.getDb();

			const settingsResults = await db.select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings",
			);
			const settingsObj: Record<string, unknown> = {};
			for (const row of settingsResults) {
				try {
					settingsObj[row.key] = JSON.parse(row.value);
				} catch {
					settingsObj[row.key] = row.value;
				}
			}
			const settings = {
				...DEFAULT_SETTINGS,
				...(settingsObj as Partial<AppSettings>),
			};
			this.cache.settings = settings;

			const themeResults = await db.select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings WHERE key LIKE 'theme_%'",
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
			const theme = {
				...DEFAULT_THEME_SETTINGS,
				...(themeObj as Partial<ThemeSettings>),
			};
			this.cache.theme = theme;

			const metadataResults = await db.select<Array<{ lastSaved: string; version: string }>>(
				"SELECT * FROM metadata WHERE id = 1",
			);
			const metadata =
				metadataResults.length > 0 ?
					{
						lastSaved: new Date(metadataResults[0].lastSaved),
						version: metadataResults[0].version,
					}
				:	{ lastSaved: new Date(), version: DATA_VERSION };

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
		});
	}

	private emptyAppData(): AppData {
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
			income: { entries: [], weeklyTargets: [], viewType: "weekly" },
			settings: DEFAULT_SETTINGS,
			theme: DEFAULT_THEME_SETTINGS,
			isLoading: false,
			lastSaved: new Date(),
			autoSaveEnabled: DEFAULT_SETTINGS.autoSaveEnabled,
		};
	}

	// ── Save all data ────────────────────────────────────────────────────────

	async saveData(data: AppData, appToSave: AppToSave): Promise<void> {
		// Always save to localStorage first
		localStorageCache.save(data);

		try {
			await this.saveDataToDatabase(data, appToSave);
		} catch (error) {
			console.error("Failed to save to database (localStorage saved):", error);
		}
	}

	private async saveDataToDatabase(data: AppData, appToSave: AppToSave): Promise<void> {
		return this.withConnection(async () => {
			try {
				let hasChanges = false;

				if (appToSave === AppToSave.NotesApp) {
					const notesChanged = this.notesStorage.hasNotesChanged(data.notes);
					const foldersChanged = this.notesStorage.hasFoldersChanged(data.folders);
					const tagsChanged = this.notesStorage.hasTagsChanged(data.tags ?? {});
					if (notesChanged || foldersChanged || tagsChanged) {
						hasChanges = true;
						if (notesChanged) await this.notesStorage.saveNotes(data.notes);
						if (foldersChanged) await this.notesStorage.saveFolders(data.folders);
						if (tagsChanged) await this.notesStorage.saveTags(data.tags ?? {});
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
					const tagsChanged = this.notesStorage.hasTagsChanged(data.tags ?? {});
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
						if (tagsChanged) await this.notesStorage.saveTags(data.tags ?? {});
						if (expensesChanged) await this.expensesStorage.saveExpenses(data.expenses);
						if (incomeChanged) await this.incomeStorage.saveIncome(data.income);

						if (settingsChanged || themeChanged) {
							const db = this.getDb();
							await db.execute("BEGIN TRANSACTION");
							try {
								if (settingsChanged) {
									for (const [key, value] of Object.entries(data.settings)) {
										await db.execute(
											`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
											[key, JSON.stringify(value)],
										);
									}
									this.cache.settings = data.settings;
								}
								if (themeChanged) {
									for (const [key, value] of Object.entries(data.theme)) {
										await db.execute(
											`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
											[`theme_${key}`, JSON.stringify(value)],
										);
									}
									this.cache.theme = data.theme;
								}
								await db.execute("COMMIT");
							} catch (error) {
								await db.execute("ROLLBACK");
								throw error;
							}
						}
					}
				}

				if (hasChanges) {
					const db = this.getDb();
					await db.execute(
						`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
						[new Date().toISOString(), DATA_VERSION],
					);
				}
			} catch (error) {
				console.error("Failed to save data:", error);
				throw error;
			}
		});
	}

	// ── Utility ──────────────────────────────────────────────────────────────

	async openDataFolder(): Promise<void> {
		try {
			const { openPath } = await import("@tauri-apps/plugin-opener");
			await openPath(await this.getDataPath());
		} catch (error) {
			console.error("Failed to open data folder:", error);
		}
	}

	async clearAllData(): Promise<void> {
		localStorageCache.clear();

		return this.withConnection(() =>
			this.queueOperation(async () => {
				const db = this.getDb();
				for (const table of [
					"notes",
					"folders",
					"folders_new",
					"tags",
					"expenses",
					"income_entries",
					"income_weekly_targets",
					"settings",
					"metadata",
				]) {
					await db.execute(`DELETE FROM ${table}`);
				}
				this.cache = {};
				this.rebuildStorageHelpers();
			}),
		);
	}

	/**
	 * Check whether the current environment's database file exists on disk.
	 */
	async databaseExists(): Promise<boolean> {
		try {
			const { exists } = await import("@tauri-apps/plugin-fs");
			const dataPath = await this.getDataPath();
			const dbPath = joinPath(dataPath, this.getDatabaseFileName());
			return exists(dbPath);
		} catch {
			return false;
		}
	}

	clearLocalStorageCache(): void {
		localStorageCache.clear();
	}

	async checkpoint(): Promise<void> {
		if (!this.db) return;
		try {
			await this.db.execute("PRAGMA wal_checkpoint(PASSIVE)");
		} catch (error) {
			console.warn("Checkpoint warning:", error);
		}
	}

	/**
	 * Explicitly close the connection and wait for any in-flight operations
	 * to finish first. Callers that need the connection closed before
	 * replacing the database file should await this.
	 */
	async close(): Promise<void> {
		// Cancel idle-close timer
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}

		// Chain an explicit close onto the gate so we wait for every
		// in-flight operation to complete before closing
		await (this.gate = this.gate.then(() => this.closeConnectionNow()));
	}

	async switchEnvironment(environment: DatabaseEnvironment): Promise<void> {
		await this.close();
		this.currentEnvironment = environment;
		this.environmentInitialized = true;
		this.tablesCreated = false;
	}

	async reinitialize(): Promise<void> {
		await this.close();
		this.tablesCreated = false;
	}

	async getDatabaseFilePath(): Promise<string> {
		await this.ensureEnvironment();
		return joinPath(await this.getDataPath(), this.getDatabaseFileName());
	}

	isInitialized(): boolean {
		return this.environmentInitialized;
	}
}

export const sqlStorage = new SqlStorage();