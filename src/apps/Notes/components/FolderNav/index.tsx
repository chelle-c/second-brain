import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Modal } from "@/components/Modal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildFolderTree, canMoveFolder } from "@/lib/folderHelpers";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder } from "@/types/notes";
import { ActionButton } from "./ActionButton";
import { ContextMenu } from "./ContextMenu";
import { FolderIconPicker } from "./FolderIconPicker";
import { FolderItem } from "./FolderItem";
import { SearchModal } from "./SearchModal";
import type { DeleteConfirmation, DraggedFolder, FolderSortOption } from "./types";
import {
	Archive,
	ArchiveX,
	FolderPlus,
	ListChevronsDownUp,
	ListChevronsUpDown,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search as SearchIcon,
	SortAsc,
} from "lucide-react";

interface FolderNavProps {
	folders: Folder[];
	activeFolder: Folder | null;
	setActiveFolder: (folder: Folder | null) => void;
	getFolderById: (id: string) => Folder | undefined;
	setActiveTags: (tags: string[]) => void;
	getNoteCount: (folderId: string, archived?: boolean, includeDescendants?: boolean) => number;
	onCreateNote: () => void;
	viewMode: "active" | "archived";
	setViewMode: (mode: "active" | "archived") => void;
	onSelectNote: (noteId: string) => void;
	isCollapsed: boolean;
	onToggleCollapse: (collapsed: boolean) => void;
}

export const FolderNav = ({
	folders,
	activeFolder,
	getFolderById,
	setActiveFolder,
	setActiveTags,
	getNoteCount,
	onCreateNote,
	viewMode,
	setViewMode,
	onSelectNote,
	isCollapsed,
	onToggleCollapse,
}: FolderNavProps) => {
	const {
		notes,
		addFolder,
		updateFolder,
		deleteFolder,
		archiveFolder,
		unarchiveFolder,
		moveFolder,
	} = useNotesStore();

	// UI State
	const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
	const [sortBy, setSortBy] = useState<FolderSortOption>("name-asc");
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [showIconPicker, setShowIconPicker] = useState<string | null>(null);

	// Edit State
	const [editingFolder, setEditingFolder] = useState<string | null>(null);
	const [editFolderName, setEditFolderName] = useState("");

	// Create State
	const [showNewFolder, setShowNewFolder] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [newFolderParent, setNewFolderParent] = useState<string | null>(null);

	// Delete State
	const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

	// Error State
	const [folderError, setFolderError] = useState<string | null>(null);

	// Context Menu State
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		folderId: string;
	} | null>(null);

	// Drag and Drop State
	const [draggedFolder, setDraggedFolder] = useState<DraggedFolder | null>(null);
	const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

	// Drag delay
	const [dragDelayTimer, setDragDelayTimer] = useState<NodeJS.Timeout | null>(null);
	const [dragReadyFolder, setDragReadyFolder] = useState<string | null>(null);

	// Refs
	const inputRef = useRef<HTMLInputElement>(null);
	const navRef = useRef<HTMLDivElement>(null);

	const isCreating = showNewFolder;
	const isEditing = editingFolder !== null;
	const isAnyEditMode = isCreating || isEditing;

	// Filter folders based on view mode
	// In archived view, show:
	// 1. Folders that are archived
	// 2. Non-archived folders that contain archived notes
	const visibleFolders = useMemo(() => {
		if (viewMode === "archived") {
			// Get folder IDs that have archived notes
			const foldersWithArchivedNotes = new Set(
				notes.filter((n) => n.archived).map((n) => n.folder)
			);

			return folders.filter((f) => {
				// Show if folder is archived
				if (f.archived) return true;
				// Show if folder has archived notes (but don't show inbox duplicates)
				if (foldersWithArchivedNotes.has(f.id)) return true;
				return false;
			});
		}
		return folders.filter((f) => !f.archived);
	}, [folders, viewMode, notes]);

	// Separate inbox from other folders (only in active view)
	const inbox = useMemo(() => {
		if (viewMode === "archived") {
			// Check if inbox has archived notes
			const inboxHasArchivedNotes = notes.some((n) => n.folder === "inbox" && n.archived);
			if (inboxHasArchivedNotes) {
				return folders.find((f) => f.id === "inbox") || null;
			}
			return null;
		}
		return folders.find((f) => f.id === "inbox" && !f.archived) || null;
	}, [folders, viewMode, notes]);

	const nonInboxFolders = useMemo(() => {
		return visibleFolders.filter((f) => f.id !== "inbox");
	}, [visibleFolders]);

	// Build folder tree (excluding inbox)
	const folderTree = useMemo(() => {
		return buildFolderTree(nonInboxFolders, null);
	}, [nonInboxFolders]);

	// Sort folders
	const sortedFolderTree = useMemo(() => {
		const sortTree = (tree: typeof folderTree): typeof folderTree => {
			return tree
				.sort((a, b) => {
					switch (sortBy) {
						case "name-asc":
							return a.folder.name.localeCompare(b.folder.name);
						case "name-desc":
							return b.folder.name.localeCompare(a.folder.name);
						case "created-asc":
							return (
								(a.folder.createdAt?.getTime() || 0) -
								(b.folder.createdAt?.getTime() || 0)
							);
						case "created-desc":
							return (
								(b.folder.createdAt?.getTime() || 0) -
								(a.folder.createdAt?.getTime() || 0)
							);
						default:
							return (a.folder.order || 0) - (b.folder.order || 0);
					}
				})
				.map((node) => ({
					...node,
					children: sortTree(node.children),
				}));
		};

		return sortTree(folderTree);
	}, [folderTree, sortBy]);

	// Focus input when editing/creating
	useEffect(() => {
		if ((showNewFolder || editingFolder) && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [showNewFolder, editingFolder]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			if (modKey && e.key === "n") {
				e.preventDefault();
				setShowNewFolder(true);
				setNewFolderParent(activeFolder?.id || null);
			}

			if (e.key === "F2" && activeFolder && !isAnyEditMode && activeFolder.id !== "inbox") {
				e.preventDefault();
				startEditingFolder(activeFolder.id, activeFolder.name);
			}

			if (
				e.key === "Delete" &&
				activeFolder &&
				activeFolder.id !== "inbox" &&
				!isAnyEditMode
			) {
				e.preventDefault();
				handleDeleteFolder(activeFolder.id, activeFolder.name);
			}

			if (
				e.shiftKey &&
				e.key === "F10" &&
				activeFolder &&
				!isAnyEditMode &&
				activeFolder.id !== "inbox"
			) {
				e.preventDefault();
				const folderElement = document.querySelector(
					`[data-folder-id="${activeFolder.id}"]`
				);
				if (folderElement) {
					const rect = folderElement.getBoundingClientRect();
					setContextMenu({
						x: rect.left + rect.width / 2,
						y: rect.top + rect.height / 2,
						folderId: activeFolder.id,
					});
				}
			}

			if (e.key === "Escape") {
				if (contextMenu) {
					setContextMenu(null);
				} else {
					cancelAll();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [activeFolder, isAnyEditMode, contextMenu]);

	const cancelEditing = useCallback(() => {
		setEditingFolder(null);
		setEditFolderName("");
		setFolderError(null);
	}, []);

	const cancelCreating = useCallback(() => {
		setShowNewFolder(false);
		setNewFolderName("");
		setNewFolderParent(null);
		setFolderError(null);
	}, []);

	const cancelAll = useCallback(() => {
		cancelEditing();
		cancelCreating();
	}, [cancelEditing, cancelCreating]);

	const toggleFolder = useCallback((folderKey: string) => {
		setExpandedFolders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(folderKey)) {
				newSet.delete(folderKey);
			} else {
				newSet.add(folderKey);
			}
			return newSet;
		});
	}, []);

	const toggleAllFolders = useCallback(() => {
		const allFolderIds = nonInboxFolders.map((f) => f.id);

		if (expandedFolders.size === allFolderIds.length) {
			setExpandedFolders(new Set());
		} else {
			setExpandedFolders(new Set(allFolderIds));
		}
	}, [nonInboxFolders, expandedFolders]);

	const startEditingFolder = useCallback(
		(folderId: string, currentName: string) => {
			if (isAnyEditMode || folderId === "inbox") return;
			setEditingFolder(folderId);
			setEditFolderName(currentName);
		},
		[isAnyEditMode]
	);

	const saveEditedFolder = useCallback(
		(folderId: string) => {
			if (editFolderName.trim()) {
				const result = updateFolder(folderId, { name: editFolderName.trim() });
				if (result.error) {
					setFolderError(result.error);
					// Auto-clear error after 3 seconds
					setTimeout(() => setFolderError(null), 3000);
					return; // Don't cancel editing on error
				}
			}
			setFolderError(null);
			cancelEditing();
		},
		[editFolderName, cancelEditing, updateFolder]
	);

	const handleDeleteFolder = useCallback((folderId: string, folderName: string) => {
		if (folderId === "inbox") return;
		setDeleteConfirmation({
			type: "folder",
			id: folderId,
			name: folderName,
		});
	}, []);

	const confirmDelete = useCallback(() => {
		if (!deleteConfirmation) return;

		deleteFolder(deleteConfirmation.id);

		if (activeFolder?.id === deleteConfirmation.id) {
			setActiveFolder(inbox);
		}

		setDeleteConfirmation(null);
	}, [deleteConfirmation, deleteFolder, activeFolder, setActiveFolder, inbox]);

	const addNewFolder = useCallback(() => {
		if (newFolderName.trim()) {
			const result = addFolder({
				name: newFolderName.trim(),
				parentId: newFolderParent,
			});

			if (result.error) {
				setFolderError(result.error);
				// Auto-clear error after 3 seconds
				setTimeout(() => setFolderError(null), 3000);
				return; // Don't cancel creating on error
			}

			setFolderError(null);

			if (newFolderParent) {
				setExpandedFolders((prev) => new Set([...prev, newFolderParent]));
			}

			cancelCreating();
		}
	}, [newFolderName, newFolderParent, addFolder, cancelCreating]);

	// Drag and Drop Handlers
	const handleMouseDown = useCallback(
		(folderId: string) => {
			if (folderId === "inbox" || isAnyEditMode) {
				return;
			}

			const timer = setTimeout(() => {
				setDragReadyFolder(folderId);
			}, 200);

			setDragDelayTimer(timer);
		},
		[isAnyEditMode]
	);

	const handleMouseUp = useCallback(() => {
		if (dragDelayTimer) {
			clearTimeout(dragDelayTimer);
			setDragDelayTimer(null);
		}
		setDragReadyFolder(null);
	}, [dragDelayTimer]);

	const handleDragStart = useCallback(
		(e: React.DragEvent, folderId: string) => {
			if (isAnyEditMode || folderId === "inbox") {
				e.preventDefault();
				return;
			}

			if (dragReadyFolder !== folderId) {
				e.preventDefault();
				return;
			}

			const folder = folders.find((f) => f.id === folderId);
			if (folder) {
				setDraggedFolder({ folder });
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", folderId);
			}
		},
		[folders, isAnyEditMode, dragReadyFolder]
	);

	useEffect(() => {
		return () => {
			if (dragDelayTimer) {
				clearTimeout(dragDelayTimer);
			}
		};
	}, [dragDelayTimer]);

	const handleDragOver = useCallback(
		(e: React.DragEvent, folderId: string) => {
			e.preventDefault();
			e.stopPropagation();

			if (!draggedFolder) return;

			if (folderId === "inbox") {
				e.dataTransfer.dropEffect = "none";
				return;
			}

			if (!canMoveFolder(folders, draggedFolder.folder.id, folderId)) {
				e.dataTransfer.dropEffect = "none";
				return;
			}

			e.dataTransfer.dropEffect = "move";
			setDragOverFolder(folderId);
		},
		[draggedFolder, folders]
	);

	const handleRootDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (!draggedFolder) return;

			if (canMoveFolder(folders, draggedFolder.folder.id, null)) {
				e.dataTransfer.dropEffect = "move";
				setDragOverFolder("root");
			} else {
				e.dataTransfer.dropEffect = "none";
			}
		},
		[draggedFolder, folders]
	);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const relatedTarget = e.relatedTarget as HTMLElement;
		const currentTarget = e.currentTarget as HTMLElement;

		if (!currentTarget.contains(relatedTarget)) {
			setDragOverFolder(null);
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent, targetFolderId: string | null) => {
			e.preventDefault();
			e.stopPropagation();
			setDragOverFolder(null);

			if (!draggedFolder) return;

			const sourceFolderId = draggedFolder.folder.id;

			if (sourceFolderId === targetFolderId) {
				setDraggedFolder(null);
				return;
			}

			if (targetFolderId === "inbox") {
				setDraggedFolder(null);
				return;
			}

			if (!canMoveFolder(folders, sourceFolderId, targetFolderId)) {
				setDraggedFolder(null);
				return;
			}

			moveFolder(sourceFolderId, targetFolderId);

			if (targetFolderId && targetFolderId !== "inbox") {
				setExpandedFolders((prev) => new Set([...prev, targetFolderId]));
			}

			setDraggedFolder(null);
		},
		[draggedFolder, folders, moveFolder]
	);

	const handleDragEnd = useCallback(() => {
		setDraggedFolder(null);
		setDragOverFolder(null);
		setDragReadyFolder(null);
		if (dragDelayTimer) {
			clearTimeout(dragDelayTimer);
			setDragDelayTimer(null);
		}
	}, [dragDelayTimer]);

	const handleToggleArchive = useCallback(() => {
		if (!activeFolder || activeFolder.id === "inbox") return;

		if (activeFolder.archived) {
			unarchiveFolder(activeFolder.id);
		} else {
			archiveFolder(activeFolder.id);
		}
	}, [activeFolder, archiveFolder, unarchiveFolder]);

	// Render folder tree recursively
	const renderFolderTree = (tree: typeof folderTree, depth: number = 0) => {
		return tree.map((node) => {
			const { folder, children } = node;
			const hasChildren = children.length > 0;
			const isExpanded = expandedFolders.has(folder.id);
			const isEditingThis = editingFolder === folder.id;
			const isDragging = draggedFolder?.folder.id === folder.id;
			const isDragOver = dragOverFolder === folder.id;
			const isDragReady = dragReadyFolder === folder.id;

			return (
				<li key={folder.id} role="treeitem" aria-expanded={isExpanded}>
					<FolderItem
						folder={folder}
						isActive={activeFolder?.id === folder.id}
						isExpanded={isExpanded}
						noteCount={getNoteCount(folder.id, viewMode === "archived", true)}
						hasChildren={hasChildren}
						onToggle={hasChildren ? () => toggleFolder(folder.id) : undefined}
						onSelect={() => {
							if (!isAnyEditMode) {
								if (activeFolder?.id === folder.id && hasChildren) {
									toggleFolder(folder.id);
								}
								setActiveFolder(folder);
								setActiveTags([]);
							}
						}}
						onContextMenu={(e) => {
							e.preventDefault();
							setContextMenu({
								x: e.clientX,
								y: e.clientY,
								folderId: folder.id,
							});
						}}
						isEditing={isEditingThis}
						editValue={editFolderName}
						onEditChange={setEditFolderName}
						onEditSave={() => saveEditedFolder(folder.id)}
						onEditCancel={cancelEditing}
						isDragging={isDragging}
						isDragOver={isDragOver}
						isDragReady={isDragReady}
						onDragStart={(e) => handleDragStart(e, folder.id)}
						onDragOver={(e) => handleDragOver(e, folder.id)}
						onDragLeave={handleDragLeave}
						onDrop={(e) => handleDrop(e, folder.id)}
						onDragEnd={handleDragEnd}
						onMouseDown={() => handleMouseDown(folder.id)}
						onMouseUp={handleMouseUp}
						dataFolderId={folder.id}
						depth={depth}
						draggable={!isEditing && !isCreating && viewMode !== "archived"}
					/>

					{showNewFolder && newFolderParent === folder.id && (
						<div
							className="ml-8 mt-1 mb-2"
							style={{ paddingLeft: `${(depth + 1) * 12}px` }}
						>
							<input
								ref={inputRef}
								type="text"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addNewFolder();
									} else if (e.key === "Escape") {
										e.preventDefault();
										cancelCreating();
									}
								}}
								onBlur={cancelCreating}
								placeholder="Folder name..."
								className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
								aria-label="New folder name"
							/>
						</div>
					)}

					{isExpanded && hasChildren && (
						<ul className="ml-1" style={{ paddingLeft: `${depth * 6}px` }} role="group">
							{renderFolderTree(children, depth + 1)}
						</ul>
					)}
				</li>
			);
		});
	};

	if (isCollapsed) {
		return (
			<div className="h-full w-12 flex flex-col items-center justify-start p-2 bg-muted border-r border-border">
				<button
					type="button"
					onClick={() => onToggleCollapse(false)}
					className="p-2 hover:bg-accent rounded-lg transition-colors"
					title="Expand Sidebar"
					aria-label="Expand sidebar"
				>
					<PanelLeftOpen size={20} />
				</button>
			</div>
		);
	}

	return (
		<>
			<ConfirmationModal
				isOpen={deleteConfirmation !== null}
				title="Delete Folder"
				message={`Are you sure you want to delete "${deleteConfirmation?.name}"? All notes in this folder and its subfolders will be moved to the Inbox.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={confirmDelete}
				onCancel={() => setDeleteConfirmation(null)}
			/>

			<SearchModal
				isOpen={showSearchModal}
				onClose={() => setShowSearchModal(false)}
				notes={notes}
				folders={folders}
				onSelectNote={(noteId, folderId) => {
					const folder = getFolderById(folderId);
					setActiveFolder(folder || null);
					onSelectNote(noteId);
					setShowSearchModal(false);
				}}
			/>

			{showIconPicker && (
				<Modal
					isOpen={true}
					onClose={() => setShowIconPicker(null)}
					title="Choose Folder Icon"
					description="Select an icon for your folder"
					className="sm:max-w-lg"
				>
					<FolderIconPicker
						currentIcon={getFolderById(showIconPicker)?.icon}
						onSelect={(icon) => {
							updateFolder(showIconPicker, { icon });
							setShowIconPicker(null);
						}}
					/>
				</Modal>
			)}

			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					folderId={contextMenu.folderId}
					folderName={getFolderById(contextMenu.folderId)?.name || ""}
					onClose={() => setContextMenu(null)}
					onRename={(id, name) => {
						startEditingFolder(id, name);
						setContextMenu(null);
					}}
					onDelete={(id, name) => {
						handleDeleteFolder(id, name);
						setContextMenu(null);
					}}
					onAddSubfolder={(id) => {
						setShowNewFolder(true);
						setNewFolderParent(id);
						setContextMenu(null);
					}}
					onChangeIcon={(id) => {
						setShowIconPicker(id);
						setContextMenu(null);
					}}
					onArchive={handleToggleArchive}
					isArchived={getFolderById(contextMenu.folderId)?.archived || false}
				/>
			)}

			<nav
				ref={navRef}
				className="h-full flex flex-col bg-muted"
				aria-label="Folder navigation"
			>
				{/* Toolbar */}
				<div className="p-3 border-b border-border space-y-2">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-sm">
							{viewMode === "archived" ? "Archived" : "Notes"}
						</h2>
						<button
							type="button"
							onClick={() => onToggleCollapse(true)}
							className="p-1.5 hover:bg-accent rounded transition-colors"
							title="Collapse Sidebar"
							aria-label="Collapse sidebar"
						>
							<PanelLeftClose size={16} />
						</button>
					</div>

					{/* Action buttons */}
					<div className="flex items-center justify-center">
						<div className="inline-flex">
							<ActionButton
								icon={Plus}
								onClick={onCreateNote}
								variant="primary"
								title="New Note (Ctrl/Cmd + =)"
								ariaLabel="Create new note"
								className="rounded-r-none border-r-0"
							/>
							<ActionButton
								icon={FolderPlus}
								onClick={() => {
									setShowNewFolder(true);
									setNewFolderParent(null);
								}}
								disabled={isAnyEditMode || viewMode === "archived"}
								title="New Folder (Ctrl/Cmd + N)"
								ariaLabel="Create new folder"
								className="rounded-none border-r-0"
							/>
							<ActionButton
								icon={SearchIcon}
								onClick={() => setShowSearchModal(true)}
								title="Search Notes and Folders"
								ariaLabel="Search"
								className="rounded-none border-r-0"
							/>
							<ActionButton
								icon={viewMode === "archived" ? ArchiveX : Archive}
								onClick={() =>
									setViewMode(viewMode === "active" ? "archived" : "active")
								}
								variant={viewMode === "archived" ? "active" : "default"}
								title={
									viewMode === "active"
										? "View Archived Notes"
										: "View Active Notes"
								}
								ariaLabel={
									viewMode === "active"
										? "Switch to archived notes"
										: "Switch to active notes"
								}
								className="rounded-none border-r-0"
							/>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<div>
										<ActionButton
											icon={SortAsc}
											onClick={() => {}}
											title="Sort Folders"
											ariaLabel="Sort folders"
											className="rounded-none border-r-0"
										/>
									</div>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setSortBy("name-asc")}>
										Name (A-Z)
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setSortBy("name-desc")}>
										Name (Z-A)
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => setSortBy("created-asc")}>
										Oldest First
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setSortBy("created-desc")}>
										Newest First
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<ActionButton
								icon={
									expandedFolders.size === nonInboxFolders.length
										? ListChevronsUpDown
										: ListChevronsDownUp
								}
								onClick={toggleAllFolders}
								title={
									expandedFolders.size === nonInboxFolders.length
										? "Collapse All Folders"
										: "Expand All Folders"
								}
								ariaLabel="Toggle all folders"
								className="rounded-l-none"
							/>
						</div>
					</div>

					{/* Error message */}
					{folderError && (
						<div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-xs text-destructive">{folderError}</p>
						</div>
					)}
				</div>

				{/* New top-level folder input */}
				{showNewFolder && newFolderParent === null && (
					<div className="p-3 bg-accent/50 border-b border-border">
						<input
							ref={inputRef}
							type="text"
							value={newFolderName}
							onChange={(e) => setNewFolderName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addNewFolder();
								} else if (e.key === "Escape") {
									e.preventDefault();
									cancelCreating();
								}
							}}
							onBlur={cancelCreating}
							placeholder="Folder name..."
							className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
							aria-label="New folder name"
						/>
					</div>
				)}

				{/* Folder Tree Drop Zone */}
				<div
					className="flex-1 overflow-y-auto overflow-x-hidden p-2"
					onDragOver={handleRootDragOver}
					onDrop={(e) => handleDrop(e, null)}
					onDragLeave={handleDragLeave}
				>
					{/* Inbox - show in both active and archived view if it has relevant notes */}
					{inbox && (
						<>
							<FolderItem
								folder={inbox}
								isActive={activeFolder?.id === inbox.id}
								isExpanded={false}
								noteCount={getNoteCount(inbox.id, viewMode === "archived", true)}
								hasChildren={false}
								onSelect={() => {
									if (!isAnyEditMode) {
										setActiveFolder(inbox);
										setActiveTags([]);
									}
								}}
								onContextMenu={(e) => e.preventDefault()}
								isEditing={false}
								editValue=""
								onEditChange={() => {}}
								onEditSave={() => {}}
								onEditCancel={() => {}}
								isDragging={false}
								isDragOver={false}
								onDragStart={(e) => e.preventDefault()}
								onDragOver={(e) => e.preventDefault()}
								onDragLeave={(e) => e.preventDefault()}
								onDrop={(e) => e.preventDefault()}
								onDragEnd={() => {}}
								onMouseDown={() => {}}
								onMouseUp={() => {}}
								dataFolderId="inbox"
								isInbox={true}
								depth={0}
								draggable={false}
							/>

							{/* Divider */}
							{nonInboxFolders.length > 0 && (
								<div className="my-2 mx-2 border-b border-border" />
							)}
						</>
					)}

					{/* Empty state for archived view */}
					{viewMode === "archived" && !inbox && nonInboxFolders.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							<Archive size={32} className="mx-auto mb-2 opacity-50" />
							<p className="text-sm">No archived notes</p>
						</div>
					)}

					{/* Other folders */}
					<ul
						className={`space-y-0.5 ${
							dragOverFolder === "root" ? "bg-primary/5 rounded-lg" : ""
						}`}
						role="tree"
						aria-label="Folder tree"
					>
						{renderFolderTree(sortedFolderTree)}
					</ul>
				</div>
			</nav>
		</>
	);
};
