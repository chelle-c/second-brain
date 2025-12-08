export type DatabaseEnvironment = "production" | "test";

export interface BackupMetadata {
	id: string;
	createdAt: Date;
	version: string; // Data schema version
	environment: DatabaseEnvironment;
	description?: string;
	fileSize?: number;
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

// Migration types for handling version differences
export interface MigrationStep {
	fromVersion: string;
	toVersion: string;
	migrate: (data: any) => any;
	description: string;
}
