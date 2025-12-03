import { useState, useEffect } from "react";
import { FolderNav } from "./components/FolderNav";
import { NotesCard } from "./components/NotesCard";
import { NoteView } from "./components/NoteView";
import { NoteCreate } from "./components/NoteCreate";
import { NotesLayout } from "./components/NotesLayout";
import { useNotesStore } from "@/stores/useNotesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { Tag, NotesFolder, NotesFolders, Subfolder } from "@/types/notes";
import { CheckCircle, Lightbulb, BookOpen, FileWarning, Plus } from "lucide-react";
import { Portal } from "@/components/Portal";

type ViewState = "list" | "view" | "create";

export function NotesApp() {
	const { notes, notesFolders, tags, undo, redo } = useNotesStore();
	const { canUndo, canRedo } = useHistoryStore();

	const [activeFolder, setActiveFolder] = useState<NotesFolder | Subfolder | null>(null);
	const [activeTags, setActiveTags] = useState<string[]>([]);
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"active" | "archived">("active");
	const [viewState, setViewState] = useState<ViewState>("list");

	const defaultTags: Record<string, Tag> = {
		actions: { id: "actions", name: "Actions", icon: CheckCircle, color: "#3b82f6" },
		ideas: { id: "ideas", name: "Ideas", icon: Lightbulb, color: "#eab308" },
		reference: { id: "reference", name: "Reference", icon: BookOpen, color: "#10b981" },
		uncategorized: {
			id: "uncategorized",
			name: "Uncategorized",
			icon: FileWarning,
			color: "#6b7280",
		},
	};

	const allTags = { ...defaultTags, ...tags };
	const allFolders: NotesFolders = { ...notesFolders };

	useEffect(() => {
		if (!activeFolder && allFolders["inbox"]) {
			setActiveFolder(allFolders["inbox"]);
		}
	}, [notesFolders]);

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
			if ((modKey && e.shiftKey && e.key === "z") || (modKey && e.key === "y")) {
				if (canRedo) {
					e.preventDefault();
					redo();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, undo, redo]);

	const getSubfolderIds = (folderId: string): string[] => {
		const folder = allFolders[folderId];
		if (folder?.children && folder.children.length > 0) {
			return folder.children.map((child) => child.id);
		}
		return [];
	};

	const isSubfolder = (folderId: string): boolean => {
		return Object.values(allFolders).some((folder) =>
			folder.children?.some((child) => child.id === folderId)
		);
	};

	const getNoteCount = (folderId: string, archived: boolean = false): number => {
		if (isSubfolder(folderId)) {
			return notes.filter((n) => n.folder === folderId && n.archived === archived).length;
		} else {
			const subfolderIds = getSubfolderIds(folderId);
			return notes.filter(
				(n) =>
					(n.folder === folderId || subfolderIds.includes(n.folder)) &&
					n.archived === archived
			).length;
		}
	};

	const getCurrentFolder = (id: string): NotesFolder | Subfolder => {
		const currentFolder = Object.values(allFolders).find((f) => f.id === id);
		if (currentFolder === undefined) {
			const currentSubfolder = Object.values(allFolders).find(
				(f) => f.children && f.children.find((c) => c.id === id)
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

	const renderContent = () => {
		switch (viewState) {
			case "create":
				return (
					<NoteCreate
						tags={allTags}
						activeFolder={activeFolder}
						onBack={handleBackToList}
						onNoteCreated={handleNoteCreated}
					/>
				);
			case "view":
				if (selectedNote) {
					return (
						<NoteView note={selectedNote} tags={allTags} onBack={handleBackToList} />
					);
				}
				return null;
			case "list":
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
					/>
				);
		}
	};

	return (
		<div className="w-full h-full animate-fadeIn relative">
			<NotesLayout
				sidebar={
					<FolderNav
						allFolders={allFolders}
						activeFolder={activeFolder}
						setActiveFolder={setActiveFolder}
						getCurrentFolder={getCurrentFolder}
						setActiveTags={setActiveTags}
						getNoteCount={getNoteCount}
						viewMode={viewMode}
						setViewMode={setViewMode}
					/>
				}
				content={<div className="h-full">{renderContent()}</div>}
			/>

			{/* Floating New Note Button */}
			{viewState === "list" && (
				<Portal>
					<button
						type="button"
						onClick={handleCreateNote}
						className="fixed bottom-6 right-6 w-14 h-14 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center cursor-pointer z-50 animate-fadeIn"
						title="New Note (Ctrl/Cmd + =)"
					>
						<Plus size={28} />
					</button>
				</Portal>
			)}
		</div>
	);
}
