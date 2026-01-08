import {
	Calendar,
	ChevronRight,
	Folder as FolderIcon,
	GripVertical,
	Inbox,
	Redo2,
	Undo2,
} from "lucide-react";
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
}> = ({ note, tags, onSelectNote, formatDate }) => {
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
				className={`relative p-4 bg-card border border-border rounded-lg transition-all animate-fadeIn group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
					isDragging
						? "opacity-30"
						: "hover:border-primary/30 hover:shadow-sm cursor-pointer"
				}`}
			>
				<div className="flex justify-between items-start gap-4">
					<div className="flex items-start gap-2 flex-1 min-w-0">
						{/* Drag handle - only this element is draggable */}
						<div
							{...dragHandlers}
							onClick={handleDragHandleClick}
							onKeyDown={handleDragHandleKeyDown}
							role="button"
							tabIndex={-1}
							aria-label="Drag to move note"
							className={`mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded hover:bg-accent ${
								isDragging ? "cursor-grabbing opacity-100" : "cursor-grab"
							}`}
						>
							<GripVertical size={14} />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-card-foreground mb-2 font-medium truncate">
								{note.title || "Untitled"}
							</h3>

							{note.tags && note.tags.length > 0 && (
								<div className="flex flex-wrap gap-1 mb-2">
									{note.tags.map((tagId) => {
										const tag = tags[tagId];
										if (!tag) return null;
										const Icon = tag.icon;
										return (
											<span
												key={tagId}
												className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
											>
												{typeof Icon === "function" && <Icon size={10} />}
												{tag.name}
											</span>
										);
									})}
								</div>
							)}

							<div className="flex items-center gap-4 text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<Calendar size={12} />
									{formatDate(note.createdAt)}
								</span>
							</div>
						</div>
					</div>
					<div
						className="relative z-10"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<NotesDropdownMenu
							note={note}
							folders={[]}
							activeFolder={null}
							tags={tags}
						/>
					</div>
				</div>
			</article>
		</>
	);
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
				className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 hover:text-foreground cursor-pointer transition-colors"
			>
				<FolderIcon size={14} />
				{folder.name}
				<ChevronRight size={14} />
				{showDropIndicator && canDrop && (
					<span className="text-xs text-primary ml-2">Drop here</span>
				)}
			</button>
			<div className="space-y-2">{children}</div>
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
			<div className="space-y-2">{children}</div>
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

	// Get direct children of active folder
	const childFolders = useMemo(() => {
		if (!activeFolder) return [];
		return folders
			.filter((f) => f.parentId === activeFolder.id && !f.archived)
			.sort((a, b) => (a.order || 0) - (b.order || 0));
	}, [activeFolder, folders]);

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

	// Group notes by direct children
	const groupedNotes = useMemo(() => {
		if (childFolders.length === 0) {
			return { ungrouped: filteredNotes, grouped: {} };
		}

		const grouped: Record<string, Note[]> = {};
		const ungrouped: Note[] = [];

		// Helper to find which child folder a note belongs to (including nested)
		const findChildFolderForNote = (noteFolder: string): string | null => {
			// Check if it's directly in a child folder
			const directChild = childFolders.find((f) => f.id === noteFolder);
			if (directChild) return directChild.id;

			// Check if it's in a descendant of a child folder
			for (const childFolder of childFolders) {
				const getDescendantIds = (folderId: string): string[] => {
					const children = folders.filter((f) => f.parentId === folderId);
					return [folderId, ...children.flatMap((child) => getDescendantIds(child.id))];
				};
				const descendantIds = getDescendantIds(childFolder.id);
				if (descendantIds.includes(noteFolder)) {
					return childFolder.id;
				}
			}

			return null;
		};

		filteredNotes.forEach((note) => {
			if (note.folder === activeFolder?.id) {
				// Note is directly in the active folder
				ungrouped.push(note);
			} else {
				// Find which child folder this note belongs to
				const childFolderId = findChildFolderForNote(note.folder);
				if (childFolderId) {
					if (!grouped[childFolderId]) {
						grouped[childFolderId] = [];
					}
					grouped[childFolderId].push(note);
				}
			}
		});

		return { ungrouped, grouped };
	}, [filteredNotes, childFolders, activeFolder, folders]);

	const renderNoteItem = (note: Note) => (
		<DraggableNoteItem
			key={note.id}
			note={note}
			tags={tags}
			onSelectNote={onSelectNote}
			formatDate={formatDate}
		/>
	);

	return (
		<div className="h-full flex flex-col p-6 animate-fadeIn">
			<div className="space-y-4 mb-6">
				{/* Folder title with inline undo/redo */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{breadcrumb.length > 1 && (
							<>
								{breadcrumb.slice(0, -1).map((folder) => (
									<React.Fragment key={folder.id}>
										<button
											type="button"
											onClick={() => setActiveFolder(folder)}
											className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
										>
											<FolderIcon size={16} />
											<span className="text-sm">{folder.name}</span>
										</button>
										<ChevronRight size={16} className="text-muted-foreground" />
									</React.Fragment>
								))}
							</>
						)}
						{React.createElement(activeFolder?.id === "inbox" ? Inbox : FolderIcon, {
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

				{/* Child folders quick access */}
				{childFolders.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{childFolders.map((folder) => (
							<button
								key={folder.id}
								type="button"
								onClick={() => setActiveFolder(folder)}
								className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-accent rounded-lg text-sm transition-colors cursor-pointer"
							>
								<FolderIcon size={14} />
								{folder.name}
								<span className="text-xs text-muted-foreground ml-1">
									{
										notes.filter(
											(n) =>
												n.folder === folder.id &&
												n.archived === (viewMode === "archived")
										).length
									}
								</span>
							</button>
						))}
					</div>
				)}

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
				) : childFolders.length > 0 ? (
					<div className="space-y-6 animate-fadeIn">
						{groupedNotes.ungrouped.length > 0 && activeFolder && (
							<CurrentFolderDropZone
								folder={activeFolder}
								onNoteDrop={handleNoteDrop}
							>
								{groupedNotes.ungrouped.map(renderNoteItem)}
							</CurrentFolderDropZone>
						)}

						{Object.entries(groupedNotes.grouped).map(([folderId, folderNotes]) => {
							const folder = childFolders.find((f) => f.id === folderId);
							if (!folder || folderNotes.length === 0) return null;

							return (
								<FolderSectionDropZone
									key={folderId}
									folder={folder}
									onNoteDrop={handleNoteDrop}
									onClick={() => setActiveFolder(folder)}
								>
									{folderNotes.map(renderNoteItem)}
								</FolderSectionDropZone>
							);
						})}
					</div>
				) : (
					<div className="space-y-2 animate-fadeIn">
						{filteredNotes.map(renderNoteItem)}
					</div>
				)}
			</div>
		</div>
	);
};
