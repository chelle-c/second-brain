import Database from "@tauri-apps/plugin-sql";
import { appDataDir } from "@tauri-apps/api/path";
import { AppData, AppMetadata, AppToSave } from "@/types/";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { DatabaseContext, StorageCache, DATA_VERSION } from "./types";
import { NotesStorage } from "./notesStorage";
import { ExpensesStorage } from "./expensesStorage";
import { IncomeStorage } from "./incomeStorage";

const DB_NAME = "appdata.db";

class SqlStorage {
	private initialized = false;
	private initializing = false;
	private db: Database | null = null;
	private appDataPath: string | null = null;
	private operationQueue: Promise<any> = Promise.resolve();
	private cache: StorageCache = {};

	// Sub-storage modules
	private notesStorage!: NotesStorage;
	private expensesStorage!: ExpensesStorage;
	private incomeStorage!: IncomeStorage;

	async getDataPath(): Promise<string> {
		if (!this.appDataPath) {
			this.appDataPath = await appDataDir();
		}
		return this.appDataPath;
	}

	private queueOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
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

	async initialize() {
		if (this.initialized) return;
		if (this.initializing) {
			while (this.initializing) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			return;
		}

		this.initializing = true;

		try {
			const dataPath = await this.getDataPath();
			const dbPath = `${dataPath}/${DB_NAME}`;

			this.db = await Database.load(`sqlite:${dbPath}`);

			// Database configuration
			await this.db.execute("PRAGMA journal_mode=WAL");
			await this.db.execute("PRAGMA synchronous=NORMAL");
			await this.db.execute("PRAGMA busy_timeout=5000");

			// Create tables (for new installations or missing tables)
			await this.createTables();

			// Initialize sub-storage modules
			this.notesStorage = new NotesStorage(this.getContext());
			this.expensesStorage = new ExpensesStorage(this.getContext());
			this.incomeStorage = new IncomeStorage(this.getContext());

			this.initialized = true;
			console.log("Database initialized");
		} catch (error) {
			console.error("Failed to initialize database:", error);
			throw error;
		} finally {
			this.initializing = false;
		}
	}

	private async createTables() {
		if (!this.db) throw new Error("Database not initialized");

		// Create notes table with new schema (if it doesn't exist)
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

	// Public API - Notes
	async loadNotes() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadNotes();
	}

	async saveNotes(notes: any[]) {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.saveNotes(notes);
	}

	async loadFolders() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadFolders();
	}

	async saveFolders(folders: any) {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.saveFolders(folders);
	}

	async loadTags() {
		if (!this.initialized) await this.initialize();
		return this.notesStorage.loadTags();
	}

	async saveTags(tags: any) {
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

	// Metadata
	async loadMetadata(): Promise<AppMetadata> {
		if (!this.initialized) await this.initialize();

		return this.queueOperation(async () => {
			const results = await this.db!.select<Array<{ lastSaved: string; version: string }>>(
				"SELECT * FROM metadata WHERE id = 1"
			);

			if (results.length === 0) {
				const defaultMetadata: AppMetadata = {
					lastSaved: new Date(),
					version: DATA_VERSION,
				};
				await this.db!.execute(
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
			await this.db!.execute(
				`INSERT OR REPLACE INTO metadata (id, lastSaved, version) VALUES (1, ?, ?)`,
				[metadata.lastSaved.toISOString(), metadata.version]
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

			const subfolders = this.notesStorage.extractSubfoldersFromHierarchy(folders);

			return {
				notes,
				notesFolders: folders,
				subfolders,
				tags,
				expenses,
				income,
				isLoading: false,
				lastSaved: metadata.lastSaved,
				autoSaveEnabled: true,
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
				},
				income: {
					entries: [],
					weeklyTargets: [],
					viewType: "weekly",
				},
				isLoading: false,
				lastSaved: new Date(),
				autoSaveEnabled: true,
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
				const foldersChanged = this.notesStorage.hasFoldersChanged(data.notesFolders);
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
				const foldersChanged = this.notesStorage.hasFoldersChanged(data.notesFolders);
				const tagsChanged = this.notesStorage.hasTagsChanged(data.tags || {});
				const expensesChanged = this.expensesStorage.hasExpensesChanged(data.expenses);
				const incomeChanged = this.incomeStorage.hasIncomeChanged(data.income);

				if (
					notesChanged ||
					foldersChanged ||
					tagsChanged ||
					expensesChanged ||
					incomeChanged
				) {
					hasChanges = true;
					if (notesChanged) await this.saveNotes(data.notes);
					if (foldersChanged) await this.saveFolders(data.notesFolders);
					if (tagsChanged) await this.saveTags(data.tags || {});
					if (expensesChanged) await this.saveExpenses(data.expenses);
					if (incomeChanged) await this.saveIncome(data.income);
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
			await this.db!.execute("DELETE FROM notes");
			await this.db!.execute("DELETE FROM folders");
			await this.db!.execute("DELETE FROM tags");
			await this.db!.execute("DELETE FROM expenses");
			await this.db!.execute("DELETE FROM income_entries");
			await this.db!.execute("DELETE FROM income_weekly_targets");
			await this.db!.execute("DELETE FROM settings");
			await this.db!.execute("DELETE FROM metadata");
		});

		this.cache = {};
		console.log("All data cleared");
	}
}

export const sqlStorage = new SqlStorage();
