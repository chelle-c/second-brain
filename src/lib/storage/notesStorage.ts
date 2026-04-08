import type { Folder, Note, NoteReminder, NotesFolders, Tag } from "@/types/notes";
import type { DatabaseContext } from "@/types/storage";
import { deepEqual } from "@/lib/utils";
import { serializeIconField, deserializeIconField, DEFAULT_TAG_ICON } from "@/lib/icons";

interface NormalizedNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	reminder: string | null;
	icon: string | null;
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

// ── helper: serialize / deserialize reminder ────────────────────────────────
function serializeReminder(reminder: NoteReminder | null | undefined): string | null {
	if (!reminder) return null;
	return JSON.stringify(reminder);
}

function deserializeReminder(raw: string | null | undefined): NoteReminder | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as NoteReminder;
	} catch {
		return null;
	}
}

export class NotesStorage {
	private context: DatabaseContext;
	constructor(context: DatabaseContext) {
		this.context = context;
	}

	// ── change-detection helpers ──────────────────────────────────────────────
	private normalizeNotes(notes: Note[]): NormalizedNote[] {
		return notes
			.map((note) => ({
				id: note.id,
				title: note.title,
				content: note.content,
				folder: note.folder,
				reminder: serializeReminder(note.reminder),
				icon: note.icon || null,
				createdAt:
					note.createdAt instanceof Date ?
						note.createdAt.toISOString()
					:	String(note.createdAt),
				updatedAt:
					note.updatedAt instanceof Date ?
						note.updatedAt.toISOString()
					:	String(note.updatedAt),
				tags: note.tags || [],
				archived: note.archived || false,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	hasNotesChanged(newNotes: Note[]): boolean {
		if (!this.context.cache.notes) return true;
		return !deepEqual(
			this.normalizeNotes(this.context.cache.notes),
			this.normalizeNotes(newNotes),
		);
	}

	hasFoldersChanged(newFolders: Folder[]): boolean {
		if (!this.context.cache.folders) return true;
		return !deepEqual(this.context.cache.folders, newFolders);
	}

	hasTagsChanged(newTags: Record<string, Tag>): boolean {
		if (!this.context.cache.tags) return true;
		const normalizeTagsForComparison = (tags: Record<string, Tag>) => {
			const normalized: Record<
				string,
				{ id: string; name: string; color: string; iconName: string | null }
			> = {};
			for (const [id, tag] of Object.entries(tags)) {
				normalized[id] = {
					id: tag.id,
					name: tag.name,
					color: tag.color,
					iconName: serializeIconField(tag.icon, tag.emoji),
				};
			}
			return normalized;
		};
		return !deepEqual(
			normalizeTagsForComparison(this.context.cache.tags),
			normalizeTagsForComparison(newTags),
		);
	}

	// ── legacy helpers ────────────────────────────────────────────────────────
	private convertLegacyFolders(oldFolders: NotesFolders): Folder[] {
		const folders: Folder[] = [];
		let order = 0;
		for (const [id, oldFolder] of Object.entries(oldFolders)) {
			folders.push({
				id,
				name: oldFolder.name,
				parentId: oldFolder.parent || null,
				icon: oldFolder.icon,
				archived: false,
				order: order++,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			if (oldFolder.children?.length) {
				for (const child of oldFolder.children) {
					folders.push({
						id: child.id,
						name: child.name,
						parentId: id,
						icon: child.icon,
						archived: false,
						order: order++,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}
			}
		}
		return folders;
	}

	createInitialFolders(): Folder[] {
		const now = new Date();
		return [
			{
				id: "inbox",
				name: "Inbox",
				parentId: null,
				archived: false,
				order: 0,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "personal",
				name: "Personal",
				parentId: null,
				archived: false,
				order: 1,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "personal_health",
				name: "Health",
				parentId: "personal",
				archived: false,
				order: 2,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "personal_finance",
				name: "Finance",
				parentId: "personal",
				archived: false,
				order: 3,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "work",
				name: "Work",
				parentId: null,
				archived: false,
				order: 4,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "work_projects",
				name: "Projects",
				parentId: "work",
				archived: false,
				order: 5,
				createdAt: now,
				updatedAt: now,
			},
		];
	}

	// ── Notes CRUD ────────────────────────────────────────────────────────────
	async loadNotes(): Promise<Note[]> {
		return this.context.queueOperation(async () => {
			try {
				const tableInfo = await this.context
					.getDb()
					.select<Array<{ name: string }>>("PRAGMA table_info(notes)");
				const columnNames = tableInfo.map((col) => col.name);
				const hasFolder = columnNames.includes("folder");
				const hasFolderId = columnNames.includes("folderId");
				const hasReminder = columnNames.includes("reminder");
				const hasIcon = columnNames.includes("icon");

				let query = "SELECT id, title, content, tags, createdAt, updatedAt, archived";
				if (hasFolder) query += ", folder";
				if (hasFolderId && !hasFolder) query += ", folderId";
				if (hasReminder) query += ", reminder";
				if (hasIcon) query += ", icon";
				query += " FROM notes";

				const results = await this.context.getDb().select<
					Array<{
						id: string;
						title: string;
						content: string;
						tags: string;
						folder?: string;
						folderId?: string;
						reminder?: string | null;
						icon?: string | null;
						createdAt: string;
						updatedAt: string;
						archived: number;
					}>
				>(query);

				const notes: Note[] = results.map((row) => ({
					id: row.id,
					title: row.title,
					content: row.content,
					tags: row.tags ? JSON.parse(row.tags) : [],
					folder: row.folder || row.folderId || "inbox",
					reminder: deserializeReminder(row.reminder),
					icon: row.icon || null,
					createdAt: new Date(row.createdAt),
					updatedAt: new Date(row.updatedAt),
					archived: Boolean(row.archived),
				}));

				this.context.cache.notes = notes;
				return notes;
			} catch (error) {
				console.error("Error loading notes:", error);
				return [];
			}
		});
	}

	async saveNotes(notes: Note[]): Promise<void> {
		if (!this.hasNotesChanged(notes)) return;
		return this.context.queueOperation(async () => {
			const oldNotes = this.context.cache.notes || [];
			const oldIds = new Set(oldNotes.map((n) => n.id));
			const newIds = new Set(notes.map((n) => n.id));
			const added = notes.filter((n) => !oldIds.has(n.id));
			const deleted = oldNotes.filter((n) => !newIds.has(n.id));
			const modified = notes.filter((n) => {
				if (!oldIds.has(n.id)) return false;
				const old = oldNotes.find((o) => o.id === n.id);
				if (!old) return false;
				return !deepEqual(this.normalizeNotes([old]), this.normalizeNotes([n]));
			});

			const db = this.context.getDb();

			try {
				const tableInfo = await db.select<Array<{ name: string }>>(
					"PRAGMA table_info(notes)",
				);
				if (!tableInfo.some((col) => col.name === "icon")) {
					await db.execute("ALTER TABLE notes ADD COLUMN icon TEXT DEFAULT NULL");
				}
			} catch {
				/* column may already exist */
			}

			await db.execute("BEGIN TRANSACTION");
			try {
				await db.execute("DELETE FROM notes");
				for (const note of notes) {
					await db.execute(
						`INSERT INTO notes (id, title, content, tags, folder, reminder, icon, createdAt, updatedAt, archived)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
						[
							note.id,
							note.title,
							note.content,
							JSON.stringify(note.tags || []),
							note.folder || "inbox",
							serializeReminder(note.reminder),
							note.icon || null,
							note.createdAt instanceof Date ?
								note.createdAt.toISOString()
							:	note.createdAt,
							note.updatedAt instanceof Date ?
								note.updatedAt.toISOString()
							:	note.updatedAt,
							note.archived ? 1 : 0,
						],
					);
				}
				await db.execute("COMMIT");
			} catch (error) {
				await db.execute("ROLLBACK");
				throw error;
			}

			this.context.cache.notes = notes;

			if (added.length === 1) console.log(`Note created: "${added[0].title}"`);
			else if (added.length > 1) console.log(`${added.length} notes created`);
			if (deleted.length === 1) console.log(`Note deleted: "${deleted[0].title}"`);
			else if (deleted.length > 1) console.log(`${deleted.length} notes deleted`);
			if (modified.length === 1) console.log(`Note updated: "${modified[0].title}"`);
			else if (modified.length > 1) console.log(`${modified.length} notes updated`);
		});
	}

	// ── Folders ───────────────────────────────────────────────────────────────
	async loadFolders(): Promise<Folder[]> {
		return this.context.queueOperation(async () => {
			try {
				const tables = await this.context
					.getDb()
					.select<
						Array<{ name: string }>
					>("SELECT name FROM sqlite_master WHERE type='table' AND name='folders_new'");
				if (tables.length === 0) {
					const initial = this.createInitialFolders();
					this.context.cache.folders = initial;
					return initial;
				}
				const results = await this.context.getDb().select<
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

				if (results.length === 0) {
					const initial = this.createInitialFolders();
					this.context.cache.folders = initial;
					return initial;
				}

				const folders = results.map((row) => {
					const { icon, emoji } = deserializeIconField(row.icon);
					return {
						id: row.id,
						name: row.name,
						parentId: row.parentId,
						icon,
						emoji,
						archived: Boolean(row.archived),
						order: row.order,
						createdAt: new Date(row.createdAt),
						updatedAt: new Date(row.updatedAt),
					};
				});
				this.context.cache.folders = folders;
				return folders;
			} catch (error) {
				console.error("Error loading folders:", error);
				try {
					const results = await this.context
						.getDb()
						.select<Array<{ data: string }>>("SELECT data FROM folders WHERE id = 1");
					if (results.length > 0) {
						const oldFolders: NotesFolders = JSON.parse(results[0].data);
						const newFolders = this.convertLegacyFolders(oldFolders);
						this.context.cache.folders = newFolders;
						return newFolders;
					}
				} catch (legacyError) {
					console.error("Error loading legacy folders:", legacyError);
				}
				const initial = this.createInitialFolders();
				this.context.cache.folders = initial;
				return initial;
			}
		});
	}

	private sortFoldersForInsert(folders: Folder[]): Folder[] {
		const sorted: Folder[] = [];
		const inserted = new Set<string>();
		const remaining = [...folders];
		while (remaining.length > 0) {
			const beforeLength = remaining.length;
			for (let i = remaining.length - 1; i >= 0; i--) {
				const folder = remaining[i];
				if (!folder.parentId || inserted.has(folder.parentId)) {
					sorted.push(folder);
					inserted.add(folder.id);
					remaining.splice(i, 1);
				}
			}
			if (remaining.length === beforeLength) {
				for (const folder of remaining) sorted.push({ ...folder, parentId: null });
				break;
			}
		}
		return sorted;
	}

	async saveFolders(folders: Folder[]): Promise<void> {
		if (!Array.isArray(folders)) {
			console.error("saveFolders called with non-array:", folders);
			return;
		}
		if (!this.hasFoldersChanged(folders)) return;

		return this.context.queueOperation(async () => {
			const db = this.context.getDb();
			await db.execute("BEGIN TRANSACTION");
			try {
				await db.execute("DELETE FROM folders_new");
				const sortedFolders = this.sortFoldersForInsert(folders);
				for (const folder of sortedFolders) {
					await db.execute(
						`INSERT INTO folders_new (id, name, parentId, icon, archived, \`order\`, createdAt, updatedAt)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
						[
							folder.id,
							folder.name,
							folder.parentId,
							serializeIconField(folder.icon, folder.emoji),
							folder.archived ? 1 : 0,
							folder.order || 0,
							folder.createdAt ?
								folder.createdAt instanceof Date ?
									folder.createdAt.toISOString()
								:	folder.createdAt
							:	new Date().toISOString(),
							folder.updatedAt ?
								folder.updatedAt instanceof Date ?
									folder.updatedAt.toISOString()
								:	folder.updatedAt
							:	new Date().toISOString(),
						],
					);
				}
				await db.execute("COMMIT");
			} catch (error) {
				await db.execute("ROLLBACK");
				throw error;
			}
			this.context.cache.folders = folders;
		});
	}

	// ── Tags ──────────────────────────────────────────────────────────────────
	async loadTags(): Promise<Record<string, Tag>> {
		return this.context.queueOperation(async () => {
			try {
				const results = await this.context
					.getDb()
					.select<
						Array<{ id: string; name: string; color: string; icon: string }>
					>("SELECT * FROM tags");

				const tags: Record<string, Tag> = {};
				results.forEach((row) => {
					const { icon, emoji } = deserializeIconField(row.icon);
					tags[row.id] = {
						id: row.id,
						name: row.name,
						color: row.color,
						icon: icon || DEFAULT_TAG_ICON,
						emoji,
					};
				});
				this.context.cache.tags = tags;
				return tags;
			} catch (error) {
				console.error("Error loading tags:", error);
				return {};
			}
		});
	}

	async saveTags(tags: Record<string, Tag>): Promise<void> {
		if (!this.hasTagsChanged(tags)) return;
		return this.context.queueOperation(async () => {
			const db = this.context.getDb();
			await db.execute("BEGIN TRANSACTION");
			try {
				await db.execute("DELETE FROM tags");
				for (const [, tag] of Object.entries(tags)) {
					const iconStr = serializeIconField(tag.icon, tag.emoji) || "Tag";
					await db.execute(
						`INSERT INTO tags (id, name, color, icon) VALUES (?, ?, ?, ?)`,
						[tag.id, tag.name, tag.color, iconStr],
					);
				}
				await db.execute("COMMIT");
			} catch (error) {
				await db.execute("ROLLBACK");
				throw error;
			}
			this.context.cache.tags = tags;
		});
	}
}
