import {
	Archive,
	ArchiveRestore,
	BookOpen,
	CheckCircle,
	FileWarning,
	Lightbulb,
	Plus,
	Save,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { NotesFolder, NotesFolders, Subfolder, Tag } from "@/types/notes";
import { FolderNav } from "./components/FolderNav";
import { NoteCreate } from "./components/NoteCreate";
import { NotesBreadcrumb } from "./components/NotesBreadcrumb";
import { NotesCard } from "./components/NotesCard";
import { NotesLayout } from "./components/NotesLayout";
import { NoteView } from "./components/NoteView";

type ViewState = "list" | "view" | "create";

export function NotesApp() {
	const {
		notes,
		notesFolders,
		tags,
		undo,
		redo,
		archiveNote,
		unarchiveNote,
		deleteNote,
	} = useNotesStore();
	const { canUndo, canRedo } = useHistoryStore();
	const { notesDefaultFolder } = useSettingsStore();

	const [activeFolder, setActiveFolder] = useState<
		NotesFolder | Subfolder | null
	>(null);
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"active" | "archived">("active");
	const [viewState, setViewState] = useState<ViewState>("list");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const defaultTags: Record<string, Tag> = {
		actions: {
			id: "actions",
			name: "Actions",
			icon: CheckCircle,
			color: "#3b82f6",
		},
		ideas: { id: "ideas", name: "Ideas", icon: Lightbulb, color: "#eab308" },
		reference: {
			id: "reference",
			name: "Reference",
			icon: BookOpen,
			color: "#10b981",
		},
		uncategorized: {
			id: "uncategorized",
			name: "Uncategorized",
			icon: FileWarning,
			color: "#6b7280",
		},
	};

	const allTags = { ...defaultTags, ...tags };
	const allFolders: NotesFolders = { ...notesFolders };

	// Set initial folder from settings
	useEffect(() => {
		if (!activeFolder) {
			// Try to use the default folder from settings
			const defaultFolder = allFolders[notesDefaultFolder];
			if (defaultFolder) {
				setActiveFolder(defaultFolder);
			} else if (allFolders.inbox) {
				// Fall back to inbox if default folder doesn't exist
				setActiveFolder(allFolders.inbox);
			}
		}
	}, [notesFolders, notesDefaultFolder]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			// Ctrl/Cmd + = to create new note
			if (modKey && (e.key === "=" || e.key === "+")) {
				e.preventDefault();
				setViewState("create");
			}

			// Ctrl/Cmd + Z to undo
			if (modKey && e.key === "z" && !e.shiftKey && canUndo) {
				e.preventDefault();
				undo();
			}

			// Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
			if (
				(modKey && e.shiftKey && e.key === "z") ||
				(modKey && e.key === "y")
			) {
				if (canRedo) {
					e.preventDefault();
					redo();
				}
			}

			// Escape to go back to list when viewing a note
			if (e.key === "Escape" && viewState === "view") {
				e.preventDefault();
				handleBackToList();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, undo, redo, viewState]);

	const getSubfolderIds = (folderId: string): string[] => {
		const folder = allFolders[folderId];
		if (folder?.children && folder.children.length > 0) {
			return folder.children.map((child) => child.id);
		}
		return [];
	};

	const isSubfolder = (folderId: string): boolean => {
		return Object.values(allFolders).some((folder) =>
			folder.children?.some((child) => child.id === folderId),
		);
	};

	const getNoteCount = (
		folderId: string,
		archived: boolean = false,
	): number => {
		if (isSubfolder(folderId)) {
			return notes.filter(
				(n) => n.folder === folderId && n.archived === archived,
			).length;
		} else {
			const subfolderIds = getSubfolderIds(folderId);
			return notes.filter(
				(n) =>
					(n.folder === folderId || subfolderIds.includes(n.folder)) &&
					n.archived === archived,
			).length;
		}
	};

	const getCurrentFolder = (id: string): NotesFolder | Subfolder => {
		const currentFolder = Object.values(allFolders).find((f) => f.id === id);
		if (currentFolder === undefined) {
			const currentSubfolder = Object.values(allFolders).find((f) =>
				f.children?.find((c) => c.id === id),
			);
			return currentSubfolder?.children?.find((c) => c.id === id) as Subfolder;
		}
		return currentFolder ? currentFolder : { id: "inbox", name: "Inbox" };
	};

	const handleSelectNote = (noteId: string) => {
		setSelectedNoteId(noteId);
		setViewState("view");
	};

	const handleBackToList = () => {
		setSelectedNoteId(null);
		setViewState("list");
	};

	const handleNoteCreated = (noteId: string) => {
		setSelectedNoteId(noteId);
		setViewState("view");
	};

	const handleCreateNote = () => {
		setViewState("create");
	};

	const selectedNote = notes.find((n) => n.id === selectedNoteId);

	// Note action handlers for breadcrumb
	const handleArchiveToggle = useCallback(() => {
		if (!selectedNote) return;
		if (selectedNote.archived) {
			unarchiveNote(selectedNote.id);
		} else {
			archiveNote(selectedNote.id);
		}
		handleBackToList();
	}, [selectedNote, archiveNote, unarchiveNote]);

	const handleDeleteNote = useCallback(() => {
		setShowDeleteConfirm(true);
	}, []);

	const confirmDelete = useCallback(() => {
		if (selectedNote) {
			deleteNote(selectedNote.id);
			setShowDeleteConfirm(false);
			handleBackToList();
		}
	}, [selectedNote, deleteNote]);

	// Store handlers from NoteCreate for use by breadcrumb
	const createBackHandlerRef = useRef<(() => void) | null>(null);
	const createSaveHandlerRef = useRef<(() => void) | null>(null);

	const registerCreateBackHandler = useCallback((handler: () => void) => {
		createBackHandlerRef.current = handler;
	}, []);

	const registerCreateSaveHandler = useCallback((handler: () => void) => {
		createSaveHandlerRef.current = handler;
	}, []);

	const handleCreateBack = useCallback(() => {
		if (createBackHandlerRef.current) {
			createBackHandlerRef.current();
		} else {
			handleBackToList();
		}
	}, []);

	const handleCreateSave = useCallback(() => {
		if (createSaveHandlerRef.current) {
			createSaveHandlerRef.current();
		}
	}, []);

	const showSidebar = viewState === "list";

	const renderContent = () => {
		switch (viewState) {
			case "create":
				return (
					<div className="h-full flex flex-col">
						<NotesBreadcrumb
							activeFolder={activeFolder}
							allFolders={allFolders}
							isCreating
							onBack={handleCreateBack}
							canUndo={canUndo}
							canRedo={canRedo}
							onUndo={undo}
							onRedo={redo}
							actions={
								<Button
									onClick={handleCreateSave}
									className="bg-primary/80 text-base"
								>
									<Save size={20} />
									Save Note
								</Button>
							}
						/>
						<div className="flex-1 overflow-hidden">
							<NoteCreate
								tags={allTags}
								activeFolder={activeFolder}
								onBack={handleBackToList}
								onNoteCreated={handleNoteCreated}
								registerBackHandler={registerCreateBackHandler}
								registerSaveHandler={registerCreateSaveHandler}
							/>
						</div>
					</div>
				);
			case "view":
				if (selectedNote) {
					return (
						<div className="h-full flex flex-col">
							<NotesBreadcrumb
								activeFolder={activeFolder}
								allFolders={allFolders}
								noteTitle={selectedNote.title}
								onBack={handleBackToList}
								canUndo={canUndo}
								canRedo={canRedo}
								onUndo={undo}
								onRedo={redo}
								actions={
									<div className="flex items-center gap-2">
										<Button
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
						allFolders={allFolders}
						activeFolder={activeFolder}
						setActiveFolder={setActiveFolder}
						getCurrentFolder={getCurrentFolder}
						tags={allTags}
						activeTags={activeTags}
						getNoteCount={getNoteCount}
						setActiveTags={setActiveTags}
						onSelectNote={handleSelectNote}
						viewMode={viewMode}
						setViewMode={setViewMode}
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
					showSidebar={showSidebar}
					sidebar={
						<FolderNav
							allFolders={allFolders}
							activeFolder={activeFolder}
							setActiveFolder={setActiveFolder}
							getCurrentFolder={getCurrentFolder}
							setActiveTags={setActiveTags}
							getNoteCount={getNoteCount}
						/>
					}
					content={<div className="h-full">{renderContent()}</div>}
				/>

				{/* Floating New Note Button */}
				{viewState === "list" && (
					<button
						type="button"
						onClick={handleCreateNote}
						className="fixed bottom-8 right-12 bg-primary text-primary-foreground p-4 rounded-full
							shadow-xl hover:bg-primary/90 hover:scale-110 transition-all duration-200
							active:scale-95 z-40 group"
						title="New Note (Ctrl/Cmd + =)"
					>
						<Plus size={24} />
						<span
							className="absolute right-full mr-3 top-1/2 -translate-y-1/2
							bg-gray-800 text-white px-3 py-1 rounded-lg text-sm
							opacity-0 group-hover:opacity-100 transition-opacity duration-200
							whitespace-nowrap"
						>
							New Note
						</span>
					</button>
				)}
			</div>
		</>
	);
}
