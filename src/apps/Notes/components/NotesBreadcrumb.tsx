import React, { type ReactNode } from "react";
import type { Folder as FolderType } from "@/types/notes";
import { ChevronLeft, Folder, Inbox, Redo2, Undo2 } from "lucide-react";

interface NotesBreadcrumbProps {
	activeFolder: FolderType | null;
	folders: FolderType[];
	noteTitle?: string;
	isCreating?: boolean;
	onBack: () => void;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	actions?: ReactNode;
}

export function NotesBreadcrumb({
	activeFolder,
	noteTitle,
	isCreating,
	onBack,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	actions,
}: NotesBreadcrumbProps) {
	return (
		<div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background">
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<button
					type="button"
					onClick={onBack}
					className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0"
					title="Back to notes list"
				>
					<ChevronLeft size={20} />
				</button>

				<div className="flex items-center gap-2 min-w-0">
					{React.createElement(activeFolder?.id === "inbox" || !activeFolder ? Inbox : Folder, {
						size: 18,
						className: "text-muted-foreground shrink-0",
					})}
					<span className="text-sm text-muted-foreground truncate">
						{activeFolder?.name || "Inbox"}
					</span>
					<span className="text-sm text-muted-foreground">/</span>
					<span className="text-sm font-medium truncate">
						{isCreating ? "New Note" : noteTitle || "Untitled"}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div className="flex items-center gap-1 mr-2">
					<button
						type="button"
						onClick={onUndo}
						disabled={!canUndo}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Undo (Ctrl+Z)"
					>
						<Undo2 size={18} />
					</button>
					<button
						type="button"
						onClick={onRedo}
						disabled={!canRedo}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Redo (Ctrl+Y)"
					>
						<Redo2 size={18} />
					</button>
				</div>

				{actions}
			</div>
		</div>
	);
}
