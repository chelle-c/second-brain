import { ArrowLeft, ChevronRight, Folder, Inbox, FileText, FilePlus, Undo2, Redo2 } from "lucide-react";
import { NotesFolder, Subfolder, NotesFolders } from "@/types/notes";
import { ReactNode } from "react";

interface NotesBreadcrumbProps {
	activeFolder: NotesFolder | Subfolder | null;
	allFolders: NotesFolders;
	noteTitle?: string;
	isCreating?: boolean;
	onBack: () => void;
	actions?: ReactNode;
	canUndo?: boolean;
	canRedo?: boolean;
	onUndo?: () => void;
	onRedo?: () => void;
}

export function NotesBreadcrumb({
	activeFolder,
	allFolders,
	noteTitle,
	isCreating,
	onBack,
	actions,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}: NotesBreadcrumbProps) {
	const isSubfolder = activeFolder && "parent" in activeFolder && activeFolder.parent;

	const getParentFolder = (): NotesFolder | null => {
		if (!isSubfolder || !activeFolder) return null;
		const parentId = (activeFolder as Subfolder).parent;
		return allFolders[parentId] || null;
	};

	const parentFolder = getParentFolder();
	const FolderIcon = activeFolder?.name === "Inbox" ? Inbox : Folder;

	return (
		<div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-border bg-muted/50">
			<div className="flex items-center gap-2">
				<button
					onClick={onBack}
					className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
					title="Back to notes list"
				>
					<ArrowLeft size={20} />
				</button>

				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					{/* Parent folder (if subfolder) */}
					{parentFolder && (
						<>
							<Folder size={14} className="text-muted-foreground" />
							<span>{parentFolder.name}</span>
							<ChevronRight size={14} />
						</>
					)}

					{/* Current folder */}
					{activeFolder && (
						<>
							<FolderIcon size={14} className="text-muted-foreground" />
							<span>{activeFolder.name}</span>
							<ChevronRight size={14} />
						</>
					)}

					{/* Note indicator */}
					{isCreating ? (
						<span className="flex items-center gap-1.5 text-foreground font-medium">
							<FilePlus size={14} className="text-sky-500" />
							New Note
						</span>
					) : noteTitle ? (
						<span className="flex items-center gap-1.5 text-foreground font-medium truncate max-w-[300px]">
							<FileText size={14} className="text-primary shrink-0" />
							<span className="truncate">{noteTitle || "Untitled"}</span>
						</span>
					) : null}
				</div>
			</div>

			{/* Right side: Undo/Redo and action buttons */}
			<div className="flex items-center gap-2">
				{/* Undo/Redo buttons */}
				{onUndo && onRedo && (
					<div className="flex items-center gap-1 mr-2">
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
				)}
				{actions}
			</div>
		</div>
	);
}
