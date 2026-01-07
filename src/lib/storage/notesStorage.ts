import type { Folder, Note, NotesFolders, Tag } from "@/types/notes";
import type { DatabaseContext } from "../../types/storage";
import { deepEqual } from "../utils";
import {
	Circle,
	Club,
	Diamond,
	Folder as FolderIcon,
	Heart,
	Spade,
	Sparkles,
	Square,
	Star,
	Triangle,
	X,
	type LucideIcon,
} from "lucide-react";

interface NormalizedNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

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
};

const getIconName = (icon: LucideIcon | undefined): string | null => {
	if (!icon) return null;

	for (const [name, component] of Object.entries(ICON_MAP)) {
		if (component === icon) {
			return name;
		}
	}

	return null;
};

export class NotesStorage {
	private context: DatabaseContext;

	constructor(context: DatabaseContext) {
		this.context = context;
	}

	private normalizeNotes(notes: Note[]): NormalizedNote[] {
		return notes
			.map((note) => ({
				id: note.id,
				title: note.title,
				content: note.content,
				folder: note.folder,
				createdAt:
					note.createdAt instanceof Date
						? note.createdAt.toISOString()
						: String(note.createdAt),
				updatedAt:
					note.updatedAt instanceof Date
						? note.updatedAt.toISOString()
						: String(note.updatedAt),
				tags: note.tags || [],
				archived: note.archived || false,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	hasNotesChanged(newNotes: Note[]): boolean {
		if (!this.context.cache.notes) return true;

		const normalized1 = this.normalizeNotes(this.context.cache.notes);
		const normalized2 = this.normalizeNotes(newNotes);

		return !deepEqual(normalized1, normalized2);
	}

	hasFoldersChanged(newFolders: Folder[]): boolean {
		if (!this.context.cache.folders) return true;
		return !deepEqual(this.context.cache.folders, newFolders);
	}

	hasTagsChanged(newTags: Record<string, Tag>): boolean {
		if (!this.context.cache.tags) return true;
		return !deepEqual(this.context.cache.tags, newTags);
	}

	// Convert old folder structure to new flat structure
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

			if (oldFolder.children && oldFolder.children.length > 0) {
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

	async loadNotes(): Promise<Note[]> {
		return this.context.queueOperation(async () => {
			try {
				const tableInfo = await this.context.db.select<Array<{ name: string }>>(
					"PRAGMA table_info(notes)"
				);

				const columnNames = tableInfo.map((col) => col.name);
				const hasFolder = columnNames.includes("folder");
				const hasFolderId = columnNames.includes("folderId");

				let query = "SELECT id, title, content, tags, createdAt, updatedAt, archived";

				if (hasFolder) {
					query += ", folder";
				}
				if (hasFolderId && !hasFolder) {
					query += ", folderId";
				}

				query += " FROM notes";

				const results = await this.context.db.select<
					Array<{
						id: string;
						title: string;
						content: string;
						tags: string;
						folder?: string;
						folderId?: string;
						createdAt: string;
						updatedAt: string;
						archived: number;
					}>
				>(query);

				const notes = results.map((row) => {
					// Prefer folder, fallback to folderId, then to inbox
					const folder = row.folder || row.folderId || "inbox";

					return {
						id: row.id,
						title: row.title,
						content: row.content,
						tags: row.tags ? JSON.parse(row.tags) : [],
						folder,
						createdAt: new Date(row.createdAt),
						updatedAt: new Date(row.updatedAt),
						archived: Boolean(row.archived),
					};
				});

				this.context.cache.notes = notes;
				return notes;
			} catch (error) {
				console.error("Error loading notes:", error);
				return [];
			}
		});
	}

	async saveNotes(notes: Note[]): Promise<void> {
		if (!this.hasNotesChanged(notes)) {
			return;
		}

		return this.context.queueOperation(async () => {
			const oldNotes = this.context.cache.notes || [];
			const oldIds = new Set(oldNotes.map((n) => n.id));
			const newIds = new Set(notes.map((n) => n.id));

			const added = notes.filter((n) => !oldIds.has(n.id));
			const deleted = oldNotes.filter((n) => !newIds.has(n.id));
			const modified = notes.filter((n) => {
				if (!oldIds.has(n.id)) return false;
				const old = oldNotes.find((o) => o.id === n.id);
				return (
					old &&
					!deepEqual(
						{
							...old,
							createdAt:
								old.createdAt instanceof Date
									? old.createdAt.toISOString()
									: old.createdAt,
							updatedAt:
								old.updatedAt instanceof Date
									? old.updatedAt.toISOString()
									: old.updatedAt,
						},
						{
							...n,
							createdAt:
								n.createdAt instanceof Date
									? n.createdAt.toISOString()
									: n.createdAt,
							updatedAt:
								n.updatedAt instanceof Date
									? n.updatedAt.toISOString()
									: n.updatedAt,
						}
					)
				);
			});

			await this.context.db.execute("DELETE FROM notes");

			for (const note of notes) {
				const folder = note.folder || "inbox";

				await this.context.db.execute(
					`INSERT INTO notes (id, title, content, tags, folder, createdAt, updatedAt, archived)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						note.id,
						note.title,
						note.content,
						JSON.stringify(note.tags || []),
						folder,
						note.createdAt instanceof Date
							? note.createdAt.toISOString()
							: note.createdAt,
						note.updatedAt instanceof Date
							? note.updatedAt.toISOString()
							: note.updatedAt,
						note.archived ? 1 : 0,
					]
				);
			}

			this.context.cache.notes = notes;

			if (added.length === 1) {
				console.log(`Note created: "${added[0].title}"`);
			} else if (added.length > 1) {
				console.log(`${added.length} notes created`);
			}
			if (deleted.length === 1) {
				console.log(`Note deleted: "${deleted[0].title}"`);
			} else if (deleted.length > 1) {
				console.log(`${deleted.length} notes deleted`);
			}
			if (modified.length === 1) {
				console.log(`Note updated: "${modified[0].title}"`);
			} else if (modified.length > 1) {
				console.log(`${modified.length} notes updated`);
			}
		});
	}

	async loadFolders(): Promise<Folder[]> {
		return this.context.queueOperation(async () => {
			try {
				const tables = await this.context.db.select<Array<{ name: string }>>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='folders_new'"
				);

				if (tables.length === 0) {
					const initialFolders = this.createInitialFolders();
					this.context.cache.folders = initialFolders;
					return initialFolders;
				}

				const results = await this.context.db.select<
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
					const initialFolders = this.createInitialFolders();
					this.context.cache.folders = initialFolders;
					return initialFolders;
				}

				const folders = results.map((row) => {
					const icon = row.icon && ICON_MAP[row.icon] ? ICON_MAP[row.icon] : undefined;

					return {
						id: row.id,
						name: row.name,
						parentId: row.parentId,
						icon,
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
					const results = await this.context.db.select<Array<{ data: string }>>(
						"SELECT data FROM folders WHERE id = 1"
					);

					if (results.length > 0) {
						const oldFolders: NotesFolders = JSON.parse(results[0].data);
						const newFolders = this.convertLegacyFolders(oldFolders);
						this.context.cache.folders = newFolders;
						return newFolders;
					}
				} catch (legacyError) {
					console.error("Error loading legacy folders:", legacyError);
				}

				const initialFolders = this.createInitialFolders();
				this.context.cache.folders = initialFolders;
				return initialFolders;
			}
		});
	}

	// Sort folders so parents are inserted before children (topological sort)
	private sortFoldersForInsert(folders: Folder[]): Folder[] {
		const sorted: Folder[] = [];
		const inserted = new Set<string>();
		const remaining = [...folders];

		// Keep iterating until all folders are sorted
		while (remaining.length > 0) {
			const beforeLength = remaining.length;

			for (let i = remaining.length - 1; i >= 0; i--) {
				const folder = remaining[i];
				// Insert if no parent or parent already inserted
				if (!folder.parentId || inserted.has(folder.parentId)) {
					sorted.push(folder);
					inserted.add(folder.id);
					remaining.splice(i, 1);
				}
			}

			// If no progress was made, there's a circular reference or missing parent
			// Insert remaining folders anyway (with null parentId to avoid FK error)
			if (remaining.length === beforeLength) {
				for (const folder of remaining) {
					sorted.push({ ...folder, parentId: null });
				}
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

		if (!this.hasFoldersChanged(folders)) {
			return;
		}

		return this.context.queueOperation(async () => {
			await this.context.db.execute("DELETE FROM folders_new");

			// Sort folders so parents are inserted before children
			const sortedFolders = this.sortFoldersForInsert(folders);

			for (const folder of sortedFolders) {
				const iconName = getIconName(folder.icon);

				await this.context.db.execute(
					`INSERT INTO folders_new (id, name, parentId, icon, archived, \`order\`, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						folder.id,
						folder.name,
						folder.parentId,
						iconName,
						folder.archived ? 1 : 0,
						folder.order || 0,
						folder.createdAt
							? folder.createdAt instanceof Date
								? folder.createdAt.toISOString()
								: folder.createdAt
							: new Date().toISOString(),
						folder.updatedAt
							? folder.updatedAt instanceof Date
								? folder.updatedAt.toISOString()
								: folder.updatedAt
							: new Date().toISOString(),
					]
				);
			}

			this.context.cache.folders = folders;
		});
	}

	async loadTags(): Promise<Record<string, Tag>> {
		return this.context.queueOperation(async () => {
			const results = await this.context.db.select<
				Array<{
					id: string;
					name: string;
					color: string;
					icon: string;
				}>
			>("SELECT * FROM tags");

			const tags: Record<string, Tag> = {};
			results.forEach((row) => {
				tags[row.id] = {
					id: row.id,
					name: row.name,
					color: row.color,
					icon: row.icon as unknown as Tag["icon"],
				};
			});

			this.context.cache.tags = tags;
			return tags;
		});
	}

	async saveTags(tags: Record<string, Tag>): Promise<void> {
		if (!this.hasTagsChanged(tags)) {
			return;
		}

		return this.context.queueOperation(async () => {
			await this.context.db.execute("DELETE FROM tags");

			for (const [, tag] of Object.entries(tags)) {
				let iconName = "Hash";
				if (typeof tag.icon === "function") {
					const iconComponent = tag.icon as unknown as {
						displayName?: string;
						name?: string;
					};
					iconName = iconComponent.displayName || iconComponent.name || "Hash";
				} else if (typeof tag.icon === "string") {
					iconName = tag.icon;
				}

				await this.context.db.execute(
					`INSERT INTO tags (id, name, color, icon)
					VALUES (?, ?, ?, ?)`,
					[tag.id, tag.name, tag.color, iconName]
				);
			}

			this.context.cache.tags = tags;
		});
	}
}
