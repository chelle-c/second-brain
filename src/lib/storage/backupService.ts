import { invoke } from "@tauri-apps/api/core";
import { appDataDir, documentDir, sep } from "@tauri-apps/api/path";
import {
	copyFile,
	exists,
	mkdir,
	readDir,
	readTextFile,
	remove,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
import {
	type BackupInfo,
	type BackupMetadata,
	type BackupResult,
	type BackupSettings,
	type DatabaseEnvironment,
	DEFAULT_BACKUP_SETTINGS,
	type ExpenseExportData,
	type MigrationStep,
	type RestoreResult,
} from "@/types/backup";
import type { Expense, OverviewMode } from "@/types/expense";
import type { Folder, Note, Tag } from "@/types/notes";
import type { AppData } from "@/types";
import { APP_VERSION, DATA_VERSION, DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import {
	Bookmark,
	Circle,
	Club,
	Code,
	Diamond,
	Folder as FolderIcon,
	Heart,
	Spade,
	Sparkles,
	Square,
	Star,
	Tag as TagIcon,
	Triangle,
	X,
	Flag,
	CheckCircle,
	AlertCircle,
	Lightbulb,
	Zap,
	Flame,
	Target,
	BookOpen,
	FileText,
	Edit3,
	Link,
	Paperclip,
	List,
	Calendar,
	Clock,
	User,
	Users,
	Home,
	MapPin,
	Globe,
	Truck,
	Mail,
	Phone,
	MessageCircle,
	Music,
	Play,
	Coffee,
	Gift,
	Palette,
	Settings,
	Moon,
	Sun,
	Paintbrush,
	Coins,
	Banknote,
	Glasses,
	Landmark,
	Key,
	WalletCards,
	type LucideIcon,
} from "lucide-react";

// Icon mapping for folders and tags (same as in NotesStorage)
const ICON_MAP: Record<string, LucideIcon> = {
	Folder: FolderIcon,
	Star: Star,
	Heart: Heart,
	Square: Square,
	Triangle: Triangle,
	Circle: Circle,
	X: X,
	Club: Club,
	Spade: Spade,
	Diamond: Diamond,
	Sparkles: Sparkles,
	Tag: TagIcon,
	Bookmark: Bookmark,
	Flag: Flag,
	CheckCircle: CheckCircle,
	AlertCircle: AlertCircle,
	Lightbulb: Lightbulb,
	Zap: Zap,
	Flame: Flame,
	Target: Target,
	BookOpen: BookOpen,
	FileText: FileText,
	Edit3: Edit3,
	Code: Code,
	Link: Link,
	Paperclip: Paperclip,
	List: List,
	Calendar: Calendar,
	Clock: Clock,
	User: User,
	Users: Users,
	Home: Home,
	MapPin: MapPin,
	Globe: Globe,
	Truck: Truck,
	Mail: Mail,
	Phone: Phone,
	MessageCircle: MessageCircle,
	Music: Music,
	Play: Play,
	Coffee: Coffee,
	Gift: Gift,
	Palette: Palette,
	Settings: Settings,
	Moon: Moon,
	Sun: Sun,
	Paintbrush: Paintbrush,
	Coins: Coins,
	Banknote: Banknote,
	Glasses: Glasses,
	Landmark: Landmark,
	Key: Key,
	WalletCards: WalletCards,
};

interface RawExpenseData {
	id: string;
	name: string;
	amount: number;
	category: string;
	dueDate?: string | null;
	paymentDate?: string | null;
	createdAt: string;
	updatedAt: string;
	isRecurring: number | boolean;
	recurrence?: string | null;
	isArchived: number | boolean;
	isPaid: number | boolean;
	type: string;
	importance: string;
	parentExpenseId?: string | null;
	monthlyOverrides?: string | null;
	isModified?: number | boolean | null;
	initialState?: string | null;
	paymentMethod?: string | null;
	subscriptionStatus?: string | null;
}

const BACKUP_DIR_NAME = "backups";
const BACKUP_SETTINGS_FILE = "backup-settings.json";
const DB_NAME_PRODUCTION = "appdata.db";
const DB_NAME_TEST = "appdata-test.db";

const MAX_PRE_RESTORE_BACKUPS = 5;

const joinPath = (...parts: string[]): string => parts.join(sep());

const formatDateForFilename = (date: Date): string => {
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
		`-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
	);
};

interface MigrationData {
	expenses?: {
		paymentMethods?: string[];
		expenses?: Array<{
			paymentMethod?: string;
			initialState?: { paymentMethod?: string };
		}>;
	};
}

const MIGRATIONS: MigrationStep[] = [
	{
		fromVersion: "0.0.4",
		toVersion: "0.0.5",
		description: "Added paymentMethod to expenses",
		migrate: (data: unknown) => {
			const d = data as MigrationData;
			return {
				...d,
				expenses: {
					...d.expenses,
					paymentMethods: d.expenses?.paymentMethods || ["Default"],
					expenses: (d.expenses?.expenses || []).map((e) => ({
						...e,
						paymentMethod: e.paymentMethod || "None",
						initialState:
							e.initialState ?
								{
									...e.initialState,
									paymentMethod: e.initialState.paymentMethod || "None",
								}
							:	undefined,
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
		const expected: DatabaseEnvironment = isDev ? "test" : "production";
		if (this.settings.databaseEnvironment !== expected) {
			this.settings.databaseEnvironment = expected;
			await this.saveSettings(this.settings);
		}

		await this.ensureBackupDirectory();
		this.startAutoBackupScheduler();
	}

	private async getAppDataPath(): Promise<string> {
		if (!this.appDataPath) this.appDataPath = await appDataDir();
		return this.appDataPath;
	}

	private async getBackupPath(): Promise<string> {
		if (this.settings.customBackupPath) return this.settings.customBackupPath;
		return joinPath(await this.getAppDataPath(), BACKUP_DIR_NAME);
	}

	private async ensureBackupDirectory(): Promise<void> {
		const p = await this.getBackupPath();
		try {
			if (!(await exists(p))) await mkdir(p, { recursive: true });
		} catch (error) {
			console.error("Failed to create backup directory:", error);
		}
	}

	async loadSettings(): Promise<BackupSettings> {
		try {
			const appData = await this.getAppDataPath();
			const settingsPath = joinPath(appData, BACKUP_SETTINGS_FILE);
			if (!(await exists(settingsPath))) {
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
			await writeTextFile(
				joinPath(appData, BACKUP_SETTINGS_FILE),
				JSON.stringify(settings, null, 2),
			);
			this.startAutoBackupScheduler();
			if (settings.customBackupPath) await this.ensureBackupDirectory();
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

	// ── Auto-backup scheduler ────────────────────────────────────────────────

	private startAutoBackupScheduler(): void {
		if (this.autoBackupInterval) {
			clearInterval(this.autoBackupInterval);
			this.autoBackupInterval = null;
		}
		if (!this.settings.autoBackupEnabled || this.settings.autoBackupIntervalHours <= 0) return;

		const intervalMs = this.settings.autoBackupIntervalHours * 60 * 60 * 1000;
		this.autoBackupInterval = setInterval(() => this.performAutoBackup(), intervalMs);
		this.checkInitialAutoBackup();
	}

	private async checkInitialAutoBackup(): Promise<void> {
		const autoBackups = await this.listBackupsByType("auto");
		if (autoBackups.length === 0) {
			await this.performAutoBackup();
			return;
		}
		const mostRecent = autoBackups[0];
		const elapsed = Date.now() - new Date(mostRecent.metadata.createdAt).getTime();
		if (elapsed > this.settings.autoBackupIntervalHours * 60 * 60 * 1000) {
			await this.performAutoBackup();
		}
	}

	private async performAutoBackup(): Promise<void> {
		try {
			const result = await this.createBackup("Auto-backup");
			if (result.success) await this.cleanupOldBackups();
		} catch (error) {
			console.error("Auto-backup failed:", error);
		}
	}

	private async cleanupOldBackups(): Promise<void> {
		const backups = await this.listBackups();

		// Auto-backups: keep newest maxAutoBackups
		const autoBackups = backups.filter((b) =>
			b.metadata.description?.startsWith("Auto-backup"),
		);
		for (const b of autoBackups.slice(this.settings.maxAutoBackups)) {
			await this.deleteBackup(b.filename);
		}

		// Pre-restore backups: keep newest MAX_PRE_RESTORE_BACKUPS
		const preRestoreBackups = backups.filter((b) =>
			b.metadata.description?.startsWith("Pre-restore"),
		);
		for (const b of preRestoreBackups.slice(MAX_PRE_RESTORE_BACKUPS)) {
			await this.deleteBackup(b.filename);
		}
	}

	// ── WAL flush ────────────────────────────────────────────────────────────

	private async flushWAL(): Promise<void> {
		try {
			const { sqlStorage } = await import("./database");
			if (sqlStorage.isOpen()) {
				await sqlStorage.checkpoint();
			}
			console.log("WAL checkpoint complete");
		} catch (error) {
			console.warn("WAL checkpoint warning:", error);
		}
	}

	// ── Backup filename helpers ──────────────────────────────────────────────

	/**
	 * Generate backup filename.
	 * Pre-restore backups use shorter "pr-" prefix instead of "pre-restore-"
	 */
	private generateBackupFilename(timestamp: string, isPreRestore = false): string {
		const prefix = isPreRestore ? "pr" : "backup";
		const envSuffix = this.settings.databaseEnvironment === "test" ? "-test" : "";
		return `${prefix}${envSuffix}-${timestamp}.db`;
	}

	// ── listBackups ──────────────────────────────────────────────────────────

	async listBackups(): Promise<BackupInfo[]> {
		try {
			const backupPath = await this.getBackupPath();
			if (!(await exists(backupPath))) return [];

			const entries = await readDir(backupPath);
			const backups: BackupInfo[] = [];

			for (const entry of entries) {
				if (!entry.name?.endsWith(".db") || entry.name.endsWith(".meta.json")) continue;

				const metadataPath = joinPath(backupPath, `${entry.name}.meta.json`);
				const expenseExportPath = joinPath(
					backupPath,
					entry.name.replace(".db", "-expenses.json"),
				);

				try {
					const expenseExportExists = await exists(expenseExportPath);

					if (await exists(metadataPath)) {
						const metadata = JSON.parse(
							await readTextFile(metadataPath),
						) as BackupMetadata;
						metadata.createdAt = new Date(metadata.createdAt);
						metadata.hasExpenseExport = expenseExportExists;

						backups.push({
							filename: entry.name,
							metadata,
							path: joinPath(backupPath, entry.name),
							expenseExportPath: expenseExportExists ? expenseExportPath : undefined,
						});
					} else {
						backups.push(
							this.buildLegacyBackupInfo(
								entry.name,
								backupPath,
								expenseExportExists,
								expenseExportExists ? expenseExportPath : undefined,
							),
						);
					}
				} catch {
					// Skip unreadable entries
				}
			}

			return backups.sort(
				(a, b) =>
					new Date(b.metadata.createdAt).getTime() -
					new Date(a.metadata.createdAt).getTime(),
			);
		} catch (error) {
			console.error("Failed to list backups:", error);
			return [];
		}
	}

	private async listBackupsByType(
		type: "auto" | "manual" | "pre-restore",
	): Promise<BackupInfo[]> {
		const all = await this.listBackups();
		const prefixMap: Record<typeof type, string> = {
			auto: "Auto-backup",
			manual: "Manual",
			"pre-restore": "Pre-restore",
		};
		return all.filter((b) => b.metadata.description?.startsWith(prefixMap[type]));
	}

	private buildLegacyBackupInfo(
		filename: string,
		backupPath: string,
		expenseExportExists: boolean,
		expenseExportPath?: string,
	): BackupInfo {
		let environment: DatabaseEnvironment = "production";
		let createdAt = new Date();
		let isPreRestore = false;

		const parse = (dateStr: string, timeStr: string) =>
			new Date(
				parseInt(dateStr.slice(0, 4), 10),
				parseInt(dateStr.slice(4, 6), 10) - 1,
				parseInt(dateStr.slice(6, 8), 10),
				parseInt(timeStr.slice(0, 2), 10),
				parseInt(timeStr.slice(2, 4), 10),
				parseInt(timeStr.slice(4, 6), 10),
			);

		// New short pre-restore format: pr-YYYYMMDD-HHMMSS.db or pr-test-YYYYMMDD-HHMMSS.db
		const prProdMatch = filename.match(/^pr-(\d{8})-(\d{6})\.db$/);
		const prTestMatch = filename.match(/^pr-test-(\d{8})-(\d{6})\.db$/);
		// Old pre-restore format
		const oldPreRestoreMatch = filename.match(/^pre-restore(-test)?-(\d{8})-(\d{6})\.db$/);
		// Regular backup formats
		const prodMatch = filename.match(/^backup-(\d{8})-(\d{6})\.db$/);
		const testMatch = filename.match(/^backup-test-(\d{8})-(\d{6})\.db$/);

		if (prProdMatch) {
			environment = "production";
			createdAt = parse(prProdMatch[1], prProdMatch[2]);
			isPreRestore = true;
		} else if (prTestMatch) {
			environment = "test";
			createdAt = parse(prTestMatch[1], prTestMatch[2]);
			isPreRestore = true;
		} else if (oldPreRestoreMatch) {
			environment = oldPreRestoreMatch[1] ? "test" : "production";
			createdAt = parse(oldPreRestoreMatch[2], oldPreRestoreMatch[3]);
			isPreRestore = true;
		} else if (prodMatch) {
			environment = "production";
			createdAt = parse(prodMatch[1], prodMatch[2]);
		} else if (testMatch) {
			environment = "test";
			createdAt = parse(testMatch[1], testMatch[2]);
		}

		return {
			filename,
			metadata: {
				id: crypto.randomUUID(),
				createdAt,
				version: "unknown",
				environment,
				description: isPreRestore ? "Pre-restore" : "Legacy backup",
				hasExpenseExport: expenseExportExists,
			},
			path: joinPath(backupPath, filename),
			expenseExportPath,
		};
	}

	// ── createBackup ─────────────────────────────────────────────────────────

	createExpenseExportData(
		expenses: Expense[],
		categories: string[],
		categoryColors: Record<string, string>,
		paymentMethods: string[],
		selectedMonth: Date,
		overviewMode: string,
	): ExpenseExportData {
		return {
			version: APP_VERSION,
			exportedAt: new Date().toISOString(),
			data: {
				expenses: expenses.map((e) => ({
					...e,
					dueDate: e.dueDate?.toISOString() ?? null,
					paymentDate: e.paymentDate?.toISOString() ?? null,
					createdAt: e.createdAt.toISOString(),
					updatedAt: e.updatedAt.toISOString(),
					initialState:
						e.initialState ?
							{
								amount: e.initialState.amount,
								dueDate: e.initialState.dueDate?.toISOString() ?? null,
								paymentMethod: e.initialState.paymentMethod || "None",
							}
						:	undefined,
				})),
				categories,
				categoryColors,
				paymentMethods,
				selectedMonth: selectedMonth.toISOString(),
				overviewMode,
			},
		};
	}

	async exportExpensesToJson(
		exportData: ExpenseExportData,
		outputPath: string,
	): Promise<boolean> {
		try {
			await writeTextFile(outputPath, JSON.stringify(exportData, null, 2));
			return true;
		} catch (error) {
			console.error("Failed to export expenses:", error);
			return false;
		}
	}

	async importExpensesFromJson(
		filePath: string,
	): Promise<{ success: boolean; data?: ExpenseExportData; error?: string }> {
		try {
			if (!(await exists(filePath))) return { success: false, error: "File not found" };
			const data = JSON.parse(await readTextFile(filePath)) as ExpenseExportData;
			if (!data.version || !data.data || !Array.isArray(data.data.expenses))
				return { success: false, error: "Invalid export file format" };

			const convertedExpenses = data.data.expenses.map((e) => ({
				...e,
				dueDate: e.dueDate ? new Date(e.dueDate) : null,
				paymentDate: e.paymentDate ? new Date(e.paymentDate) : null,
				createdAt: new Date(e.createdAt),
				updatedAt: new Date(e.updatedAt),
				paymentMethod: e.paymentMethod || "None",
				initialState:
					e.initialState ?
						{
							amount: e.initialState.amount,
							dueDate:
								e.initialState.dueDate ? new Date(e.initialState.dueDate) : null,
							paymentMethod: e.initialState.paymentMethod || "None",
						}
					:	undefined,
			}));
			data.data.expenses = convertedExpenses as unknown as typeof data.data.expenses;
			return { success: true, data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async createBackup(description?: string): Promise<BackupResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const dbFileName = this.getDatabaseFileName();
			const sourcePath = joinPath(appData, dbFileName);

			if (!(await exists(sourcePath))) {
				return { success: false, error: "Source database does not exist" };
			}

			await this.flushWAL();

			const timestamp = formatDateForFilename(new Date());
			const backupFilename = this.generateBackupFilename(timestamp);
			const backupFilePath = joinPath(backupPath, backupFilename);

			await copyFile(sourcePath, backupFilePath);

			// Copy WAL/SHM if they exist
			for (const suffix of ["-wal", "-shm"]) {
				const walSrc = `${sourcePath}${suffix}`;
				if (await exists(walSrc)) {
					try {
						await copyFile(walSrc, `${backupFilePath}${suffix}`);
					} catch {
						// Non-fatal
					}
				}
			}

			const now = new Date();
			const metadata: BackupMetadata = {
				id: crypto.randomUUID(),
				createdAt: now,
				version: DATA_VERSION,
				environment: this.settings.databaseEnvironment,
				description: description || "Manual backup",
			};

			await writeTextFile(
				joinPath(backupPath, `${backupFilename}.meta.json`),
				JSON.stringify(metadata, null, 2),
			);

			console.log(`Backup created: ${backupFilename}`);
			return {
				success: true,
				backup: {
					filename: backupFilename,
					metadata,
					path: backupFilePath,
				},
			};
		} catch (error) {
			console.error("Backup creation failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// ── deleteBackup ─────────────────────────────────────────────────────────

	async deleteBackup(filename: string): Promise<boolean> {
		try {
			const backupPath = await this.getBackupPath();

			for (const suffix of ["", ".meta.json", "-expenses.json", "-wal", "-shm"]) {
				const target = joinPath(
					backupPath,
					suffix === "" ? filename : `${filename}${suffix}`,
				);
				if (await exists(target)) await remove(target);
			}
			const expExport = joinPath(backupPath, filename.replace(".db", "-expenses.json"));
			if (await exists(expExport)) await remove(expExport);

			return true;
		} catch (error) {
			console.error("Failed to delete backup:", error);
			return false;
		}
	}

	// ── restoreFromBackup ────────────────────────────────────────────────────

	validateRestoreEnvironment(
		backupEnvironment: DatabaseEnvironment,
		targetEnvironment: DatabaseEnvironment,
	): { allowed: boolean; reason?: string } {
		if (backupEnvironment === "test" && targetEnvironment === "production") {
			return {
				allowed: false,
				reason:
					"Cannot restore a test backup to the production database. " +
					"This prevents test data from overwriting production data.",
			};
		}
		return { allowed: true };
	}

	async restoreFromBackup(
		filename: string,
		options?: {
			targetEnvironment?: DatabaseEnvironment;
			skipEnvironmentCheck?: boolean;
			skipPreRestoreBackup?: boolean;
		},
	): Promise<RestoreResult> {
		try {
			const appData = await this.getAppDataPath();
			const backupPath = await this.getBackupPath();
			const backupFilePath = joinPath(backupPath, filename);
			const metadataPath = joinPath(backupPath, `${filename}.meta.json`);

			if (!(await exists(backupFilePath))) {
				return { success: false, error: "Backup file not found" };
			}

			let sourceVersion = "unknown";
			let backupEnvironment: DatabaseEnvironment = "production";

			try {
				if (await exists(metadataPath)) {
					const meta = JSON.parse(await readTextFile(metadataPath)) as BackupMetadata;
					sourceVersion = meta.version;
					backupEnvironment = meta.environment;
				} else if (filename.includes("-test-")) {
					backupEnvironment = "test";
				}
			} catch {
				console.warn("Could not read backup metadata");
			}

			const targetEnvironment =
				options?.targetEnvironment ?? this.settings.databaseEnvironment;

			if (!options?.skipEnvironmentCheck) {
				const validation = this.validateRestoreEnvironment(
					backupEnvironment,
					targetEnvironment,
				);
				if (!validation.allowed) {
					return { success: false, error: validation.reason };
				}
			}

			if (sourceVersion !== DATA_VERSION && sourceVersion !== "unknown") {
				const canMigrate = this.canMigrate(sourceVersion, DATA_VERSION);
				if (!canMigrate) {
					return {
						success: false,
						error: `Cannot migrate from v${sourceVersion} to v${DATA_VERSION}.`,
						requiresMigration: true,
						sourceVersion,
						targetVersion: DATA_VERSION,
					};
				}
			}

			const currentDbFileName = this.getDatabaseFileName(targetEnvironment);
			const currentDbPath = joinPath(appData, currentDbFileName);
			const currentDbExists = await exists(currentDbPath);

			// Pre-restore safety backup (shorter name: pr-YYYYMMDD-HHMMSS.db)
			if (currentDbExists && !options?.skipPreRestoreBackup) {
				await this.flushWAL();
				const timestamp = formatDateForFilename(new Date());
				const savedEnv = this.settings.databaseEnvironment;
				this.settings.databaseEnvironment = targetEnvironment;
				const preRestoreName = this.generateBackupFilename(timestamp, true);
				this.settings.databaseEnvironment = savedEnv;
				const preRestorePath = joinPath(backupPath, preRestoreName);

				try {
					await copyFile(currentDbPath, preRestorePath);
					const preRestoreMeta: BackupMetadata = {
						id: crypto.randomUUID(),
						createdAt: new Date(),
						version: DATA_VERSION,
						environment: targetEnvironment,
						description: "Pre-restore",
					};
					await writeTextFile(
						joinPath(backupPath, `${preRestoreName}.meta.json`),
						JSON.stringify(preRestoreMeta, null, 2),
					);
					console.log(`Pre-restore backup created: ${preRestoreName}`);
				} catch (preRestoreError) {
					console.warn("Could not create pre-restore backup:", preRestoreError);
				}
			}

			// Replace database
			const targetPath = joinPath(appData, this.getDatabaseFileName(targetEnvironment));

			if (currentDbExists) {
				try {
					await remove(targetPath);
				} catch {
					console.warn("Could not remove existing database");
				}
				for (const suffix of ["-wal", "-shm"]) {
					const f = `${targetPath}${suffix}`;
					if (await exists(f)) {
						try {
							await remove(f);
						} catch {
							// Ignore
						}
					}
				}
			}

			await copyFile(backupFilePath, targetPath);
			console.log(`Restored ${filename} → ${targetEnvironment}`);

			await this.cleanupOldBackups();

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

	// ── Migration helpers ────────────────────────────────────────────────────

	private canMigrate(fromVersion: string, toVersion: string): boolean {
		if (fromVersion === toVersion) return true;
		if (this.compareVersions(fromVersion, toVersion) > 0) return false;
		let current = fromVersion;
		while (current !== toVersion) {
			const next = MIGRATIONS.find((m) => m.fromVersion === current);
			if (!next) return this.compareVersions(fromVersion, toVersion) <= 0;
			current = next.toVersion;
		}
		return true;
	}

	private compareVersions(v1: string, v2: string): number {
		const p1 = v1.split(".").map(Number);
		const p2 = v2.split(".").map(Number);
		for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
			const diff = (p1[i] || 0) - (p2[i] || 0);
			if (diff !== 0) return diff;
		}
		return 0;
	}

	getMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
		const path: MigrationStep[] = [];
		let current = fromVersion;
		while (current !== toVersion) {
			const next = MIGRATIONS.find((m) => m.fromVersion === current);
			if (!next) break;
			path.push(next);
			current = next.toVersion;
		}
		return path;
	}

	// ── Misc helpers ─────────────────────────────────────────────────────────

	async getExpenseExportPath(backupFilename: string): Promise<string | null> {
		const backupPath = await this.getBackupPath();
		const exportPath = joinPath(backupPath, backupFilename.replace(".db", "-expenses.json"));
		return (await exists(exportPath)) ? exportPath : null;
	}

	async setCustomBackupPath(path: string | null): Promise<boolean> {
		try {
			if (path && !(await exists(path))) await mkdir(path, { recursive: true });
			this.settings.customBackupPath = path;
			await this.saveSettings(this.settings);
			return true;
		} catch (error) {
			console.error("Failed to set custom backup path:", error);
			return false;
		}
	}

	async getDefaultDocumentsPath(): Promise<string> {
		return joinPath(await documentDir(), "SecondBrain-Backups");
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
			await openPath(await this.getBackupPath());
		} catch (error) {
			console.error("Failed to open backup folder:", error);
		}
	}

	/**
	 * Read data from a backup file without modifying the current database.
	 * Used for merge operations.
	 */
	async readBackupData(filename: string): Promise<{
		success: boolean;
		data?: {
			notes: Note[];
			folders: Folder[];
			tags: Record<string, Tag>;
			expenses: AppData["expenses"];
			income: AppData["income"];
		};
		error?: string;
	}> {
		let tempDb: Database | null = null;
		try {
			const backupPath = await this.getBackupPath();
			const backupFilePath = joinPath(backupPath, filename);

			if (!(await exists(backupFilePath))) {
				return { success: false, error: "Backup file not found" };
			}

			// Open the backup database directly (read-only)
			tempDb = await Database.load(`sqlite:${backupFilePath}`);

			// Read notes
			const notesResults = await tempDb.select<
				Array<{
					id: string;
					title: string;
					content: string;
					tags: string;
					folder: string;
					reminder: string | null;
					createdAt: string;
					updatedAt: string;
					archived: number;
				}>
			>("SELECT * FROM notes");

			const notes: Note[] = notesResults.map((row) => ({
				id: row.id,
				title: row.title,
				content: row.content,
				tags: row.tags ? JSON.parse(row.tags) : [],
				folder: row.folder || "inbox",
				reminder: row.reminder ? JSON.parse(row.reminder) : null,
				createdAt: new Date(row.createdAt),
				updatedAt: new Date(row.updatedAt),
				archived: Boolean(row.archived),
			}));

			// Read folders
			let folders: Folder[] = [];
			try {
				const foldersResults = await tempDb.select<
					Array<{
						id: string;
						name: string;
						parentId: string | null;
						icon: string | null;
						archived: number;
						order: number;
						createdAt: string;
						updatedAt: string;
					}>
				>("SELECT * FROM folders_new ORDER BY `order`");

				folders = foldersResults.map((row) => ({
					id: row.id,
					name: row.name,
					parentId: row.parentId,
					// Resolve icon name to component using ICON_MAP
					icon: row.icon && ICON_MAP[row.icon] ? ICON_MAP[row.icon] : undefined,
					archived: Boolean(row.archived),
					order: row.order,
					createdAt: new Date(row.createdAt),
					updatedAt: new Date(row.updatedAt),
				}));
			} catch {
				// Table might not exist in old backups
			}

			// Read tags
			const tags: Record<string, Tag> = {};
			try {
				const tagsResults =
					await tempDb.select<
						Array<{ id: string; name: string; color: string; icon: string }>
					>("SELECT * FROM tags");

				for (const row of tagsResults) {
					tags[row.id] = {
						id: row.id,
						name: row.name,
						color: row.color,
						// Resolve icon name to component using ICON_MAP
						icon: row.icon && ICON_MAP[row.icon] ? ICON_MAP[row.icon] : ICON_MAP["Tag"],
					};
				}
			} catch {
				// Table might not exist
			}

			// Read expenses
			const expensesResults = await tempDb.select<RawExpenseData[]>("SELECT * FROM expenses");

			const expenses: Expense[] = expensesResults.map((row) => ({
				id: row.id,
				name: row.name,
				amount: row.amount,
				category: row.category,
				paymentMethod: row.paymentMethod || "None",
				dueDate: row.dueDate ? new Date(row.dueDate) : null,
				isRecurring: row.isRecurring === 1 || row.isRecurring === true,
				recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined,
				isArchived: row.isArchived === 1 || row.isArchived === true,
				isPaid: row.isPaid === 1 || row.isPaid === true,
				paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
				type: (row.type || "need") as Expense["type"],
				importance: (row.importance || "none") as Expense["importance"],
				notify: false,
				createdAt: new Date(row.createdAt),
				updatedAt: new Date(row.updatedAt),
				parentExpenseId: row.parentExpenseId || undefined,
				monthlyOverrides: row.monthlyOverrides ? JSON.parse(row.monthlyOverrides) : {},
				isModified: row.isModified === 1 || row.isModified === true,
				initialState:
					row.initialState ?
						(() => {
							const parsed = JSON.parse(row.initialState);
							return {
								amount: parsed.amount,
								dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
								paymentMethod: parsed.paymentMethod || "None",
							};
						})()
					:	undefined,
				subscriptionStatus:
					(row.subscriptionStatus as Expense["subscriptionStatus"]) || undefined,
			}));

			// Read expense settings
			const settingsResults = await tempDb.select<Array<{ key: string; value: string }>>(
				"SELECT key, value FROM settings WHERE key LIKE 'expense_%'",
			);

			const settingsMap: Record<string, unknown> = {};
			for (const row of settingsResults) {
				try {
					settingsMap[row.key] = JSON.parse(row.value);
				} catch {
					settingsMap[row.key] = row.value;
				}
			}

			// Read income entries
			const incomeResults = await tempDb.select<
				Array<{
					id: string;
					date: string;
					amount: number;
					hours: number | null;
					minutes: number | null;
				}>
			>("SELECT * FROM income_entries");

			const incomeEntries = incomeResults.map((row) => ({
				id: row.id,
				date: row.date,
				amount: row.amount,
				hours: row.hours || undefined,
				minutes: row.minutes || undefined,
			}));

			// Read weekly targets
			const targetsResults = await tempDb.select<Array<{ id: string; amount: number }>>(
				"SELECT * FROM income_weekly_targets",
			);

			// Parse and validate overviewMode
			const rawOverviewMode = settingsMap.expense_overviewMode as string | undefined;
			const validOverviewModes: OverviewMode[] = ["required", "all", "remaining"];
			const overviewMode: OverviewMode =
				rawOverviewMode && validOverviewModes.includes(rawOverviewMode as OverviewMode) ?
					(rawOverviewMode as OverviewMode)
				:	"remaining";

			return {
				success: true,
				data: {
					notes,
					folders,
					tags,
					expenses: {
						expenses,
						selectedMonth:
							settingsMap.expense_selectedMonth ?
								new Date(settingsMap.expense_selectedMonth as string)
							:	new Date(),
						overviewMode,
						categories:
							(settingsMap.expense_categories as string[]) ||
							DEFAULT_EXPENSE_CATEGORIES,
						categoryColors:
							(settingsMap.expense_categoryColors as Record<string, string>) ||
							DEFAULT_CATEGORY_COLORS,
						paymentMethods:
							(settingsMap.expense_paymentMethods as string[]) ||
							DEFAULT_PAYMENT_METHODS,
					},
					income: {
						entries: incomeEntries,
						weeklyTargets: targetsResults,
						viewType: "weekly",
					},
				},
			};
		} catch (error) {
			console.error("Failed to read backup data:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
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

	destroy(): void {
		if (this.autoBackupInterval) {
			clearInterval(this.autoBackupInterval);
			this.autoBackupInterval = null;
		}
	}
}

export const backupService = new BackupService();
