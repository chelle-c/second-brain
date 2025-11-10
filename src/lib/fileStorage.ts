import { mkdir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import { Note, NotesData, NotesFolders, FoldersData } from "@/types/notes";
import { IncomeData } from "@/types/income";
import { ExpensesData } from "@/types/expense";
import { MindMapNode, MindMapsData } from "@/types/mindmap";
import { AppData, AppMetadata, AppToSave } from "@/types/";

const NOTES_FILE = "notes.json";
const FOLDERS_FILE = "folders.json";
const EXPENSES_FILE = "expenses.json";
const INCOME_FILE = "income.json";
const MINDMAPS_FILE = "mindmaps.json";
const METADATA_FILE = "metadata.json";

const DATA_VERSION = "2.0.0";

class FileStorage {
	private initialized = false;
	private appDataPath: string | null = null;

	async getDataPath(): Promise<string> {
		if (!this.appDataPath) {
			this.appDataPath = await appDataDir();
		}
		return this.appDataPath;
	}

	async ensureAppDataDirectory(): Promise<string> {
		try {
			const dataPath = await this.getDataPath();
			const dirExists = await exists(dataPath);

			if (!dataPath) {
				throw new Error("Failed to get app data directory path");
			}

			if (!dirExists) {
				console.log("Creating app data directory...");
				try {
					await mkdir(dataPath, { recursive: true });
				} catch (err1) {
					console.log(
						"Failed to create with full path, trying alternative method:",
						err1
					);
				}
			}

			const verifyExists = await exists(dataPath);
			if (!verifyExists) {
				throw new Error("Failed to create app data directory");
			}

			this.appDataPath = dataPath;
			return dataPath;
		} catch (error) {
			console.error("Error in ensureAppDataDirectory:", error);
			throw error;
		}
	}

	private createInitialFolders(): NotesFolders {
		const folders: NotesFolders = {
			inbox: {
				id: "inbox",
				name: "Inbox",
				children: [],
			},
			personal: {
				id: "personal",
				name: "Personal",
				children: [
					{ id: "personal_health", name: "Health", parent: "personal", children: [] },
					{ id: "personal_finance", name: "Finance", parent: "personal", children: [] },
					{ id: "personal_home", name: "Home", parent: "personal", children: [] },
				],
			},
			work: {
				id: "work",
				name: "Work",
				children: [
					{ id: "work_meetings", name: "Meetings", parent: "work", children: [] },
					{ id: "work_tasks", name: "Tasks", parent: "work", children: [] },
					{ id: "work_learning", name: "Learning", parent: "work", children: [] },
				],
			},
			projects: {
				id: "projects",
				name: "Projects",
				children: [
					{ id: "projects_active", name: "Active", parent: "projects", children: [] },
					{ id: "projects_planning", name: "Planning", parent: "projects", children: [] },
					{ id: "projects_someday", name: "Someday", parent: "projects", children: [] },
				],
			},
			resources: {
				id: "resources",
				name: "Resources",
				children: [
					{
						id: "resources_articles",
						name: "Articles",
						parent: "resources",
						children: [],
					},
					{ id: "resources_books", name: "Books", parent: "resources", children: [] },
					{ id: "resources_tools", name: "Tools", parent: "resources", children: [] },
				],
			},
		};

		return folders;
	}

	async initialize() {
		if (this.initialized) return;

		try {
			await this.ensureAppDataDirectory();
			const dataPath = await this.getDataPath();

			// Check if files exist, create if they don't
			const filesToCheck = [
				{ name: NOTES_FILE, data: { notes: [], version: DATA_VERSION } },
				{
					name: FOLDERS_FILE,
					data: { folders: this.createInitialFolders(), version: DATA_VERSION },
				},
				{ name: EXPENSES_FILE, data: { expenses: [], version: DATA_VERSION } },
				{
					name: INCOME_FILE,
					data: {
						income: {
							incomeEntries: [],
							incomeWeeklyTargets: [],
							incomeViewType: "weekly",
						},
						version: DATA_VERSION,
					},
				},
				{ name: MINDMAPS_FILE, data: { mindMaps: [], version: DATA_VERSION } },
				{ name: METADATA_FILE, data: { lastSaved: new Date(), version: DATA_VERSION } },
			];

			for (const file of filesToCheck) {
				try {
					const fileExists = await exists(`${dataPath}/${file.name}`);
					if (!fileExists) {
						console.log(`Creating initial ${file.name}...`);
						await writeTextFile(
							`${dataPath}/${file.name}`,
							JSON.stringify(file.data, null, 2)
						);
					}
				} catch (error) {
					console.error(`Failed to create ${file.name}:`, error);
				}
			}

			this.initialized = true;
		} catch (error) {
			console.error("Failed to initialize storage:", error);
			throw error;
		}
	}

	private async readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
		const dataPath = await this.getDataPath();
		try {
			const contents = await readTextFile(`${dataPath}/${filename}`);
			return JSON.parse(contents);
		} catch (error) {
			console.log(`Failed to read ${filename}, using default:`, error);
			return defaultValue;
		}
	}

	private async writeJsonFile(filename: string, data: any): Promise<void> {
		const dataPath = await this.getDataPath();
		try {
			const jsonContent = JSON.stringify(data, null, 2);
			await writeTextFile(`${dataPath}/${filename}`, jsonContent);
			// console.log(`${filename} saved successfully`);
		} catch (error) {
			console.error(`Failed to save ${filename}:`, error);
			throw error;
		}
	}

	async loadNotes(): Promise<Note[]> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<NotesData>(NOTES_FILE, {
			notes: [],
			version: DATA_VERSION,
		});

		return data.notes.map((note: any) => ({
			...note,
			createdAt: new Date(note.createdAt),
			updatedAt: new Date(note.updatedAt),
		}));
	}

	async saveNotes(notes: Note[]): Promise<void> {
		if (!this.initialized) await this.initialize();

		const data: NotesData = {
			notes,
			version: DATA_VERSION,
		};

		await this.writeJsonFile(NOTES_FILE, data);
	}

	async loadFolders(): Promise<NotesFolders> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<FoldersData>(FOLDERS_FILE, {
			folders: this.createInitialFolders(),
			version: DATA_VERSION,
		});

		return data.folders;
	}

	async saveFolders(folders: NotesFolders): Promise<void> {
		if (!this.initialized) await this.initialize();

		const data: FoldersData = {
			folders,
			version: DATA_VERSION,
		};

		await this.writeJsonFile(FOLDERS_FILE, data);
	}

	async loadExpenses(): Promise<AppData["expenses"]> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<ExpensesData>(EXPENSES_FILE, {
			expenses: {
				expenses: [],
				selectedMonth: new Date(),
				overviewMode: "remaining",
			},
			version: DATA_VERSION,
		});

		return {
			expenses: data.expenses.expenses,
			selectedMonth: data.expenses.selectedMonth,
			overviewMode: data.expenses.overviewMode,
		};
	}

	async saveExpenses(expenses: AppData["expenses"]): Promise<void> {
		if (!this.initialized) await this.initialize();

		const data: ExpensesData = {
			expenses: {
				expenses: expenses.expenses,
				selectedMonth: expenses.selectedMonth,
				overviewMode: expenses.overviewMode,
			},
			version: DATA_VERSION,
		};

		await this.writeJsonFile(EXPENSES_FILE, data);
	}

	async loadIncome(): Promise<AppData["income"]> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<IncomeData>(INCOME_FILE, {
			income: {
				entries: [],
				weeklyTargets: [],
				viewType: "weekly",
			},
			version: DATA_VERSION,
		});

		// return everything except version
		return {
			entries: data.income.entries,
			weeklyTargets: data.income.weeklyTargets,
			viewType: data.income.viewType,
		};
	}

	async saveIncome(income: AppData["income"]): Promise<void> {
		if (!this.initialized) await this.initialize();

		const data: IncomeData = {
			income: {
				entries: income.entries,
				weeklyTargets: income.weeklyTargets,
				viewType: income.viewType,
			},
			version: DATA_VERSION,
		};

		await this.writeJsonFile(INCOME_FILE, data);
	}

	async loadMindMaps(): Promise<MindMapNode[]> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<MindMapsData>(MINDMAPS_FILE, {
			mindMaps: [],
			version: DATA_VERSION,
		});

		return data.mindMaps;
	}

	async saveMindMaps(mindMaps: MindMapNode[]): Promise<void> {
		if (!this.initialized) await this.initialize();

		const data: MindMapsData = {
			mindMaps,
			version: DATA_VERSION,
		};

		await this.writeJsonFile(MINDMAPS_FILE, data);
	}

	async loadMetadata(): Promise<AppMetadata> {
		if (!this.initialized) await this.initialize();

		const data = await this.readJsonFile<AppMetadata>(METADATA_FILE, {
			lastSaved: new Date(),
			version: DATA_VERSION,
		});

		return {
			...data,
			lastSaved: new Date(data.lastSaved),
		};
	}

	async saveMetadata(metadata: AppMetadata): Promise<void> {
		if (!this.initialized) await this.initialize();
		await this.writeJsonFile(METADATA_FILE, metadata);
	}

	async loadData(): Promise<AppData> {
		if (!this.initialized) await this.initialize();

		try {
			const [notes, folders, expenses, metadata, income] = await Promise.all([
				this.loadNotes(),
				this.loadFolders(),
				this.loadExpenses(),
				this.loadMetadata(),
				this.loadIncome(),
			]);

			// Convert hierarchical folders to flat subfolders for backwards compatibility
			const subfolders = this.extractSubfoldersFromHierarchy(folders);

			console.log("Data loaded successfully from multiple files");
			return {
				notes,
				notesFolders: folders,
				subfolders,
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
				expenses: {
					expenses: [],
					selectedMonth: new Date(),
					overviewMode: "remaining",
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

	private extractSubfoldersFromHierarchy(folders: NotesFolders): any[] {
		const subfolders: any[] = [];

		Object.values(folders).forEach((folder) => {
			if (folder.children && folder.children.length > 0) {
				folder.children.forEach((child) => {
					subfolders.push({
						id: child.id,
						name: child.name,
						parent: folder.id,
					});
				});
			}
		});

		return subfolders;
	}

	async saveData(data: AppData, appToSave: AppToSave): Promise<void> {
		if (!this.initialized) await this.initialize();

		// console.log("App to save:", appToSave);

		try {
			const metadata: AppMetadata = {
				lastSaved: new Date(),
				version: DATA_VERSION,
			};

			if (appToSave === AppToSave.NotesApp) {
				await Promise.all([
					this.saveNotes(data.notes),
					this.saveFolders(data.notesFolders),
					this.saveMetadata(metadata),
				]);
			}

			if (appToSave === AppToSave.Expenses) {
				await Promise.all([this.saveExpenses(data.expenses), this.saveMetadata(metadata)]);
			}

			if (appToSave === AppToSave.Income) {
				await Promise.all([this.saveIncome(data.income), this.saveMetadata(metadata)]);
			}

			// if (appToSave === AppToSave.MindMapsApp) {
			// 	await Promise.all([this.saveMindMaps(data.mindMaps), this.saveMetadata(metadata)]);
			// }

			if (appToSave === AppToSave.All) {
				await Promise.all([
					this.saveNotes(data.notes),
					this.saveFolders(data.notesFolders),
					this.saveExpenses(data.expenses),
					this.saveIncome(data.income),
					this.saveMetadata(metadata),
				]);
			}
		} catch (error) {
			console.error("Failed to save data:", error);
			throw error;
		}
	}

	async openDataFolder(): Promise<void> {
		try {
			await this.ensureAppDataDirectory();
			const { openPath } = await import("@tauri-apps/plugin-opener");
			const path = await this.getDataPath();
			await openPath(path);
			console.log("Opened data folder:", path);
		} catch (error) {
			console.error("Failed to open data folder:", error);
		}
	}
}

export const fileStorage = new FileStorage();
