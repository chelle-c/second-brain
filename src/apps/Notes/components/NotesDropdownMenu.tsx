import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder as FolderType, Note, Tag } from "@/types/notes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Archive,
	ArchiveRestore,
	ChevronRight,
	Copy,
	Folder,
	FolderInput,
	Inbox,
	MoreVertical,
	Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { AVAILABLE_ICONS } from "@/components/IconPicker";

interface NotesDropdownMenuProps {
	note: Note;
	folders: FolderType[];
	activeFolder: FolderType | null;
	tags: Record<string, Tag>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const getFolderIconComponent = (folder: FolderType) => {
	if (folder.id === "inbox") return Inbox;
	if (folder.icon) {
		const match = AVAILABLE_ICONS.find((i) => i.icon === folder.icon);
		if (match) return match.icon;
	}
	return Folder;
};

interface FolderWithDepth {
	folder: FolderType;
	depth: number;
	hasChildren: boolean;
}

const buildFlatFolderList = (
	folders: FolderType[],
	parentId: string | null = null,
	depth: number = 0,
): FolderWithDepth[] => {
	const result: FolderWithDepth[] = [];

	const children = folders
		.filter((f) => f.parentId === parentId && !f.archived)
		.sort((a, b) => {
			if (a.id === "inbox") return -1;
			if (b.id === "inbox") return 1;
			return (a.order || 0) - (b.order || 0);
		});

	for (const folder of children) {
		const hasChildren = folders.some((f) => f.parentId === folder.id && !f.archived);
		result.push({ folder, depth, hasChildren });
		result.push(...buildFlatFolderList(folders, folder.id, depth + 1));
	}

	return result;
};

// ── component ────────────────────────────────────────────────────────────────

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({ note, folders }) => {
	const { addNote, deleteNote, updateNote, archiveNote, unarchiveNote, restoreNote } =
		useNotesStore();

	const allFolders = useMemo(() => buildFlatFolderList(folders, null, 0), [folders]);

	// ── actions ──────────────────────────────────────────────────────────────

	const moveNote = (noteId: string, newFolderId: string) => {
		const targetFolder = folders.find((f) => f.id === newFolderId);
		const previousFolderId = note.folder;

		updateNote(noteId, { folder: newFolderId });

		toast.success(`Moved to "${targetFolder?.name || "folder"}"`, {
			action: {
				label: "Undo",
				onClick: () => {
					updateNote(noteId, { folder: previousFolderId });
					toast.success("Move undone");
				},
			},
		});
	};

	const handleDuplicate = () => {
		const noteTitle = note.title || "Untitled";
		addNote({
			title: `${noteTitle} (Copy)`,
			content: note.content,
			tags: [...(note.tags || [])],
			folder: note.folder,
		});
		toast.success(`Duplicated "${noteTitle}"`);
	};

	const handleArchiveToggle = () => {
		const noteTitle = note.title || "Untitled";

		if (note.archived) {
			unarchiveNote(note.id);
			toast.success(`Unarchived "${noteTitle}"`, {
				action: {
					label: "Undo",
					onClick: () => {
						archiveNote(note.id);
						toast.success("Note archived again");
					},
				},
			});
		} else {
			archiveNote(note.id);
			toast.success(`Archived "${noteTitle}"`, {
				action: {
					label: "Undo",
					onClick: () => {
						unarchiveNote(note.id);
						toast.success("Note unarchived");
					},
				},
			});
		}
	};

	const handleDelete = () => {
		const noteTitle = note.title || "Untitled";
		const noteToRestore = { ...note };

		deleteNote(note.id);
		toast.success(`Deleted "${noteTitle}"`, {
			action: {
				label: "Undo",
				onClick: () => {
					restoreNote(noteToRestore);
					toast.success("Note restored");
				},
			},
		});
	};

	// ── render ───────────────────────────────────────────────────────────────

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className="relative flex items-center gap-1">
				<button
					className="p-1 hover:bg-accent rounded transition-colors cursor-pointer duration-200"
					title="Actions"
					type="button"
				>
					<MoreVertical size={16} className="text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				{/* Move to folder */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="cursor-pointer">
						<FolderInput size={14} className="mr-2" />
						Move to folder
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent className="py-1">
							<div className="max-h-[300px] overflow-y-auto">
								{allFolders.map(({ folder, depth, hasChildren }) => {
									const isCurrentFolder = folder.id === note.folder;
									const Icon = getFolderIconComponent(folder);

									return (
										<DropdownMenuItem
											key={folder.id}
											onClick={() =>
												!isCurrentFolder && moveNote(note.id, folder.id)
											}
											disabled={isCurrentFolder}
											className={`cursor-pointer ${
												isCurrentFolder ?
													"opacity-50 cursor-not-allowed"
												:	""
											}`}
											style={{ paddingLeft: `${depth * 12 + 8}px` }}
										>
											<span
												className={`shrink-0 mr-1 ${
													!hasChildren ? "invisible" : ""
												}`}
											>
												<ChevronRight
													size={12}
													className="text-muted-foreground rotate-90"
												/>
											</span>
											<Icon size={14} className="mr-2 shrink-0" />
											<span className="truncate">{folder.name}</span>
											{isCurrentFolder && (
												<span className="ml-auto text-xs text-muted-foreground pl-2 shrink-0">
													(current)
												</span>
											)}
										</DropdownMenuItem>
									);
								})}
							</div>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>

				{/* Duplicate */}
				<DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
					<Copy size={14} className="mr-2" />
					Duplicate
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* Archive / Unarchive */}
				<DropdownMenuItem onClick={handleArchiveToggle} className="cursor-pointer">
					{note.archived ?
						<>
							<ArchiveRestore size={14} className="mr-2" />
							Unarchive
						</>
					:	<>
							<Archive size={14} className="mr-2" />
							Archive
						</>
					}
				</DropdownMenuItem>

				{/* Delete */}
				<DropdownMenuItem
					onClick={handleDelete}
					className="cursor-pointer text-red-600 focus:text-red-600"
				>
					<Trash2 size={14} className="mr-2" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
