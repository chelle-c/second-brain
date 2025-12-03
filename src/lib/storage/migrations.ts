import Database from "@tauri-apps/plugin-sql";

export interface MigrationResult {
	needed: boolean;
	success: boolean;
	error?: string;
}

/**
 * Check if the database has the legacy schema (category column instead of tags)
 */
export async function hasLegacyNotesSchema(db: Database): Promise<boolean> {
	try {
		const tableInfo = await db.select<Array<{ name: string }>>("PRAGMA table_info(notes)");
		const columnNames = tableInfo.map((col) => col.name);

		// Legacy schema has 'category' column but not 'tags' or 'archived'
		return columnNames.includes("category") && !columnNames.includes("tags");
	} catch {
		return false;
	}
}

/**
 * Migrate notes from legacy schema to new schema
 * This recreates the notes table with the new schema
 */
export async function migrateNotesTable(db: Database): Promise<MigrationResult> {
	try {
		// Check if migration is needed
		const needsMigration = await hasLegacyNotesSchema(db);

		if (!needsMigration) {
			return { needed: false, success: true };
		}

		console.log("Starting notes table migration...");

		// Step 1: Read all existing notes from legacy table
		const existingNotes = await db.select<
			Array<{
				id: string;
				title: string;
				content: string;
				category?: string;
				folder: string;
				createdAt: string;
				updatedAt: string;
			}>
		>("SELECT * FROM notes");

		console.log(`Found ${existingNotes.length} notes to migrate`);

		// Step 2: Rename old table
		await db.execute("ALTER TABLE notes RENAME TO notes_legacy");

		// Step 3: Create new table with correct schema
		await db.execute(`
			CREATE TABLE notes (
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

		// Step 4: Migrate data
		for (const note of existingNotes) {
			// Convert category to tags array (if category exists and isn't uncategorized)
			let tags: string[] = [];
			if (note.category && note.category !== "uncategorized") {
				tags = [note.category];
			}

			await db.execute(
				`INSERT INTO notes (id, title, content, tags, folder, createdAt, updatedAt, archived)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					note.id,
					note.title,
					note.content,
					JSON.stringify(tags),
					note.folder,
					note.createdAt,
					note.updatedAt,
					0, // Not archived by default
				]
			);
		}

		// Step 5: Drop legacy table
		await db.execute("DROP TABLE notes_legacy");

		console.log(`Successfully migrated ${existingNotes.length} notes`);

		return { needed: true, success: true };
	} catch (error) {
		console.error("Migration failed:", error);

		// Try to recover by restoring the legacy table if it exists
		try {
			const tables = await db.select<Array<{ name: string }>>(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='notes_legacy'"
			);

			if (tables.length > 0) {
				// Drop the partially created new table if it exists
				await db.execute("DROP TABLE IF EXISTS notes");
				// Restore the legacy table
				await db.execute("ALTER TABLE notes_legacy RENAME TO notes");
				console.log("Restored legacy table after failed migration");
			}
		} catch (recoveryError) {
			console.error("Recovery also failed:", recoveryError);
		}

		return {
			needed: true,
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Ensure the tags table exists
 */
export async function ensureTagsTable(db: Database): Promise<void> {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			color TEXT NOT NULL,
			icon TEXT NOT NULL
		)
	`);
}

/**
 * Ensure the migrations tracking table exists
 */
export async function ensureMigrationsTable(db: Database): Promise<void> {
	await db.execute(`
		CREATE TABLE IF NOT EXISTS migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL,
			description TEXT
		)
	`);
}

/**
 * Record that a migration was applied
 */
export async function recordMigration(
	db: Database,
	version: string,
	description: string
): Promise<void> {
	await db.execute(
		"INSERT OR REPLACE INTO migrations (version, applied_at, description) VALUES (?, ?, ?)",
		[version, new Date().toISOString(), description]
	);
}

/**
 * Check if a specific migration has been applied
 */
export async function isMigrationApplied(db: Database, version: string): Promise<boolean> {
	const results = await db.select<Array<{ version: string }>>(
		"SELECT version FROM migrations WHERE version = ?",
		[version]
	);
	return results.length > 0;
}
