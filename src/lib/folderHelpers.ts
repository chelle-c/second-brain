import type { Folder, Note } from "@/types/notes";

export interface FolderTree {
	folder: Folder;
	children: FolderTree[];
	depth: number;
}

/**
 * Sanitize a folder name for use in an ID segment
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Ensures the result is URL-safe
 *
 * Note: The original name is preserved in the folder.name field.
 * This sanitization is only for generating a clean ID.
 */
export function sanitizeFolderName(name: string): string {
	let sanitized = name
		.toLowerCase()
		.trim()
		// Replace common word separators with hyphens
		.replace(/[\s_]+/g, "-")
		// Remove or replace special characters
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
		.replace(/[^a-z0-9-]/g, "-") // Replace remaining special chars with hyphens
		.replace(/-+/g, "-") // Remove consecutive hyphens
		.replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

	// Ensure we have at least some content
	if (!sanitized) {
		sanitized = "folder";
	}

	return sanitized;
}

/**
 * Generate a folder ID from the folder name and optional parent folder
 * Format: parentid_sanitizedname (e.g., "personal_health")
 * For root folders: just the sanitized name (e.g., "personal")
 *
 * The ID reflects the folder's position in the hierarchy.
 * When a folder is moved, its ID (and children's IDs) should be regenerated.
 */
export function generateFolderId(
	name: string,
	parentId: string | null,
	existingFolders: Folder[],
	excludeFolderId?: string // Exclude this folder when checking for duplicates (for renames)
): string {
	const sanitizedName = sanitizeFolderName(name);

	let baseId: string;
	if (parentId) {
		// For nested folders, prefix with parent ID
		baseId = `${parentId}_${sanitizedName}`;
	} else {
		// For root folders, just use the sanitized name
		baseId = sanitizedName;
	}

	// Check for duplicates and add suffix if needed
	let finalId = baseId;
	let counter = 1;
	const otherFolders = excludeFolderId
		? existingFolders.filter((f) => f.id !== excludeFolderId)
		: existingFolders;

	while (otherFolders.some((f) => f.id === finalId)) {
		finalId = `${baseId}-${counter}`;
		counter++;
	}

	return finalId;
}

/**
 * Regenerate folder ID and all descendant IDs when a folder is moved or renamed.
 * Returns a map of old ID -> new ID for updating note references.
 */
export function regenerateFolderIds(
	folder: Folder,
	newParentId: string | null,
	allFolders: Folder[],
	newName?: string // Optional: if renaming at the same time
): { updatedFolders: Folder[]; idMapping: Map<string, string> } {
	const idMapping = new Map<string, string>();
	const updatedFolders: Folder[] = [];
	const folderName = newName ?? folder.name;

	// Generate new ID for the moved/renamed folder
	const foldersExcludingSubtree = allFolders.filter(
		(f) => f.id !== folder.id && !isFolderDescendant(allFolders, f.id, folder.id)
	);
	const newId = generateFolderId(folderName, newParentId, foldersExcludingSubtree);

	idMapping.set(folder.id, newId);
	updatedFolders.push({
		...folder,
		id: newId,
		name: folderName,
		parentId: newParentId,
		updatedAt: new Date(),
	});

	// Recursively update all descendants
	const children = allFolders.filter((f) => f.parentId === folder.id);
	for (const child of children) {
		const childResult = regenerateDescendantIds(child, newId, allFolders, idMapping);
		updatedFolders.push(...childResult.updatedFolders);
		childResult.idMapping.forEach((newChildId, oldChildId) => {
			idMapping.set(oldChildId, newChildId);
		});
	}

	return { updatedFolders, idMapping };
}

/**
 * Helper function to recursively regenerate IDs for descendant folders
 */
function regenerateDescendantIds(
	folder: Folder,
	newParentId: string,
	allFolders: Folder[],
	existingMapping: Map<string, string>
): { updatedFolders: Folder[]; idMapping: Map<string, string> } {
	const idMapping = new Map<string, string>();
	const updatedFolders: Folder[] = [];

	// Get all folders that will have new IDs (to avoid collisions)
	const foldersToExclude = new Set([folder.id, ...existingMapping.keys()]);
	const otherFolders = allFolders.filter((f) => !foldersToExclude.has(f.id));

	const newId = generateFolderId(folder.name, newParentId, otherFolders);
	idMapping.set(folder.id, newId);
	updatedFolders.push({
		...folder,
		id: newId,
		parentId: newParentId,
		updatedAt: new Date(),
	});

	// Recursively update children
	const children = allFolders.filter((f) => f.parentId === folder.id);
	for (const child of children) {
		const combinedMapping = new Map([...existingMapping, ...idMapping]);
		const childResult = regenerateDescendantIds(child, newId, allFolders, combinedMapping);
		updatedFolders.push(...childResult.updatedFolders);
		childResult.idMapping.forEach((newChildId, oldChildId) => {
			idMapping.set(oldChildId, newChildId);
		});
	}

	return { updatedFolders, idMapping };
}

/**
 * Update note folder references based on folder ID changes
 */
export function updateNotesFolderReferences(
	notes: Note[],
	idMapping: Map<string, string>
): Note[] {
	if (idMapping.size === 0) return notes;

	return notes.map((note) => {
		const newFolderId = idMapping.get(note.folder);
		if (newFolderId) {
			return { ...note, folder: newFolderId, updatedAt: new Date() };
		}
		return note;
	});
}

/**
 * Parse a folder ID to extract the hierarchy path
 * e.g., "personal_health_fitness" -> ["personal", "personal_health", "personal_health_fitness"]
 *
 * Used for backwards compatibility when importing data without explicit folder definitions.
 */
export function parseFolderIdPath(folderId: string): string[] {
	const parts = folderId.split("_");
	const paths: string[] = [];

	let currentPath = "";
	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}_${part}` : part;
		paths.push(currentPath);
	}

	return paths;
}

/**
 * Get the parent folder ID from a folder ID by parsing underscore pattern
 * e.g., "personal_health_fitness" -> "personal_health"
 *
 * Used for backwards compatibility when importing data without explicit folder definitions.
 */
export function getParentIdFromFolderId(folderId: string): string | null {
	const lastUnderscoreIndex = folderId.lastIndexOf("_");
	if (lastUnderscoreIndex === -1) {
		return null; // Root folder
	}
	return folderId.substring(0, lastUnderscoreIndex);
}

/**
 * Get the last segment of a folder ID
 * e.g., "personal_health_fitness" -> "fitness"
 *
 * Used for backwards compatibility when importing data without explicit folder definitions.
 */
export function getFolderIdLastSegment(folderId: string): string {
	const lastUnderscoreIndex = folderId.lastIndexOf("_");
	if (lastUnderscoreIndex === -1) {
		return folderId;
	}
	return folderId.substring(lastUnderscoreIndex + 1);
}

/**
 * Convert a folder ID segment to a display name for import backwards compatibility
 * e.g., "my-folder" -> "My Folder"
 *
 * Note: This is only used when importing old data without explicit folder names.
 * For normal display, always use folder.name directly.
 */
export function folderIdSegmentToDisplayName(idSegment: string): string {
	return idSegment
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Check if a folder with the exact same name exists at the same parent level.
 * Uses exact string matching (case-sensitive, preserves spaces).
 *
 * @param name - The folder name to check
 * @param parentId - The parent folder ID (null for root level)
 * @param folders - All existing folders
 * @param excludeFolderId - Optional folder ID to exclude (for rename operations)
 * @returns The existing folder if found, undefined otherwise
 */
export function findDuplicateFolderByName(
	name: string,
	parentId: string | null,
	folders: Folder[],
	excludeFolderId?: string
): Folder | undefined {
	return folders.find(
		(f) =>
			f.name === name && // Exact match - no trimming, case-sensitive
			f.parentId === parentId &&
			f.id !== excludeFolderId
	);
}

/**
 * Validate that a folder name is not a duplicate at the given parent level.
 * Returns an error message if invalid, null if valid.
 */
export function validateFolderName(
	name: string,
	parentId: string | null,
	folders: Folder[],
	excludeFolderId?: string
): string | null {
	const duplicate = findDuplicateFolderByName(name, parentId, folders, excludeFolderId);

	if (duplicate) {
		const location = parentId
			? `in "${folders.find((f) => f.id === parentId)?.name || parentId}"`
			: "at root level";
		return `A folder named "${name}" already exists ${location}`;
	}

	return null;
}

/**
 * Result of a folder merge operation
 */
export interface FolderMergeResult {
	/** Notes that need their folder reference updated */
	noteUpdates: Map<string, string>; // noteId -> newFolderId
	/** Folders to delete (source folders that were merged) */
	foldersToDelete: string[];
	/** Folders to update (subfolders that were moved) */
	folderUpdates: Map<string, { parentId: string; id?: string }>; // oldFolderId -> new parent (and optionally new id)
	/** New folder ID mappings for any renamed folders */
	idMapping: Map<string, string>;
}

/**
 * Calculate the merge operations needed when moving a folder to a location
 * where a folder with the same name already exists.
 *
 * This recursively handles nested folder conflicts:
 * - Notes from source go to target
 * - Subfolders with no conflict are moved to target
 * - Subfolders with name conflicts are recursively merged
 */
export function calculateFolderMerge(
	sourceFolder: Folder,
	targetFolder: Folder,
	allFolders: Folder[],
	allNotes: Note[]
): FolderMergeResult {
	const noteUpdates = new Map<string, string>();
	const foldersToDelete: string[] = [];
	const folderUpdates = new Map<string, { parentId: string; id?: string }>();
	const idMapping = new Map<string, string>();

	// Move all notes from source to target
	const notesInSource = allNotes.filter((n) => n.folder === sourceFolder.id);
	for (const note of notesInSource) {
		noteUpdates.set(note.id, targetFolder.id);
	}

	// Mark source folder for deletion
	foldersToDelete.push(sourceFolder.id);
	idMapping.set(sourceFolder.id, targetFolder.id);

	// Handle subfolders
	const sourceChildren = allFolders.filter((f) => f.parentId === sourceFolder.id);
	const targetChildren = allFolders.filter((f) => f.parentId === targetFolder.id);

	for (const sourceChild of sourceChildren) {
		// Check if target has a child with the same name
		const conflictingChild = targetChildren.find((tc) => tc.name === sourceChild.name);

		if (conflictingChild) {
			// Recursive merge
			const childMerge = calculateFolderMerge(
				sourceChild,
				conflictingChild,
				allFolders,
				allNotes
			);

			// Combine results
			childMerge.noteUpdates.forEach((v, k) => noteUpdates.set(k, v));
			childMerge.foldersToDelete.forEach((id) => foldersToDelete.push(id));
			childMerge.folderUpdates.forEach((v, k) => folderUpdates.set(k, v));
			childMerge.idMapping.forEach((v, k) => idMapping.set(k, v));
		} else {
			// No conflict - just move the subfolder to target
			// Need to regenerate ID since parent is changing
			const newId = generateFolderId(sourceChild.name, targetFolder.id, allFolders, sourceChild.id);
			folderUpdates.set(sourceChild.id, { parentId: targetFolder.id, id: newId });
			idMapping.set(sourceChild.id, newId);

			// Also need to update all descendants of this moved subfolder
			const descendants = getFolderDescendants(allFolders, sourceChild.id);
			for (const desc of descendants) {
				// Find new parent ID from our mapping
				const newParentId = idMapping.get(desc.parentId!) || desc.parentId;
				const newDescId = generateFolderId(desc.name, newParentId!, allFolders, desc.id);
				folderUpdates.set(desc.id, { parentId: newParentId!, id: newDescId });
				idMapping.set(desc.id, newDescId);
			}

			// Update notes in moved subfolder and descendants
			const allMovedFolderIds = [sourceChild.id, ...descendants.map((d) => d.id)];
			for (const note of allNotes) {
				if (allMovedFolderIds.includes(note.folder)) {
					const newFolderId = idMapping.get(note.folder) || note.folder;
					noteUpdates.set(note.id, newFolderId);
				}
			}
		}
	}

	return { noteUpdates, foldersToDelete, folderUpdates, idMapping };
}

/**
 * Build a hierarchical tree from flat folder array
 */
export function buildFolderTree(
	folders: Folder[],
	parentId: string | null = null,
	depth: number = 0
): FolderTree[] {
	return folders
		.filter((f) => f.parentId === parentId)
		.sort((a, b) => (a.order || 0) - (b.order || 0))
		.map((folder) => ({
			folder,
			children: buildFolderTree(folders, folder.id, depth + 1),
			depth,
		}));
}

/**
 * Get all descendants of a folder (recursive)
 */
export function getFolderDescendants(folders: Folder[], folderId: string): Folder[] {
	const children = folders.filter((f) => f.parentId === folderId);
	const descendants = [...children];

	for (const child of children) {
		descendants.push(...getFolderDescendants(folders, child.id));
	}

	return descendants;
}

/**
 * Get all ancestors of a folder (recursive)
 */
export function getFolderAncestors(folders: Folder[], folderId: string): Folder[] {
	const folder = folders.find((f) => f.id === folderId);
	if (!folder || !folder.parentId) return [];

	const parent = folders.find((f) => f.id === folder.parentId);
	if (!parent) return [];

	return [parent, ...getFolderAncestors(folders, parent.id)];
}

/**
 * Get direct children of a folder
 */
export function getFolderChildren(folders: Folder[], folderId: string): Folder[] {
	return folders
		.filter((f) => f.parentId === folderId)
		.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Check if a folder is a descendant of another folder
 */
export function isFolderDescendant(
	folders: Folder[],
	folderId: string,
	ancestorId: string
): boolean {
	const folder = folders.find((f) => f.id === folderId);
	if (!folder || !folder.parentId) return false;
	if (folder.parentId === ancestorId) return true;
	return isFolderDescendant(folders, folder.parentId, ancestorId);
}

/**
 * Get folder depth in hierarchy (0 for root folders)
 */
export function getFolderDepth(folders: Folder[], folderId: string): number {
	const folder = folders.find((f) => f.id === folderId);
	if (!folder || !folder.parentId) return 0;
	return 1 + getFolderDepth(folders, folder.parentId);
}

/**
 * Get all folder IDs in a subtree (including the root)
 */
export function getFolderSubtreeIds(folders: Folder[], folderId: string): string[] {
	const descendants = getFolderDescendants(folders, folderId);
	return [folderId, ...descendants.map((f) => f.id)];
}

/**
 * Check if folder can be moved to a new parent (prevent circular references)
 */
export function canMoveFolder(
	folders: Folder[],
	folderId: string,
	newParentId: string | null
): boolean {
	// Can't move to self
	if (folderId === newParentId) return false;

	// Can't move inbox
	if (folderId === "inbox") return false;

	// Can move to root (null parent)
	if (newParentId === null) return true;

	// Can't move to a descendant of itself (would create circular reference)
	const descendants = getFolderDescendants(folders, folderId);
	if (descendants.some((f) => f.id === newParentId)) return false;

	return true;
}

/**
 * Reorder folders after a move/delete operation
 */
export function reorderFolders(folders: Folder[]): Folder[] {
	// Group by parent
	const byParent = new Map<string | null, Folder[]>();

	for (const folder of folders) {
		const parentId = folder.parentId;
		if (!byParent.has(parentId)) {
			byParent.set(parentId, []);
		}
		byParent.get(parentId)!.push(folder);
	}

	// Reorder each group
	const reordered: Folder[] = [];
	for (const [, siblings] of byParent) {
		siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
		siblings.forEach((folder, index) => {
			reordered.push({ ...folder, order: index });
		});
	}

	return reordered;
}

/**
 * Get breadcrumb path for a folder
 */
export function getFolderBreadcrumb(folders: Folder[], folderId: string): Folder[] {
	const ancestors = getFolderAncestors(folders, folderId);
	const folder = folders.find((f) => f.id === folderId);
	if (!folder) return ancestors;
	return [...ancestors.reverse(), folder];
}
