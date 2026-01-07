import { getFolderChildren } from "@/lib/folderHelpers";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder as FolderType, Note, Tag } from "@/types/notes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
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

interface NotesDropdownMenuProps {
	note: Note;
	folders: FolderType[];
	activeFolder: FolderType | null;
	tags: Record<string, Tag>;
}

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({ note, folders }) => {
	const { deleteNote, updateNote, archiveNote, unarchiveNote } = useNotesStore();

	const moveNote = (noteId: string, newFolderId: string) => {
		updateNote(noteId, { folder: newFolderId }); // Use folder instead of folderId
	};

	const handleArchiveToggle = () => {
		if (note.archived) {
			unarchiveNote(note.id);
		} else {
			archiveNote(note.id);
		}
	};

	// Get all root folders (including inbox)
	const rootFolders = folders
		.filter((f) => !f.archived && !f.parentId)
		.sort((a, b) => {
			// Inbox first
			if (a.id === "inbox") return -1;
			if (b.id === "inbox") return 1;
			return (a.order || 0) - (b.order || 0);
		});

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
				<DropdownMenuLabel>Move to folder</DropdownMenuLabel>

				{rootFolders.map((folder) => {
					const isCurrentFolder = folder.id === note.folder;
					const children = getFolderChildren(folders, folder.id).filter(
						(child) => !child.archived
					);
					const hasChildren = children.length > 0;

					// If it's a simple folder with no children
					if (!hasChildren) {
						if (isCurrentFolder) return null; // Skip if already in this folder

						return (
							<DropdownMenuItem
								key={folder.id}
								onClick={() => moveNote(note.id, folder.id)}
								className="cursor-pointer"
							>
								{folder.id === "inbox" ? (
									<Inbox size={14} className="mr-2" />
								) : (
									<Folder size={14} className="mr-2" />
								)}
								{folder.name}
							</DropdownMenuItem>
						);
					}

					// Folder with children - show as submenu
					return (
						<DropdownMenuSub key={folder.id}>
							<DropdownMenuSubTrigger className="cursor-pointer">
								{folder.id === "inbox" ? (
									<Inbox size={14} className="mr-2" />
								) : (
									<Folder size={14} className="mr-2" />
								)}
								<span>{folder.name}</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									{/* Option to move to root of this folder */}
									{!isCurrentFolder && (
										<DropdownMenuItem
											onClick={() => moveNote(note.id, folder.id)}
											className="cursor-pointer"
										>
											<Folder size={14} className="mr-2" />
											{folder.name}
										</DropdownMenuItem>
									)}

									{/* Separator if needed */}
									{!isCurrentFolder && children.length > 0 && (
										<DropdownMenuSeparator />
									)}

									{/* Child folders */}
									{children.map((child) => (
										<DropdownMenuItem
											key={child.id}
											onClick={() => moveNote(note.id, child.id)}
											className="cursor-pointer"
											disabled={child.id === note.folder}
										>
											<FolderInput size={14} className="mr-2" />
											{child.name}
										</DropdownMenuItem>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					);
				})}

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
					onClick={() => deleteNote(note.id)}
					className="cursor-pointer text-red-600 focus:text-red-600"
				>
					<Trash2 size={14} className="mr-2" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
