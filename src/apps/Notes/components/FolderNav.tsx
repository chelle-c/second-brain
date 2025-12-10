import { useState, useEffect, useRef, useCallback } from "react";
import { NotesFolder, Subfolder } from "@/types/notes";
import {
	Inbox,
	ChevronRight,
	ChevronDown,
	Folder,
	FolderPlus,
	Edit2,
	Trash2,
	MoreVertical,
	Check,
	X,
	Undo2,
	Redo2,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotesStore } from "@/stores/useNotesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { ConfirmationModal } from "@/components/ConfirmationModal";

interface FolderNavProps {
	allFolders: Record<string, NotesFolder>;
	activeFolder: NotesFolder | Subfolder | null;
	setActiveFolder: (folder: NotesFolder | Subfolder | null) => void;
	getCurrentFolder: (id: string) => NotesFolder | Subfolder;
	setActiveTags: (tags: string[]) => void;
	getNoteCount: (folderId: string, archived?: boolean) => number;
	viewMode: "active" | "archived";
	setViewMode: (mode: "active" | "archived") => void;
}

interface DeleteConfirmation {
	type: "folder" | "subfolder";
	id: string;
	name: string;
	parentId?: string;
}

export const FolderNav = ({
	allFolders,
	activeFolder,
	getCurrentFolder,
	setActiveFolder,
	setActiveTags,
	getNoteCount,
	viewMode,
	setViewMode,
}: FolderNavProps) => {
	const {
		addFolder,
		updateFolder,
		deleteFolder,
		addSubFolder,
		updateSubFolder,
		removeSubfolder,
		undo,
		redo,
	} = useNotesStore();

	const { canUndo, canRedo } = useHistoryStore();

	const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
	const [editingFolder, setEditingFolder] = useState<string | null>(null);
	const [editFolderName, setEditFolderName] = useState("");
	const [newFolderName, setNewFolderName] = useState("");
	const [showNewFolder, setShowNewFolder] = useState(false);
	const [showNewSubfolder, setShowNewSubfolder] = useState<string | null>(null);
	const [newSubfolderName, setNewSubfolderName] = useState("");
	const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const newFolderContainerRef = useRef<HTMLDivElement>(null);
	const newSubfolderContainerRef = useRef<HTMLDivElement>(null);

	const isCreating = showNewFolder || showNewSubfolder !== null;
	const isEditing = editingFolder !== null;
	const isAnyEditMode = isCreating || isEditing;

	useEffect(() => {
		if ((showNewFolder || showNewSubfolder || editingFolder) && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [showNewFolder, showNewSubfolder, editingFolder]);

	const cancelEditing = useCallback(() => {
		setEditingFolder(null);
		setEditFolderName("");
	}, []);

	const cancelCreating = useCallback(() => {
		setShowNewFolder(false);
		setNewFolderName("");
		setShowNewSubfolder(null);
		setNewSubfolderName("");
	}, []);

	const cancelAll = useCallback(() => {
		cancelEditing();
		cancelCreating();
	}, [cancelEditing, cancelCreating]);

	useEffect(() => {
		if (!isEditing) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (inputRef.current && !inputRef.current.contains(target)) {
				cancelEditing();
			}
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener("mousedown", handleClickOutside);
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEditing, cancelEditing]);

	useEffect(() => {
		if (!isCreating) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const containerRef = showNewFolder ? newFolderContainerRef : newSubfolderContainerRef;

			if (containerRef.current && !containerRef.current.contains(target)) {
				cancelCreating();
			}
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener("mousedown", handleClickOutside);
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isCreating, showNewFolder, cancelCreating]);

	useEffect(() => {
		if (!isCreating) return;

		const handleFocusOut = (e: FocusEvent) => {
			const containerRef = showNewFolder ? newFolderContainerRef : newSubfolderContainerRef;
			const relatedTarget = e.relatedTarget as HTMLElement;

			if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
				cancelCreating();
			}
		};

		const container = showNewFolder
			? newFolderContainerRef.current
			: newSubfolderContainerRef.current;
		container?.addEventListener("focusout", handleFocusOut);

		return () => {
			container?.removeEventListener("focusout", handleFocusOut);
		};
	}, [isCreating, showNewFolder, cancelCreating]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				cancelAll();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [cancelAll]);

	const toggleFolder = (folderKey: string) => {
		const newExpanded = new Set(expandedFolders);
		if (newExpanded.has(folderKey)) {
			newExpanded.delete(folderKey);
		} else {
			newExpanded.add(folderKey);
		}
		setExpandedFolders(newExpanded);
	};

	const startEditingFolder = (folderId: string, currentName: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setEditingFolder(folderId);
		setEditFolderName(currentName);
	};

	const saveEditedFolder = (folderId: string, isSubfolder: boolean) => {
		if (editFolderName.trim()) {
			if (isSubfolder) {
				updateSubFolder(folderId, { name: editFolderName.trim() });
			} else {
				updateFolder(folderId, { name: editFolderName.trim() });
			}
		}
		cancelEditing();
	};

	const handleDeleteFolder = (folderId: string, folderName: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setDeleteConfirmation({
			type: "folder",
			id: folderId,
			name: folderName,
		});
	};

	const handleDeleteSubfolder = (
		subfolderId: string,
		subfolderName: string,
		parentId: string,
		e?: React.MouseEvent
	) => {
		e?.stopPropagation();
		setDeleteConfirmation({
			type: "subfolder",
			id: subfolderId,
			name: subfolderName,
			parentId,
		});
	};

	const confirmDelete = () => {
		if (!deleteConfirmation) return;

		if (deleteConfirmation.type === "folder") {
			deleteFolder(deleteConfirmation.id);
			if (activeFolder?.id === deleteConfirmation.id) {
				setActiveFolder(allFolders["inbox"]);
			}
		} else {
			removeSubfolder(deleteConfirmation.id);
			if (activeFolder?.id === deleteConfirmation.id && deleteConfirmation.parentId) {
				setActiveFolder(allFolders[deleteConfirmation.parentId]);
			}
		}

		setDeleteConfirmation(null);
	};

	const addNewFolder = () => {
		if (newFolderName.trim()) {
			addFolder({ name: newFolderName.trim() });
			cancelCreating();
		}
	};

	const addNewSubfolder = (parentId: string) => {
		if (newSubfolderName.trim()) {
			const subfolderId = `${parentId}_${Date.now()}`;
			addSubFolder({
				id: subfolderId,
				name: newSubfolderName.trim(),
				parent: parentId,
			});
			setExpandedFolders((prev) => new Set([...prev, parentId]));
			cancelCreating();
		}
	};

	const handleEditKeyDown = (e: React.KeyboardEvent, folderId: string, isSubfolder: boolean) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveEditedFolder(folderId, isSubfolder);
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelEditing();
		}
	};

	const handleCreateKeyDown = (e: React.KeyboardEvent, action: () => void) => {
		if (e.key === "Enter") {
			e.preventDefault();
			action();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelCreating();
		}
	};

	return (
		<>
			<ConfirmationModal
				isOpen={deleteConfirmation !== null}
				title={`Delete ${deleteConfirmation?.type === "folder" ? "Folder" : "Subfolder"}`}
				message={
					deleteConfirmation?.type === "folder"
						? `Are you sure you want to delete "${deleteConfirmation?.name}"? All notes in this folder and its subfolders will be moved to the Inbox.`
						: `Are you sure you want to delete "${deleteConfirmation?.name}"? All notes will be moved to the parent folder.`
				}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={confirmDelete}
				onCancel={() => setDeleteConfirmation(null)}
			/>

			<div className="h-full flex flex-col p-3 relative">
				{/* View Mode Toggle */}
				<div className="mb-3">
					<AnimatedToggle
						options={[
							{ value: "active", label: "Active" },
							{ value: "archived", label: "Archived" },
						]}
						value={viewMode}
						onChange={(value) => setViewMode(value as "active" | "archived")}
						className="w-full"
					/>
				</div>

				{/* Undo/Redo buttons */}
				<div className="flex gap-1 mb-3">
					<button
						type="button"
						onClick={undo}
						disabled={!canUndo}
						className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
						title="Undo (Ctrl+Z)"
					>
						<Undo2 size={14} />
						Undo
					</button>
					<button
						type="button"
						onClick={redo}
						disabled={!canRedo}
						className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
						title="Redo (Ctrl+Y)"
					>
						<Redo2 size={14} />
						Redo
					</button>
				</div>

				<div className="flex justify-between items-center mb-3">
					<h3 className="font-semibold text-foreground text-sm">Folders</h3>
					<button
						type="button"
						onClick={() => setShowNewFolder(true)}
						disabled={isAnyEditMode}
						className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						title="Add folder"
					>
						<FolderPlus size={18} className="text-muted-foreground" />
					</button>
				</div>

				{/* New folder input */}
				{showNewFolder && (
					<div
						ref={newFolderContainerRef}
						className="mb-2 p-2 bg-muted rounded-lg border border-border"
					>
						<input
							ref={inputRef}
							type="text"
							value={newFolderName}
							onChange={(e) => setNewFolderName(e.target.value)}
							onKeyDown={(e) => handleCreateKeyDown(e, addNewFolder)}
							placeholder="Folder name..."
							className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						<div className="flex justify-end gap-1 mt-2">
							<button
								type="button"
								onClick={cancelCreating}
								className="p-1.5 text-muted-foreground hover:bg-accent rounded cursor-pointer"
								title="Cancel (Esc)"
							>
								<X size={16} />
							</button>
							<button
								type="button"
								onClick={addNewFolder}
								disabled={!newFolderName.trim()}
								className="p-1.5 text-primary hover:bg-primary/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
								title="Save (Enter)"
							>
								<Check size={16} />
							</button>
						</div>
					</div>
				)}

				<div className="space-y-0.5 overflow-y-auto flex-1 overflow-x-hidden">
					{/* Inbox */}
					<button
						type="button"
						onClick={() => {
							if (!isAnyEditMode) {
								setActiveFolder(allFolders["inbox"]);
								setActiveTags([]);
							}
						}}
						disabled={isAnyEditMode}
						className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
							activeFolder && activeFolder.id === "inbox"
								? "bg-primary/10 text-primary"
								: "hover:bg-accent"
						} ${isAnyEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<div className="flex items-center gap-2">
							<Inbox size={16} />
							<span className="text-sm font-medium">Inbox</span>
						</div>
						<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
							{getNoteCount("inbox", viewMode === "archived")}
						</span>
					</button>

					{/* Other folders */}
					{Object.entries(allFolders).map(([key, folder]) => {
						if (key === "inbox") return null;
						const folderType = folder as NotesFolder;
						const hasSubfolders = folderType.children && folderType.children.length > 0;
						const isExpanded = expandedFolders.has(key);
						const isEditingThis = editingFolder === key;

						return (
							<div key={key}>
								<div
									className={`group pl-1 flex items-center rounded-lg transition-colors ${
										activeFolder && activeFolder.id === key
											? "bg-primary/10 text-primary"
											: "hover:bg-accent"
									} ${
										isAnyEditMode && !isEditingThis
											? "opacity-50 pointer-events-none"
											: ""
									}`}
								>
									<button
										type="button"
										onClick={() => !isAnyEditMode && toggleFolder(key)}
										disabled={isAnyEditMode}
										className="p-1 hover:bg-accent rounded shrink-0 cursor-pointer"
									>
										{hasSubfolders ? (
											isExpanded ? (
												<ChevronDown size={14} />
											) : (
												<ChevronRight size={14} />
											)
										) : (
											<div className="w-3.5" />
										)}
									</button>

									{isEditingThis ? (
										<div className="flex-1 py-1 pr-2">
											<input
												ref={inputRef}
												type="text"
												value={editFolderName}
												onChange={(e) => setEditFolderName(e.target.value)}
												onKeyDown={(e) => handleEditKeyDown(e, key, false)}
												onBlur={() => saveEditedFolder(key, false)}
												className="w-full px-1.5 py-0.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
											/>
										</div>
									) : (
										<div
											onClick={() => {
												if (!isAnyEditMode) {
													setActiveFolder(getCurrentFolder(key));
													setActiveTags([]);
												}
											}}
											className={`flex-1 flex items-center justify-between px-1 py-1.5 cursor-pointer min-w-0 ${
												isAnyEditMode ? "cursor-not-allowed" : ""
											}`}
										>
											<div className="flex items-center gap-2 min-w-0">
												<Folder size={16} className="shrink-0" />
												<span className="text-sm font-medium truncate">
													{folderType.name}
												</span>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
													{getNoteCount(key, viewMode === "archived")}
												</span>
												{!isAnyEditMode && (
													<DropdownMenu>
														<DropdownMenuTrigger
															onClick={(e) => e.stopPropagation()}
															className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-accent rounded transition-all focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
														>
															<MoreVertical size={14} />
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	startEditingFolder(
																		key,
																		folderType.name
																	);
																}}
																className="cursor-pointer"
															>
																<Edit2 size={14} className="mr-2" />
																Rename
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	setShowNewSubfolder(key);
																}}
																className="cursor-pointer"
															>
																<FolderPlus
																	size={14}
																	className="mr-2"
																/>
																Add Subfolder
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) =>
																	handleDeleteFolder(
																		key,
																		folderType.name,
																		e
																	)
																}
																className="text-red-600 cursor-pointer"
															>
																<Trash2
																	size={14}
																	className="mr-2"
																/>
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
											</div>
										</div>
									)}
								</div>

								{/* New subfolder input */}
								{showNewSubfolder === key && (
									<div
										ref={newSubfolderContainerRef}
										className="ml-5 mt-1 p-2 bg-muted rounded-lg border border-border"
									>
										<input
											ref={inputRef}
											type="text"
											value={newSubfolderName}
											onChange={(e) => setNewSubfolderName(e.target.value)}
											onKeyDown={(e) =>
												handleCreateKeyDown(e, () => addNewSubfolder(key))
											}
											placeholder="Subfolder name..."
											className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
										/>
										<div className="flex justify-end gap-1 mt-2">
											<button
												type="button"
												onClick={cancelCreating}
												className="p-1.5 text-muted-foreground hover:bg-accent rounded cursor-pointer"
												title="Cancel (Esc)"
											>
												<X size={16} />
											</button>
											<button
												type="button"
												onClick={() => addNewSubfolder(key)}
												disabled={!newSubfolderName.trim()}
												className="p-1.5 text-primary hover:bg-primary/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
												title="Save (Enter)"
											>
												<Check size={16} />
											</button>
										</div>
									</div>
								)}

								{/* Subfolders */}
								{isExpanded &&
									folderType.children &&
									folderType.children.length > 0 &&
									folderType.children.map((subfolder) => {
										const isEditingSubfolder = editingFolder === subfolder.id;

										return (
											<div
												key={subfolder.id}
												className={`group ml-5 flex items-center rounded-lg transition-colors ${
													activeFolder?.id === subfolder.id
														? "bg-primary/10 text-primary"
														: "hover:bg-accent"
												} ${
													isAnyEditMode && !isEditingSubfolder
														? "opacity-50 pointer-events-none"
														: ""
												}`}
											>
												{isEditingSubfolder ? (
													<div className="flex-1 py-1 px-2">
														<input
															ref={inputRef}
															type="text"
															value={editFolderName}
															onChange={(e) =>
																setEditFolderName(e.target.value)
															}
															onKeyDown={(e) =>
																handleEditKeyDown(
																	e,
																	subfolder.id,
																	true
																)
															}
															onBlur={() =>
																saveEditedFolder(subfolder.id, true)
															}
															className="w-full px-1.5 py-0.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
														/>
													</div>
												) : (
													<div
														onClick={() => {
															if (!isAnyEditMode) {
																setActiveFolder(subfolder);
																setActiveTags([]);
															}
														}}
														className={`flex-1 flex items-center justify-between px-2 py-1.5 cursor-pointer min-w-0 ${
															isAnyEditMode
																? "cursor-not-allowed"
																: ""
														}`}
													>
														<div className="flex items-center gap-2 min-w-0">
															<Folder
																size={14}
																className="shrink-0"
															/>
															<span className="text-sm truncate">
																{subfolder.name}
															</span>
														</div>
														<div className="flex items-center gap-1 shrink-0">
															<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
																{getNoteCount(
																	subfolder.id,
																	viewMode === "archived"
																)}
															</span>
															{!isAnyEditMode && (
																<DropdownMenu>
																	<DropdownMenuTrigger
																		onClick={(e) =>
																			e.stopPropagation()
																		}
																		className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-accent rounded transition-all focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
																	>
																		<MoreVertical size={14} />
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={(e) => {
																				e.stopPropagation();
																				startEditingFolder(
																					subfolder.id,
																					subfolder.name
																				);
																			}}
																			className="cursor-pointer"
																		>
																			<Edit2
																				size={14}
																				className="mr-2"
																			/>
																			Rename
																		</DropdownMenuItem>
																		<DropdownMenuItem
																			onClick={(e) =>
																				handleDeleteSubfolder(
																					subfolder.id,
																					subfolder.name,
																					key,
																					e
																				)
																			}
																			className="text-red-600 cursor-pointer"
																		>
																			<Trash2
																				size={14}
																				className="mr-2"
																			/>
																			Delete
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															)}
														</div>
													</div>
												)}
											</div>
										);
									})}
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
};
