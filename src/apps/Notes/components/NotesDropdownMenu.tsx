import { useNotesStore } from "@/stores/useNotesStore";
import { NotesFolder } from "@/types/notes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuPortal,
	DropdownMenuSubContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
	FolderInput,
	Folder,
	MoreVertical,
	Inbox,
	Archive,
	ArchiveRestore,
	Trash2,
} from "lucide-react";

interface NotesDropdownMenuProps {
	note: any;
	allFolders: any;
	activeFolder: any;
	tags: any;
}

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({
	note,
	allFolders,
}) => {
	const { deleteNote, updateNote, archiveNote, unarchiveNote } = useNotesStore();

	const moveNote = (noteId: string, newFolder: string) => {
		updateNote(noteId, { folder: newFolder });
	};

	const handleArchiveToggle = () => {
		if (note.archived) {
			unarchiveNote(note.id);
		} else {
			archiveNote(note.id);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className="relative flex items-center gap-1">
				<button
					className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer duration-200"
					title="Actions"
					type="button"
				>
					<MoreVertical size={16} className="text-gray-600" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Move to folder</DropdownMenuLabel>

				{/* Inbox option - always available */}
				{note.folder !== "inbox" && (
					<DropdownMenuItem
						onClick={() => moveNote(note.id, "inbox")}
						className="cursor-pointer"
					>
						<Inbox size={14} className="mr-2" />
						Inbox
					</DropdownMenuItem>
				)}

				{/* Other folders */}
				{Object.entries(allFolders).map(([key, folder]: [string, unknown]) => {
					if (key === "inbox" || key === note.folder) return null;
					const currentFolder = folder as NotesFolder;

					if (!currentFolder.children || currentFolder.children.length === 0) {
						return (
							<DropdownMenuItem
								key={key}
								onClick={() => moveNote(note.id, key)}
								className="cursor-pointer"
							>
								<Folder size={14} className="mr-2" />
								{currentFolder.name}
							</DropdownMenuItem>
						);
					}

					return (
						<DropdownMenuSub key={key}>
							<DropdownMenuSubTrigger
								onClick={() => moveNote(note.id, key)}
								className="cursor-pointer"
							>
								<Folder size={14} className="mr-2" />
								<span>{currentFolder.name}</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										onClick={() => moveNote(note.id, key)}
										className="cursor-pointer"
									>
										<Folder size={14} className="mr-2" />
										{currentFolder.name} (root)
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{currentFolder.children.map((subfolder: NotesFolder) => (
										<DropdownMenuItem
											key={subfolder.id}
											onClick={() => moveNote(note.id, subfolder.id)}
											className="cursor-pointer"
										>
											<FolderInput size={14} className="mr-2" />
											{subfolder.name}
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
