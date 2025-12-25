import type { Expense, OccurrenceInitialState } from "./expense";

export type DatabaseEnvironment = "production" | "test";

// Serialized expense type for JSON export (dates are ISO strings)
export interface SerializedExpense
	extends Omit<
		Expense,
		"dueDate" | "paymentDate" | "createdAt" | "updatedAt" | "initialState"
	> {
	dueDate: string | null;
	paymentDate: string | null;
	createdAt: string;
	updatedAt: string;
	initialState?: Omit<OccurrenceInitialState, "dueDate"> & {
		dueDate: string | null;
	};
}

export interface BackupMetadata {
	id: string;
	createdAt: Date;
	version: string; // Data schema version
	environment: DatabaseEnvironment;
	description?: string;
	fileSize?: number;
	hasExpenseExport?: boolean; // Indicates if JSON export exists
}

export interface BackupSettings {
	// Backup location
	customBackupPath: string | null; // null = use default app data location

	// Auto-backup
	autoBackupEnabled: boolean;
	autoBackupIntervalHours: number; // 0 = disabled, otherwise backup every N hours
	maxAutoBackups: number; // Maximum number of auto-backups to keep

	// Database environment
	databaseEnvironment: DatabaseEnvironment;
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
	customBackupPath: null,
	autoBackupEnabled: true,
	autoBackupIntervalHours: 24, // Daily backups
	maxAutoBackups: 7, // Keep a week's worth
	databaseEnvironment: "production",
};

export interface BackupInfo {
	filename: string;
	metadata: BackupMetadata;
	path: string;
	expenseExportPath?: string; // Path to JSON export if it exists
}

export interface BackupResult {
	success: boolean;
	backup?: BackupInfo;
	error?: string;
}

export interface RestoreResult {
	success: boolean;
	error?: string;
	requiresMigration?: boolean;
	sourceVersion?: string;
	targetVersion?: string;
}

// Expense export types
export interface ExpenseExportData {
	version: string;
	exportedAt: string;
	data: {
		expenses: SerializedExpense[];
		categories: string[];
		categoryColors: Record<string, string>;
		paymentMethods: string[];
		selectedMonth: string;
		overviewMode: string;
	};
}

export interface ImportResult {
	success: boolean;
	error?: string;
	importedCount?: number;
	skippedCount?: number;
}

// Migration types for handling version differences
export interface MigrationStep {
	fromVersion: string;
	toVersion: string;
	migrate: (data: unknown) => unknown;
	description: string;
}
