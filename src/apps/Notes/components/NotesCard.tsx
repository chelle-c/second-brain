import {
	Calendar,
	ChevronRight,
	Clock,
	Folder as FolderIcon,
	GripVertical,
	Inbox,
	Redo2,
	Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AVAILABLE_ICONS, getValidIcon, getIconNameFromComponent, DEFAULT_TAG_ICON } from "@/components/IconPicker";

// Helper to get a valid tag icon component, with fallback
const getTagIcon = (icon: LucideIcon | undefined): LucideIcon => {
	return getValidIcon(icon, DEFAULT_TAG_ICON);
};
import React, { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getFolderBreadcrumb } from "@/lib/folderHelpers";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder, Note, Tag } from "@/types/notes";
import { NotesDropdownMenu } from "./NotesDropdownMenu";
import { TagFilter } from "./TagFilter";
import { useDraggable, useDropZone, type DragItem } from "@/hooks/useDragAndDrop";

interface NotesCardProps {
	folders: Folder[];
	activeFolder: Folder | null;
	setActiveFolder: React.Dispatch<React.SetStateAction<Folder | null>>;
	getFolderById: (id: string) => Folder | undefined;
	tags: Record<string, Tag>;
	activeTags: string[];
	getNoteCount: (folderId: string, archived?: boolean, includeDescendants?: boolean) => number;
	setActiveTags: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectNote: (noteId: string) => void;
	viewMode: "active" | "archived";
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

// Separate component for draggable note item
const DraggableNoteItem: React.FC<{
	note: Note;
	tags: Record<string, Tag>;
	onSelectNote: (noteId: string) => void;
	formatDate: (date: Date) => string;
	folders: Folder[];
	activeFolder: Folder | null;
}> = ({ note, tags, onSelectNote, formatDate, folders, activeFolder }) => {
	const dragPreviewRef = useRef<HTMLDivElement>(null);

	const { isDragging, dragHandlers } = useDraggable({
		type: "note",
		id: note.id,
		data: note,
		dragPreviewRef,
	});

	const handleCardClick = useCallback(() => {
		if (!isDragging) {
			onSelectNote(note.id);
		}
	}, [isDragging, note.id, onSelectNote]);

	const handleCardKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onSelectNote(note.id);
			}
		},
		[note.id, onSelectNote]
	);

	const handleDragHandleClick = useCallback((e: React.MouseEvent) => {
		// Prevent the card click from firing when clicking the drag handle
		e.stopPropagation();
	}, []);

	const handleDragHandleKeyDown = useCallback((e: React.KeyboardEvent) => {
		// Prevent the card keydown from firing
		e.stopPropagation();
	}, []);

	return (
		<>
			{/* Custom drag preview - positioned off-screen but rendered in DOM */}
			<div
				ref={dragPreviewRef}
				className="fixed -left-[9999px] -top-[9999px] bg-card border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none z-9999 max-w-[200px]"
				aria-hidden="true"
			>
				<span className="text-sm font-medium text-card-foreground truncate block">
					{note.title || "Untitled"}
				</span>
			</div>

			<article
				onClick={handleCardClick}
				onKeyDown={handleCardKeyDown}
				tabIndex={0}
				role="button"
				aria-label={`Open note: ${note.title || "Untitled"}`}
				className={`relative pl-1.5 pr-3 py-2.5 bg-card border border-border rounded-lg transition-all animate-fadeIn group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
					isDragging
						? "opacity-30"
						: "hover:border-primary/30 hover:shadow-sm cursor-pointer"
				}`}
			>
				<div className="flex items-center gap-2">
					{/* Drag handle - always visible */}
					<div
						{...dragHandlers}
						onClick={handleDragHandleClick}
						onKeyDown={handleDragHandleKeyDown}
						role="button"
						tabIndex={-1}
						aria-label="Drag to move note"
						className={`flex items-center text-muted-foreground/50 hover:text-muted-foreground px-0.5 rounded hover:bg-accent self-stretch transition-colors ${
							isDragging ? "cursor-grabbing text-muted-foreground" : "cursor-grab"
						}`}
					>
						<GripVertical size={14} />
					</div>

					{/* Note content */}
					<div className="flex-1 min-w-0">
						{/* Title row with tags */}
						<div className="flex items-center gap-2 mb-1">
							<h3 className="text-card-foreground font-medium truncate shrink min-w-0">
								{note.title || "Untitled"}
							</h3>
							{note.tags && note.tags.length > 0 && (
								<div className="flex items-center gap-1 shrink-0">
									{note.tags.slice(0, 3).map((tagId) => {
										const tag = tags[tagId];
										if (!tag) return null;
										const Icon = getTagIcon(tag.icon);
										// Use getIconNameFromComponent for reliable key generation
										const iconKey = getIconNameFromComponent(tag.icon) || "default";
										return (
											<span
												key={`${tagId}-${iconKey}`}
												className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs"
											>
												<Icon size={10} />
												<span className="max-w-[60px] truncate">{tag.name}</span>
											</span>
										);
									})}
									{note.tags.length > 3 && (
										<span className="text-xs text-muted-foreground">
											+{note.tags.length - 3}
										</span>
									)}
								</div>
							)}
						</div>

						{/* Metadata row */}
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<span className="flex items-center gap-1" title="Created">
								<Calendar size={11} />
								{formatDate(note.createdAt)}
							</span>
							{note.updatedAt && new Date(note.updatedAt).getTime() !== new Date(note.createdAt).getTime() && (
								<span className="flex items-center gap-1" title="Updated">
									<Clock size={11} />
									{formatDate(note.updatedAt)}
								</span>
							)}
						</div>
					</div>

					{/* Dropdown menu */}
					<div
						className="relative z-10 shrink-0"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<NotesDropdownMenu
							note={note}
							folders={folders}
							activeFolder={activeFolder}
							tags={tags}
						/>
					</div>
				</div>
			</article>
		</>
	);
};

// Helper to get folder icon component
const getFolderIconComponent = (folder: Folder) => {
	if (folder.id === "inbox") return Inbox;
	if (folder.icon) {
		// Find matching icon from AVAILABLE_ICONS by comparing the icon function
		const matchingIcon = AVAILABLE_ICONS.find((i) => i.icon === folder.icon);
		if (matchingIcon) return matchingIcon.icon;
	}
	return FolderIcon;
};

// Folder section drop zone component
const FolderSectionDropZone: React.FC<{
	folder: Folder;
	children: React.ReactNode;
	onNoteDrop: (folderId: string, item: DragItem<Note>) => void;
	onClick: () => void;
}> = ({ folder, children, onNoteDrop, onClick }) => {
	const { isOver, canDrop, isDragActive, dropHandlers } = useDropZone<Note>({
		accepts: ["note"],
		onDrop: (item) => onNoteDrop(folder.id, item),
		canDrop: (item) => item.data.folder !== folder.id,
	});

	const showDropIndicator = isDragActive && isOver;
	const isInvalidDrop = showDropIndicator && !canDrop;
	const IconComponent = getFolderIconComponent(folder);

	return (
		<div
			{...dropHandlers}
			className={`transition-all rounded-lg ${
				showDropIndicator && canDrop ? "bg-accent/50" : ""
			} ${isInvalidDrop ? "opacity-50" : ""}`}
			style={{ cursor: isInvalidDrop ? "not-allowed" : undefined }}
		>
			<button
				type="button"
				onClick={onClick}
				className="flex items-center gap-2 text-sm font-medium text-muted-foreground pl-1 ml-2 mb-2 hover:text-foreground cursor-pointer transition-colors"
			>
				<IconComponent size={14} />
				{folder.name}
				<ChevronRight size={14} />
				{showDropIndicator && canDrop && (
					<span className="text-xs text-primary ml-2">Drop here</span>
				)}
			</button>
			<div className="pl-2 pr-4 space-y-2">{children}</div>
		</div>
	);
};

// Current folder drop zone for ungrouped notes
const CurrentFolderDropZone: React.FC<{
	folder: Folder;
	children: React.ReactNode;
	onNoteDrop: (folderId: string, item: DragItem<Note>) => void;
}> = ({ folder, children, onNoteDrop }) => {
	const { isOver, canDrop, isDragActive, dropHandlers } = useDropZone<Note>({
		accepts: ["note"],
		onDrop: (item) => onNoteDrop(folder.id, item),
		canDrop: (item) => item.data.folder !== folder.id,
	});

	const showDropIndicator = isDragActive && isOver;
	const isInvalidDrop = showDropIndicator && !canDrop;

	return (
		<div
			{...dropHandlers}
			className={`transition-all rounded-lg ${
				showDropIndicator && canDrop ? "bg-accent/50" : ""
			} ${isInvalidDrop ? "opacity-50" : ""}`}
			style={{ cursor: isInvalidDrop ? "not-allowed" : undefined }}
		>
			<h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
				In {folder.name}
				{showDropIndicator && canDrop && (
					<span className="text-xs text-primary">Drop here</span>
				)}
			</h3>
			<div className="pl-2 pr-4 space-y-2">{children}</div>
		</div>
	);
};

export const NotesCard: React.FC<NotesCardProps> = ({
	folders,
	activeFolder,
	setActiveFolder,
	getFolderById,
	tags,
	activeTags,
	setActiveTags,
	onSelectNote,
	viewMode,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}) => {
	const { notes, moveNote } = useNotesStore();

	const formatDate = (date: Date) => {
		const now = new Date();
		const noteDate = new Date(date);
		const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) return "Just now";
		if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return noteDate.toLocaleDateString();
	};

	// Handle note drop on a folder section
	const handleNoteDrop = useCallback(
		(folderId: string, item: DragItem<Note>) => {
			const note = item.data;
			const previousFolder = note.folder;
			const targetFolder = getFolderById(folderId);

			if (!targetFolder) {
				toast.error("Target folder not found");
				return;
			}

			if (note.folder === folderId) {
				return;
			}

			// Move the note
			moveNote(note.id, folderId);

			// Show success toast with undo
			toast.success(`Moved "${note.title || "Untitled"}" to ${targetFolder.name}`, {
				action: {
					label: "Undo",
					onClick: () => {
						moveNote(note.id, previousFolder);
						toast.success("Move undone");
					},
				},
			});
		},
		[getFolderById, moveNote]
	);

	// Get breadcrumb path
	const breadcrumb = useMemo(() => {
		if (!activeFolder) return [];
		return getFolderBreadcrumb(folders, activeFolder.id);
	}, [activeFolder, folders]);

	// Filter notes
	const filteredNotes = useMemo(() => {
		if (!activeFolder) return [];

		// Get all folder IDs in subtree
		const getSubtreeIds = (folderId: string): string[] => {
			const children = folders.filter((f) => f.parentId === folderId);
			return [folderId, ...children.flatMap((child) => getSubtreeIds(child.id))];
		};

		const folderIds = getSubtreeIds(activeFolder.id);

		return notes.filter((note) => {
			const matchesArchived = note.archived === (viewMode === "archived");
			if (!matchesArchived) return false;

			const matchesFolder = folderIds.includes(note.folder);
			if (!matchesFolder) return false;

			// Handle tag filtering including "uncategorized" special case
			if (activeTags.length === 0) return true;

			// Check for "uncategorized" filter
			const hasUncategorizedFilter = activeTags.includes("uncategorized");
			const otherTags = activeTags.filter((t) => t !== "uncategorized");

			const noteHasNoTags = !note.tags || note.tags.length === 0;
			const noteMatchesOtherTags =
				otherTags.length === 0 || otherTags.some((tag) => note.tags?.includes(tag));

			if (hasUncategorizedFilter && noteHasNoTags) return true;
			if (otherTags.length > 0 && noteMatchesOtherTags) return true;

			return false;
		});
	}, [notes, activeFolder, viewMode, activeTags, folders]);

	// Build nested folder hierarchy with notes
	interface FolderNode {
		folder: Folder;
		notes: Note[];
		children: FolderNode[];
	}

	const folderHierarchy = useMemo(() => {
		if (!activeFolder) return { directNotes: [], nestedFolders: [] };

		// Get notes directly in active folder
		const directNotes = filteredNotes.filter((note) => note.folder === activeFolder.id);

		// Build recursive folder tree
		const buildFolderTree = (parentId: string, depth: number = 0): FolderNode[] => {
			if (depth > 10) return []; // Prevent infinite recursion

			return folders
				.filter((f) => f.parentId === parentId && !f.archived)
				.sort((a, b) => (a.order || 0) - (b.order || 0))
				.map((folder) => ({
					folder,
					notes: filteredNotes.filter((note) => note.folder === folder.id),
					children: buildFolderTree(folder.id, depth + 1),
				}))
				.filter((node) => node.notes.length > 0 || node.children.length > 0); // Only include folders with content
		};

		const nestedFolders = buildFolderTree(activeFolder.id);

		return { directNotes, nestedFolders };
	}, [filteredNotes, activeFolder, folders]);

	const renderNoteItem = (note: Note) => (
		<DraggableNoteItem
			key={note.id}
			note={note}
			tags={tags}
			onSelectNote={onSelectNote}
			formatDate={formatDate}
			folders={folders}
			activeFolder={activeFolder}
		/>
	);

	// Recursive folder section renderer
	const renderFolderSection = (node: { folder: Folder; notes: Note[]; children: { folder: Folder; notes: Note[]; children: unknown[] }[] }, depth: number = 0): React.ReactNode => {
		return (
			<div key={node.folder.id} className={depth > 0 ? "ml-4 border-l border-border pl-4 py-2" : ""}>
				<FolderSectionDropZone
					folder={node.folder}
					onNoteDrop={handleNoteDrop}
					onClick={() => setActiveFolder(node.folder)}
				>
					{node.notes.map(renderNoteItem)}
				</FolderSectionDropZone>

				{/* Render nested child folders */}
				{node.children.length > 0 && (
					<div className="mt-3">
						{node.children.map((child) => renderFolderSection(child as { folder: Folder; notes: Note[]; children: { folder: Folder; notes: Note[]; children: unknown[] }[] }, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="h-full flex flex-col p-6 animate-fadeIn">
			<div className="space-y-4 mb-6">
				{/* Folder title with inline undo/redo */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{breadcrumb.length > 1 && (
							<>
								{breadcrumb.slice(0, -1).map((folder) => {
									const BreadcrumbIcon = getFolderIconComponent(folder);
									return (
										<React.Fragment key={folder.id}>
											<button
												type="button"
												onClick={() => setActiveFolder(folder)}
												className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
											>
												<BreadcrumbIcon size={16} />
												<span className="text-sm">{folder.name}</span>
											</button>
											<ChevronRight size={16} className="text-muted-foreground" />
										</React.Fragment>
									);
								})}
							</>
						)}
						{activeFolder && React.createElement(getFolderIconComponent(activeFolder), {
							size: 24,
						})}
						<h1 className="text-2xl font-semibold">{activeFolder?.name || "Notes"}</h1>
						<span className="text-sm text-muted-foreground">
							({filteredNotes.length})
						</span>
					</div>

					{/* Undo/Redo buttons */}
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onUndo}
							disabled={!canUndo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Undo (Ctrl+Z)"
						>
							<Undo2 size={18} />
						</button>
						<button
							type="button"
							onClick={onRedo}
							disabled={!canRedo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Redo (Ctrl+Y)"
						>
							<Redo2 size={18} />
						</button>
					</div>
				</div>

				{/* Tag filter */}
				<TagFilter tags={tags} activeTags={activeTags} setActiveTags={setActiveTags} />
			</div>

			{/* Notes list */}
			<div className="flex-1 overflow-y-auto">
				{filteredNotes.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground animate-fadeIn">
						<p className="text-lg mb-2">
							No {viewMode} notes in {activeFolder?.name || "this folder"}
						</p>
						<p className="text-sm">
							{activeTags.length > 0
								? "Try removing some tag filters"
								: viewMode === "active"
								? "Create a new note to get started"
								: "No archived notes yet"}
						</p>
					</div>
				) : (
					<div className="space-y-4 animate-fadeIn">
						{/* Notes directly in this folder */}
						{folderHierarchy.directNotes.length > 0 && activeFolder && (
							<CurrentFolderDropZone
								folder={activeFolder}
								onNoteDrop={handleNoteDrop}
							>
								{folderHierarchy.directNotes.map(renderNoteItem)}
							</CurrentFolderDropZone>
						)}

						{/* Nested folders with their notes */}
						{folderHierarchy.nestedFolders.map((node) => renderFolderSection(node as { folder: Folder; notes: Note[]; children: { folder: Folder; notes: Note[]; children: unknown[] }[] }))}
					</div>
				)}
			</div>
		</div>
	);
};
