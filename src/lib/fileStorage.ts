import { BaseDirectory, mkdir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import type { AppData, NotesFolders } from "../types";

const DATA_FILE = "app-data.json";
const BACKUP_FILE = "app-data.backup.json";

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
			// Get the app data directory path
			const dataPath = await this.getDataPath();
			const dirExists = await exists(dataPath);

			if (!dataPath) {
				throw new Error("Failed to get app data directory path");
			}

			if (!dirExists) {
				console.log("Creating app data directory...");

				try {
					// Create the directory with the full path
					await mkdir(dataPath, { recursive: true });
				} catch (err1) {
					console.log(
						"Failed to create with full path, trying alternative method:",
						err1
					);
				}
			}

			// Verify directory now exists
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

	async initialize() {
		if (this.initialized) return;

		try {
			// First, ensure the directory exists
			await this.ensureAppDataDirectory();

			const dataPath = await this.getDataPath();

			// Now try to check if data file exists
			let fileExists = false;
			try {
				fileExists = await exists(`${dataPath}/${DATA_FILE}`);
			} catch (existsError) {
				console.log("Could not check if file exists:", existsError);
				fileExists = false;
			}

			if (!fileExists) {
				console.log("Creating initial data file...");

				const initialFolders: NotesFolders = {
					inbox: { id: "inbox", name: "Inbox" },
					personal: { id: "personal", name: "Personal" },
					work: { id: "work", name: "Work" },
					projects: { id: "projects", name: "Projects" },
					resources: { id: "resources", name: "Resources" },
				};

				const initialSubfolders = [
					{ id: "personal_health", name: "Health", parent: "personal" },
					{ id: "personal_finance", name: "Finance", parent: "personal" },
					{ id: "personal_home", name: "Home", parent: "personal" },

					{ id: "work_meetings", name: "Meetings", parent: "work" },
					{ id: "work_tasks", name: "Tasks", parent: "work" },
					{ id: "work_learning", name: "Learning", parent: "work" },

					{ id: "projects_active", name: "Active", parent: "projects" },
					{ id: "projects_planning", name: "Planning", parent: "projects" },
					{ id: "projects_someday", name: "Someday", parent: "projects" },

					{ id: "resources_articles", name: "Articles", parent: "resources" },
					{ id: "resources_books", name: "Books", parent: "resources" },
					{ id: "resources_tools", name: "Tools", parent: "resources" },
				];

				const initialData: AppData = {
					notes: [],
					notesFolders: initialFolders,
					subfolders: initialSubfolders,
					expenses: [],
					mindMaps: [],
					lastSaved: new Date(),
				};

				try {
					await writeTextFile(
						`${dataPath}/${DATA_FILE}`,
						JSON.stringify(initialData, null, 2)
					);
					console.log("Initial data file created successfully");
				} catch (writeError1) {
					console.error("Failed to create initial data file:", writeError1);
				}
			}

			this.initialized = true;
		} catch (error) {
			console.error("Failed to initialize storage:", error);
			throw error;
		}
	}

	async loadData(): Promise<AppData> {
		if (!this.initialized) {
			await this.initialize();
		}

		let contents: string | null = null;
		const dataPath = await this.getDataPath();

		try {
			contents = await readTextFile(`${dataPath}/${DATA_FILE}`);
		} catch (error1) {
			console.log("Failed to load with BaseDirectory.AppLocalData:", error1);
		}

		if (contents) {
			try {
				const data = JSON.parse(contents);

				// Convert date strings back to Date objects
				if (data.lastSaved) {
					data.lastSaved = new Date(data.lastSaved);
				}

				if (data.notes) {
					data.notes = data.notes.map((note: any) => ({
						...note,
						createdAt: new Date(note.createdAt),
						updatedAt: new Date(note.updatedAt),
					}));
				}

				if (data.expenses) {
					data.expenses = data.expenses.map((expense: any) => ({
						...expense,
						dueDate: new Date(expense.dueDate),
					}));
				}

				console.log("Data parsed successfully");
				return data;
			} catch (parseError) {
				console.error("Failed to parse data:", parseError);
			}
		}

		// Return empty data structure if load fails
		console.log("Returning empty data structure");
		return {
			notes: [],
			notesFolders: {},
			subfolders: [],
			expenses: [],
			mindMaps: [],
			lastSaved: new Date(),
		};
	}

	async saveData(data: AppData): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		}

		const dataToSave = {
			...data,
			lastSaved: new Date(),
		};

		const jsonContent = JSON.stringify(dataToSave, null, 2);

		const dataPath = await this.getDataPath();

		// Try to create backup first
		try {
			const existingContent = await readTextFile(`${dataPath}/${DATA_FILE}`);
			if (existingContent && existingContent.length > 0) {
				await writeTextFile(BACKUP_FILE, existingContent, {
					baseDir: BaseDirectory.AppLocalData,
				});
				console.log("Backup created");
			}
		} catch {
			// Ignore backup errors
		}

		// Try multiple methods to save the file
		let saved = false;

		// Method 1: Save with BaseDirectory.AppLocalData
		try {
			await writeTextFile(`${dataPath}/${DATA_FILE}`, jsonContent);
			console.log("Data saved with BaseDirectory.AppLocalData");
			console.log(`Data saved at ${BaseDirectory.AppLocalData}`);
			saved = true;
		} catch (error1) {
			console.log("Failed to save with BaseDirectory.AppLocalData:", error1);
		}

		if (saved) {
			console.log("Data saved successfully");
		}
	}

	async openDataFolder(): Promise<void> {
		try {
			// Ensure directory exists before trying to open it
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
