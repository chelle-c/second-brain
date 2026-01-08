import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Folder, Tag } from "@/types/notes";
import { FolderNav } from "./components/FolderNav";
import { NoteCreate } from "./components/NoteCreate";
import { NotesBreadcrumb } from "./components/NotesBreadcrumb";
import { NotesCard } from "./components/NotesCard";
import { NotesLayout } from "./components/NotesLayout";
import { NoteView } from "./components/NoteView";
import { Archive, ArchiveRestore, BookOpen, CheckCircle, Lightbulb, Trash2 } from "lucide-react";

type ViewState = "list" | "view" | "create";

// Default tag definitions (used as fallback if tags store is empty)
const DEFAULT_TAGS: Record<string, Tag> = {
	actions: {
		id: "actions",
		name: "Actions",
		icon: CheckCircle,
		color: "#3b82f6",
	},
	ideas: {
		id: "ideas",
		name: "Ideas",
		icon: Lightbulb,
		color: "#eab308",
	},
	reference: {
		id: "reference",
		name: "Reference",
		icon: BookOpen,
		color: "#10b981",
	},
};

export function NotesApp() {
	const { notes, folders, tags, undo, redo, archiveNote, unarchiveNote, deleteNote, addTag } =
		useNotesStore();
	const { canUndo, canRedo } = useHistoryStore();
	const { notesDefaultFolder } = useSettingsStore();

	const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"active" | "archived">("active");
	const [viewState, setViewState] = useState<ViewState>("list");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	// Track if folder was changed while viewing/creating a note
	const lastActiveFolderRef = useRef<Folder | null>(null);

	// Initialize default tags if none exist
	useEffect(() => {
		if (Object.keys(tags).length === 0) {
			Object.entries(DEFAULT_TAGS).forEach(([id, tag]) => {
				addTag({ ...tag, id });
			});
		}
	}, [tags, addTag]);

	// Merge stored tags with any missing default tags for display
	// (Tags from store take precedence)
	const allTags = { ...tags };

	// Set initial folder from settings
	useEffect(() => {
		if (!activeFolder && folders.length > 0) {
			const defaultFolder = folders.find((f) => f.id === notesDefaultFolder);
			if (defaultFolder) {
				setActiveFolder(defaultFolder);
			} else {
				const inbox = folders.find((f) => f.id === "inbox");
				if (inbox) {
					setActiveFolder(inbox);
				}
			}
		}
	}, [folders, notesDefaultFolder, activeFolder]);

	// When folder changes while viewing/creating a note, close the note
	useEffect(() => {
		if (viewState !== "list" && activeFolder && lastActiveFolderRef.current) {
			if (activeFolder.id !== lastActiveFolderRef.current.id) {
				// Folder changed while viewing a note - close the note
				setSelectedNoteId(null);
				setViewState("list");
			}
		}
		lastActiveFolderRef.current = activeFolder;
	}, [activeFolder, viewState]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			if (modKey && (e.key === "=" || e.key === "+")) {
				e.preventDefault();
				setViewState("create");
			}

			if (modKey && e.key === "z" && !e.shiftKey && canUndo) {
				e.preventDefault();
				undo();
			}

			if ((modKey && e.shiftKey && e.key === "z") || (modKey && e.key === "y")) {
				if (canRedo) {
					e.preventDefault();
					redo();
				}
			}

			if (e.key === "Escape" && viewState === "view") {
				e.preventDefault();
				handleBackToList();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, undo, redo, viewState]);

	const getNoteCount = (
		folderId: string,
		archived: boolean = false,
		includeDescendants: boolean = true
	): number => {
		if (!includeDescendants) {
			return notes.filter((n) => n.folder === folderId && n.archived === archived).length;
		}

		const getDescendantIds = (id: string): string[] => {
			const children = folders.filter((f) => f.parentId === id);
			return [id, ...children.flatMap((child) => getDescendantIds(child.id))];
		};

		const folderIds = getDescendantIds(folderId);
		return notes.filter((n) => folderIds.includes(n.folder) && n.archived === archived).length;
	};

	const getFolderById = (id: string): Folder | undefined => {
		return folders.find((f) => f.id === id);
	};

	const handleSelectNote = (noteId: string) => {
		setSelectedNoteId(noteId);
		setViewState("view");
	};

	const handleBackToList = useCallback(() => {
		setSelectedNoteId(null);
		setViewState("list");
	}, []);

	const handleNoteCreated = useCallback((noteId: string) => {
		setSelectedNoteId(noteId);
		setViewState("view");
	}, []);

	const handleCreateNote = () => {
		setViewState("create");
	};

	// Handler for folder selection from sidebar
	const handleFolderSelect = useCallback(
		(folder: Folder | null) => {
			setActiveFolder(folder);
			// If we're viewing or creating a note, go back to list
			if (viewState !== "list") {
				setSelectedNoteId(null);
				setViewState("list");
			}
		},
		[viewState]
	);

	const selectedNote = notes.find((n) => n.id === selectedNoteId);

	const handleArchiveToggle = useCallback(() => {
		if (!selectedNote) return;
		if (selectedNote.archived) {
			unarchiveNote(selectedNote.id);
		} else {
			archiveNote(selectedNote.id);
		}
		handleBackToList();
	}, [selectedNote, archiveNote, unarchiveNote, handleBackToList]);

	const handleDeleteNote = useCallback(() => {
		setShowDeleteConfirm(true);
	}, []);

	const confirmDelete = useCallback(() => {
		if (selectedNote) {
			deleteNote(selectedNote.id);
			setShowDeleteConfirm(false);
			handleBackToList();
		}
	}, [selectedNote, deleteNote, handleBackToList]);

	const createBackHandlerRef = useRef<(() => void) | null>(null);

	const registerCreateBackHandler = useCallback((handler: () => void) => {
		createBackHandlerRef.current = handler;
	}, []);

	const handleCreateBack = useCallback(() => {
		if (createBackHandlerRef.current) {
			createBackHandlerRef.current();
		}
		// Always go back to list after the handler runs
		handleBackToList();
	}, [handleBackToList]);

	const renderContent = () => {
		switch (viewState) {
			case "create":
				return (
					<div className="h-full flex flex-col">
						<NotesBreadcrumb
							activeFolder={activeFolder}
							folders={folders}
							isCreating
							onBack={handleCreateBack}
							canUndo={canUndo}
							canRedo={canRedo}
							onUndo={undo}
							onRedo={redo}
						/>
						<div className="flex-1 overflow-hidden">
							<NoteCreate
								tags={allTags}
								activeFolder={activeFolder}
								onBack={handleBackToList}
								onNoteCreated={handleNoteCreated}
								registerBackHandler={registerCreateBackHandler}
							/>
						</div>
					</div>
				);
			case "view":
				if (selectedNote) {
					return (
						<div className="h-full flex flex-col">
							<NotesBreadcrumb
								activeFolder={getFolderById(selectedNote.folder) || activeFolder}
								folders={folders}
								noteTitle={selectedNote.title}
								onBack={handleBackToList}
								canUndo={canUndo}
								canRedo={canRedo}
								onUndo={undo}
								onRedo={redo}
								actions={
									<div className="flex items-center gap-2">
										<Button
											type="button"
											onClick={handleArchiveToggle}
											variant="ghost"
											size="sm"
											className="flex items-center gap-2"
										>
											{selectedNote.archived ? (
												<>
													<ArchiveRestore size={16} />
													Unarchive
												</>
											) : (
												<>
													<Archive size={16} />
													Archive
												</>
											)}
										</Button>
										<Button
											type="button"
											onClick={handleDeleteNote}
											variant="ghost"
											size="sm"
											className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
										>
											<Trash2 size={16} />
											Delete
										</Button>
									</div>
								}
							/>
							<div className="flex-1 overflow-hidden">
								<NoteView
									note={selectedNote}
									tags={allTags}
									onBack={handleBackToList}
								/>
							</div>
						</div>
					);
				}
				return null;
			default:
				return (
					<NotesCard
						folders={folders}
						activeFolder={activeFolder}
						setActiveFolder={setActiveFolder}
						getFolderById={getFolderById}
						tags={allTags}
						activeTags={activeTags}
						getNoteCount={getNoteCount}
						setActiveTags={setActiveTags}
						onSelectNote={handleSelectNote}
						viewMode={viewMode}
						canUndo={canUndo}
						canRedo={canRedo}
						onUndo={undo}
						onRedo={redo}
					/>
				);
		}
	};

	return (
		<>
			<ConfirmationModal
				isOpen={showDeleteConfirm}
				title="Delete Note"
				message={`Are you sure you want to delete "${
					selectedNote?.title || "Untitled"
				}"? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={confirmDelete}
				onCancel={() => setShowDeleteConfirm(false)}
			/>

			<div className="w-full h-full animate-fadeIn relative">
				<NotesLayout
					isCollapsed={isSidebarCollapsed}
					onToggleCollapse={setIsSidebarCollapsed}
					sidebar={
						<FolderNav
							folders={folders}
							activeFolder={activeFolder}
							setActiveFolder={handleFolderSelect}
							getFolderById={getFolderById}
							setActiveTags={setActiveTags}
							getNoteCount={getNoteCount}
							onCreateNote={handleCreateNote}
							viewMode={viewMode}
							setViewMode={setViewMode}
							onSelectNote={handleSelectNote}
							isCollapsed={isSidebarCollapsed}
							onToggleCollapse={setIsSidebarCollapsed}
						/>
					}
					content={<div className="h-full">{renderContent()}</div>}
				/>
			</div>
		</>
	);
}
