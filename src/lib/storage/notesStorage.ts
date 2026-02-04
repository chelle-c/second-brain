import type { Folder, Note, NoteReminder, NotesFolders, Tag } from "@/types/notes";
import type { DatabaseContext } from "../../types/storage";
import { deepEqual } from "../utils";
import { getIconNameFromComponent } from "@/components/IconPicker";
import {
	// Folder icons
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
	// Tag icons
	Tag as TagIcon,
	Bookmark,
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
	Code,
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

interface NormalizedNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	reminder: string | null; // JSON | null
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
	// Folder icons
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
	// Tag icons
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

const getIconName = (icon: LucideIcon | undefined): string | null => {
	if (!icon) return null;
	for (const [name, component] of Object.entries(ICON_MAP)) {
		if (component === icon) return name;
	}
	const fromIconPicker = getIconNameFromComponent(icon);
	if (fromIconPicker && ICON_MAP[fromIconPicker]) return fromIconPicker;
	const iconComponent = icon as unknown as { displayName?: string; name?: string };
	const extractedName = iconComponent.displayName || iconComponent.name;
	if (extractedName && ICON_MAP[extractedName]) return extractedName;
	if (extractedName) return extractedName;
	return null;
};

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
					iconName: getIconName(tag.icon),
				};
			}
			return normalized;
		};
		return !deepEqual(
			normalizeTagsForComparison(this.context.cache.tags),
			normalizeTagsForComparison(newTags),
		);
	}

	// ── legacy helpers (unchanged) ────────────────────────────────────────────
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

				let query = "SELECT id, title, content, tags, createdAt, updatedAt, archived";
				if (hasFolder) query += ", folder";
				if (hasFolderId && !hasFolder) query += ", folderId";
				if (hasReminder) query += ", reminder";
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
			// Diff logging (unchanged logic)
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

			await this.context.getDb().execute("DELETE FROM notes");

			for (const note of notes) {
				await this.context.getDb().execute(
					`INSERT INTO notes (id, title, content, tags, folder, reminder, createdAt, updatedAt, archived)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						note.id,
						note.title,
						note.content,
						JSON.stringify(note.tags || []),
						note.folder || "inbox",
						serializeReminder(note.reminder),
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

			this.context.cache.notes = notes;

			if (added.length === 1) console.log(`Note created: "${added[0].title}"`);
			else if (added.length > 1) console.log(`${added.length} notes created`);
			if (deleted.length === 1) console.log(`Note deleted: "${deleted[0].title}"`);
			else if (deleted.length > 1) console.log(`${deleted.length} notes deleted`);
			if (modified.length === 1) console.log(`Note updated: "${modified[0].title}"`);
			else if (modified.length > 1) console.log(`${modified.length} notes updated`);
		});
	}

	// ── Folders (unchanged) ───────────────────────────────────────────────────
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
				const folders = results.map((row) => ({
					id: row.id,
					name: row.name,
					parentId: row.parentId,
					icon: row.icon && ICON_MAP[row.icon] ? ICON_MAP[row.icon] : undefined,
					archived: Boolean(row.archived),
					order: row.order,
					createdAt: new Date(row.createdAt),
					updatedAt: new Date(row.updatedAt),
				}));
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
			await this.context.getDb().execute("DELETE FROM folders_new");
			const sortedFolders = this.sortFoldersForInsert(folders);
			for (const folder of sortedFolders) {
				await this.context.getDb().execute(
					`INSERT INTO folders_new (id, name, parentId, icon, archived, \`order\`, createdAt, updatedAt)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						folder.id,
						folder.name,
						folder.parentId,
						getIconName(folder.icon),
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
			this.context.cache.folders = folders;
		});
	}

	// ── Tags (unchanged) ──────────────────────────────────────────────────────
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
					const iconComponent =
						row.icon && ICON_MAP[row.icon] ?
							ICON_MAP[row.icon]
						:	(ICON_MAP["Tag"] ?? FolderIcon);
					tags[row.id] = {
						id: row.id,
						name: row.name,
						color: row.color,
						icon: iconComponent,
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
			await this.context.getDb().execute("DELETE FROM tags");
			for (const [, tag] of Object.entries(tags)) {
				const iconName = getIconName(tag.icon) || "Tag";
				await this.context
					.getDb()
					.execute(`INSERT INTO tags (id, name, color, icon) VALUES (?, ?, ?, ?)`, [
						tag.id,
						tag.name,
						tag.color,
						iconName,
					]);
			}
			this.context.cache.tags = tags;
		});
	}
}