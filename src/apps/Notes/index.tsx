import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Folder, Tag } from "@/types/notes";
import { FolderNav } from "./components/FolderNav";
import { NoteEditor } from "./components/NoteEditor";
import { NotesBreadcrumb } from "./components/NotesBreadcrumb";
import { NotesCalendar } from "./components/NotesCalendar";
import { NotesCard } from "./components/NotesCard";
import { NotesLayout } from "./components/NotesLayout";
import {
	Archive,
	ArchiveRestore,
	BookOpen,
	CheckCircle,
	Lightbulb,
	PanelLeftOpen,
	Trash2,
} from "lucide-react";

type ViewState = "list" | "view" | "create";
type SidebarView = "folders" | "calendar";
type CalendarViewMode = "date" | "month";

const SIDEBAR_VIEW_OPTIONS: { value: SidebarView; label: string; ariaLabel: string }[] = [
	{ value: "folders", label: "Folders", ariaLabel: "Switch to folder view" },
	{ value: "calendar", label: "Calendar", ariaLabel: "Switch to calendar view" },
];

const DEFAULT_TAGS: Record<string, Tag> = {
	actions: { id: "actions", name: "Actions", icon: CheckCircle, color: "#3b82f6" },
	ideas: { id: "ideas", name: "Ideas", icon: Lightbulb, color: "#eab308" },
	reference: { id: "reference", name: "Reference", icon: BookOpen, color: "#10b981" },
};

export function NotesApp() {
	const {
		notes,
		folders,
		tags,
		undo,
		redo,
		archiveNote,
		unarchiveNote,
		deleteNote,
		restoreNote,
		addTag,
	} = useNotesStore();
	const { canUndo, canRedo } = useHistoryStore();
	const { notesDefaultFolder } = useSettingsStore();

	const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"active" | "archived">("active");
	const [viewState, setViewState] = useState<ViewState>("list");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [sidebarView, setSidebarView] = useState<SidebarView>("folders");
	const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());
	const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("date");

	const lastActiveFolderRef = useRef<Folder | null>(null);

	useEffect(() => {
		if (Object.keys(tags).length === 0) {
			Object.entries(DEFAULT_TAGS).forEach(([id, tag]) => addTag({ ...tag, id }));
		}
	}, [tags, addTag]);

	const allTags = { ...tags };

	useEffect(() => {
		if (!activeFolder && folders.length > 0) {
			const defaultFolder = folders.find((f) => f.id === notesDefaultFolder);
			if (defaultFolder) {
				setActiveFolder(defaultFolder);
			} else {
				const inbox = folders.find((f) => f.id === "inbox");
				if (inbox) setActiveFolder(inbox);
			}
		}
	}, [folders, notesDefaultFolder, activeFolder]);

	// ── Keep activeFolder in sync with store when folder data changes ─────────
	useEffect(() => {
		if (!activeFolder) return;
		const fromStore = folders.find((f) => f.id === activeFolder.id);
		if (fromStore && fromStore !== activeFolder) {
			setActiveFolder(fromStore);
		}
	}, [folders, activeFolder]);

	useEffect(() => {
		if (sidebarView !== "folders") return;
		if (viewState !== "list" && activeFolder && lastActiveFolderRef.current) {
			if (activeFolder.id !== lastActiveFolderRef.current.id) {
				if (viewState === "create" && createBackHandlerRef.current) {
					createBackHandlerRef.current();
				}
				setSelectedNoteId(null);
				setViewState("list");
			}
		}
		lastActiveFolderRef.current = activeFolder;
	}, [activeFolder, viewState, sidebarView]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			if (modKey && (e.key === "=" || e.key === "+")) {
				e.preventDefault();
				setSelectedNoteId(null);
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
		archived = false,
		includeDescendants = true,
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

	const getFolderById = (id: string): Folder | undefined => folders.find((f) => f.id === id);

	const inboxFolder = folders.find((f) => f.id === "inbox") || null;

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

	const handleCreateNote = useCallback((inFolder?: Folder) => {
		if (inFolder) {
			lastActiveFolderRef.current = inFolder;
			setActiveFolder(inFolder);
		}
		setSelectedNoteId(null);
		setViewState("create");
	}, []);

	const handleCalendarCreateNote = useCallback(() => {
		if (inboxFolder) {
			lastActiveFolderRef.current = inboxFolder;
			setActiveFolder(inboxFolder);
		}
		setSelectedNoteId(null);
		setViewState("create");
	}, [inboxFolder]);

	const handleFolderSelect = useCallback(
		(folder: Folder | null) => {
			if (viewState === "create" && createBackHandlerRef.current) {
				createBackHandlerRef.current();
			}
			setActiveFolder(folder);
			if (viewState !== "list") {
				setSelectedNoteId(null);
				setViewState("list");
			}
		},
		[viewState],
	);

	const handleCalendarDateSelect = useCallback(
		(date: Date) => {
			if (viewState === "create" && createBackHandlerRef.current) {
				createBackHandlerRef.current();
			}
			setSelectedCalendarDate(date);
			if (viewState !== "list") {
				setSelectedNoteId(null);
				setViewState("list");
			}
		},
		[viewState],
	);

	const selectedNote = notes.find((n) => n.id === selectedNoteId);

	const handleArchiveToggle = useCallback(() => {
		if (!selectedNote) return;
		const noteTitle = selectedNote.title || "Untitled";
		if (selectedNote.archived) {
			unarchiveNote(selectedNote.id);
			toast.success(`Unarchived "${noteTitle}"`, {
				action: {
					label: "Undo",
					onClick: () => {
						archiveNote(selectedNote.id);
						toast.success("Note archived again");
					},
				},
			});
		} else {
			archiveNote(selectedNote.id);
			toast.success(`Archived "${noteTitle}"`, {
				action: {
					label: "Undo",
					onClick: () => {
						unarchiveNote(selectedNote.id);
						toast.success("Note unarchived");
					},
				},
			});
		}
		handleBackToList();
	}, [selectedNote, archiveNote, unarchiveNote, handleBackToList]);

	const handleDeleteNote = useCallback(() => setShowDeleteConfirm(true), []);

	const confirmDelete = useCallback(() => {
		if (selectedNote) {
			const noteTitle = selectedNote.title || "Untitled";
			const noteToRestore = { ...selectedNote };
			deleteNote(selectedNote.id);
			setShowDeleteConfirm(false);
			handleBackToList();
			toast.success(`Deleted "${noteTitle}"`, {
				action: {
					label: "Undo",
					onClick: () => {
						restoreNote(noteToRestore);
						toast.success("Note restored");
					},
				},
			});
		}
	}, [selectedNote, deleteNote, restoreNote, handleBackToList]);

	const createBackHandlerRef = useRef<(() => void) | null>(null);
	const registerCreateBackHandler = useCallback((handler: () => void) => {
		createBackHandlerRef.current = handler;
	}, []);

	const handleCreateBack = useCallback(() => {
		if (createBackHandlerRef.current) createBackHandlerRef.current();
		handleBackToList();
	}, [handleBackToList]);

	const editorFolder = sidebarView === "calendar" ? inboxFolder || activeFolder : activeFolder;
	const isCalendarActive = sidebarView === "calendar";
	const calendarDateProp =
		isCalendarActive && calendarViewMode === "date" ? selectedCalendarDate : undefined;
	const calendarMonthProp =
		isCalendarActive && calendarViewMode === "month" ? selectedCalendarDate : undefined;

	const renderContent = () => {
		switch (viewState) {
			case "create":
				return (
					<div className="h-full flex flex-col">
						<NotesBreadcrumb
							activeFolder={editorFolder}
							folders={folders}
							isCreating
							onBack={handleCreateBack}
							canUndo={canUndo}
							canRedo={canRedo}
							onUndo={undo}
							onRedo={redo}
						/>
						<div className="flex-1 overflow-hidden">
							<NoteEditor
								key="create-new"
								tags={tags}
								activeFolder={editorFolder}
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
											{selectedNote.archived ?
												<>
													<ArchiveRestore size={16} />
													Unarchive
												</>
											:	<>
													<Archive size={16} />
													Archive
												</>
											}
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
								<NoteEditor
									key={`view-${selectedNote.id}`}
									note={selectedNote}
									tags={tags}
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
						calendarDate={calendarDateProp}
						calendarMonth={calendarMonthProp}
					/>
				);
		}
	};

	const renderSidebar = () => {
		if (isSidebarCollapsed) {
			return (
				<div className="h-full w-full flex flex-col items-center justify-start p-2 bg-muted">
					<button
						type="button"
						onClick={() => setIsSidebarCollapsed(false)}
						className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						title="Expand Sidebar"
						aria-label="Expand sidebar"
					>
						<PanelLeftOpen size={20} />
					</button>
				</div>
			);
		}

		return (
			<div className="h-full flex flex-col bg-muted">
				<div key={sidebarView} className="flex-1 overflow-hidden min-h-0 animate-fadeIn">
					{sidebarView === "folders" ?
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
							isCollapsed={false}
							onToggleCollapse={setIsSidebarCollapsed}
							tags={allTags}
						/>
					:	<NotesCalendar
							notes={notes}
							selectedDate={selectedCalendarDate}
							onSelectDate={handleCalendarDateSelect}
							calendarViewMode={calendarViewMode}
							onCalendarViewModeChange={setCalendarViewMode}
							onCreateNote={handleCalendarCreateNote}
							onToggleCollapse={setIsSidebarCollapsed}
						/>
					}
				</div>
				<div className="shrink-0 border-t border-border p-2">
					<AnimatedToggle
						options={SIDEBAR_VIEW_OPTIONS}
						value={sidebarView}
						onChange={setSidebarView}
					/>
				</div>
			</div>
		);
	};

	return (
		<>
			<ConfirmationModal
				isOpen={showDeleteConfirm}
				title="Delete Note"
				message={`Are you sure you want to delete "${selectedNote?.title || "Untitled"}"? This action cannot be undone.`}
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
					sidebar={renderSidebar()}
					content={<div className="h-full">{renderContent()}</div>}
				/>
			</div>
		</>
	);
}
