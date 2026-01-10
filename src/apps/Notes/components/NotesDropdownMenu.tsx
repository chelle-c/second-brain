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
	Folder,
	FolderInput,
	Inbox,
	MoreVertical,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AVAILABLE_ICONS } from "@/components/IconPicker";

interface NotesDropdownMenuProps {
	note: Note;
	folders: FolderType[];
	activeFolder: FolderType | null;
	tags: Record<string, Tag>;
}

// Helper to get folder icon component
const getFolderIconComponent = (folder: FolderType) => {
	if (folder.id === "inbox") return Inbox;
	if (folder.icon) {
		const matchingIcon = AVAILABLE_ICONS.find((i) => i.icon === folder.icon);
		if (matchingIcon) return matchingIcon.icon;
	}
	return Folder;
};

// Build a flat list of all folders with depth info for display
interface FolderWithDepth {
	folder: FolderType;
	depth: number;
}

const buildFlatFolderList = (
	folders: FolderType[],
	parentId: string | null = null,
	depth: number = 0
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
		result.push({ folder, depth });
		result.push(...buildFlatFolderList(folders, folder.id, depth + 1));
	}

	return result;
};

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({ note, folders }) => {
	const { deleteNote, updateNote, archiveNote, unarchiveNote, restoreNote } = useNotesStore();

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

	// Build flat list of all folders with depth
	const allFolders = buildFlatFolderList(folders, null, 0);

	// Nested folder indicator component
	const NestedIndicator = ({ depth }: { depth: number }) => {
		if (depth === 0) return null;
		return (
			<span className="flex items-center" style={{ width: `${depth * 16}px` }}>
				{Array.from({ length: depth }).map((_, i) => (
					<svg
						key={i}
						width="16"
						height="20"
						viewBox="0 0 16 20"
						className="text-border shrink-0"
					>
						{i === depth - 1 ? (
							// Last indicator shows the bend
							<path
								d="M8 0 L8 10 Q8 14, 12 14 L16 14"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
						) : (
							// Previous indicators show vertical line
							<line x1="8" y1="0" x2="8" y2="20" stroke="currentColor" strokeWidth="1.5" />
						)}
					</svg>
				))}
			</span>
		);
	};

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
				{/* Move to folder submenu */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="cursor-pointer">
						<FolderInput size={14} className="mr-2" />
						Move to folder
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent className="py-1">
							<div className="max-h-[300px] overflow-y-auto p-2">
								{allFolders.map(({ folder, depth }) => {
									const isCurrentFolder = folder.id === note.folder;
									const IconComponent = getFolderIconComponent(folder);

									return (
										<DropdownMenuItem
											key={folder.id}
											onClick={() =>
												!isCurrentFolder && moveNote(note.id, folder.id)
											}
											className={`cursor-pointer ${
												isCurrentFolder
													? "opacity-50 cursor-not-allowed"
													: ""
											}`}
											disabled={isCurrentFolder}
										>
											<NestedIndicator depth={depth} />
											<IconComponent size={14} className="mr-2 shrink-0" />
											<span className="truncate">{folder.name}</span>
											{isCurrentFolder && (
												<span className="ml-auto text-xs text-muted-foreground">
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

				<DropdownMenuSeparator />

				<DropdownMenuItem onClick={handleArchiveToggle} className="cursor-pointer">
					{note.archived ? (
						<>
							<ArchiveRestore size={14} className="mr-2" />
							Unarchive
						</>
					) : (
						<>
							<Archive size={14} className="mr-2" />
							Archive
						</>
					)}
				</DropdownMenuItem>

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
