import type { Note, NotesFolders, Subfolder, Tag } from "@/types/notes";
import type { DatabaseContext } from "../../types/storage";
import { deepEqual } from "../utils";

// Normalized note type for comparison (dates as strings)
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

	hasFoldersChanged(newFolders: NotesFolders): boolean {
		if (!this.context.cache.folders) return true;
		return !deepEqual(this.context.cache.folders, newFolders);
	}

	hasTagsChanged(newTags: Record<string, Tag>): boolean {
		if (!this.context.cache.tags) return true;
		return !deepEqual(this.context.cache.tags, newTags);
	}

	extractSubfoldersFromHierarchy(folders: NotesFolders): Subfolder[] {
		const subfolders: Subfolder[] = [];

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

	createInitialFolders(): NotesFolders {
		return {
			inbox: {
				id: "inbox",
				name: "Inbox",
				children: [],
			},
			personal: {
				id: "personal",
				name: "Personal",
				children: [
					{
						id: "personal_health",
						name: "Health",
						parent: "personal",
						children: [],
					},
					{
						id: "personal_finance",
						name: "Finance",
						parent: "personal",
						children: [],
					},
					{
						id: "personal_home",
						name: "Home",
						parent: "personal",
						children: [],
					},
				],
			},
			work: {
				id: "work",
				name: "Work",
				children: [
					{
						id: "work_meetings",
						name: "Meetings",
						parent: "work",
						children: [],
					},
					{ id: "work_tasks", name: "Tasks", parent: "work", children: [] },
					{
						id: "work_learning",
						name: "Learning",
						parent: "work",
						children: [],
					},
				],
			},
			projects: {
				id: "projects",
				name: "Projects",
				children: [
					{
						id: "projects_active",
						name: "Active",
						parent: "projects",
						children: [],
					},
					{
						id: "projects_planning",
						name: "Planning",
						parent: "projects",
						children: [],
					},
					{
						id: "projects_someday",
						name: "Someday",
						parent: "projects",
						children: [],
					},
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
					{
						id: "resources_books",
						name: "Books",
						parent: "resources",
						children: [],
					},
					{
						id: "resources_tools",
						name: "Tools",
						parent: "resources",
						children: [],
					},
				],
			},
		};
	}

	async loadNotes(): Promise<Note[]> {
		return this.context.queueOperation(async () => {
			const results = await this.context.db.select<
				Array<{
					id: string;
					title: string;
					content: string;
					tags: string;
					folder: string;
					createdAt: string;
					updatedAt: string;
					archived: number;
				}>
			>(
				"SELECT id, title, content, tags, folder, createdAt, updatedAt, archived FROM notes",
			);

			const notes = results.map((row) => ({
				id: row.id,
				title: row.title,
				content: row.content,
				tags: row.tags ? JSON.parse(row.tags) : [],
				folder: row.folder,
				createdAt: new Date(row.createdAt),
				updatedAt: new Date(row.updatedAt),
				archived: Boolean(row.archived),
			}));

			this.context.cache.notes = notes;
			return notes;
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

			// Determine what changed
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
						},
					)
				);
			});

			await this.context.db.execute("DELETE FROM notes");

			for (const note of notes) {
				await this.context.db.execute(
					`INSERT INTO notes (id, title, content, tags, folder, createdAt, updatedAt, archived)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						note.id,
						note.title,
						note.content,
						JSON.stringify(note.tags || []),
						note.folder,
						note.createdAt instanceof Date
							? note.createdAt.toISOString()
							: note.createdAt,
						note.updatedAt instanceof Date
							? note.updatedAt.toISOString()
							: note.updatedAt,
						note.archived ? 1 : 0,
					],
				);
			}

			this.context.cache.notes = notes;

			// Log specific changes
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

	async loadFolders(): Promise<NotesFolders> {
		return this.context.queueOperation(async () => {
			const results = await this.context.db.select<Array<{ data: string }>>(
				"SELECT data FROM folders WHERE id = 1",
			);

			let folders: NotesFolders;

			if (results.length === 0) {
				folders = this.createInitialFolders();
				await this.context.db.execute(
					`INSERT OR REPLACE INTO folders (id, data) VALUES (1, ?)`,
					[JSON.stringify(folders)],
				);
			} else {
				folders = JSON.parse(results[0].data);
			}

			this.context.cache.folders = folders;
			return folders;
		});
	}

	async saveFolders(folders: NotesFolders): Promise<void> {
		if (!this.hasFoldersChanged(folders)) {
			return;
		}

		return this.context.queueOperation(async () => {
			await this.context.db.execute(
				`INSERT OR REPLACE INTO folders (id, data) VALUES (1, ?)`,
				[JSON.stringify(folders)],
			);

			this.context.cache.folders = folders;
			console.log("Folders updated");
		});
	}

	async loadTags(): Promise<Record<string, Tag>> {
		return this.context.queueOperation(async () => {
			const results =
				await this.context.db.select<
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
					// Icon is stored as string name, component resolves it later
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
				// Store the icon name as a string if it's a component, otherwise store as-is
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
					[tag.id, tag.name, tag.color, iconName],
				);
			}

			this.context.cache.tags = tags;
			console.log("Tags updated");
		});
	}
}
