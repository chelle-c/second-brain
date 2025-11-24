import { useState } from "react";
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
import { FolderInput, ChevronDown, X, Folder, MoreVertical } from "lucide-react";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";

interface NotesDropdownMenuProps {
	note: any;
	allFolders: any;
	activeFolder: any;
	categories: any;
}

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({
	note,
	allFolders,
	activeFolder,
	categories,
}) => {
	const { deleteNote, updateNote, categorizeNote } = useNotesStore();
	const [moveOrCategorize, setMoveOrCategorize] = useState("");

	const handleMoveOrCategorize = (type: string) => {
		moveOrCategorize === type ? setMoveOrCategorize("") : setMoveOrCategorize(type);
	};

	const moveNote = (folderId: string, newFolder: string) => {
		updateNote(folderId, { folder: newFolder });
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
				<DropdownMenuLabel
					onClick={() => handleMoveOrCategorize("move")}
					className="w-full flex justify-between items-center gap-4 text-sm font-semibold text-gray-900 cursor-pointer"
				>
					<span>Move to folder</span>
					<ChevronDown
						size={14}
						className={`transition ${moveOrCategorize === "move" ? "rotate-180" : ""}`}
					/>
				</DropdownMenuLabel>
				<DropdownMenuGroup>
					{moveOrCategorize === "move" &&
						Object.entries(allFolders).map(([key, folder]: [string, unknown]) => {
							if (key === "inbox") return null;
							const currentFolder = folder as NotesFolder;
							return (
								<DropdownMenuSub key={key}>
									<DropdownMenuSubTrigger
										onClick={() => {
											moveNote(note.id, key);
										}}
										className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
									>
										<Folder size={14} className="text-gray-500" />
										<span>{currentFolder.name}</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="transition ">
											{"children" in currentFolder &&
												currentFolder.children &&
												currentFolder.children.length > 0 &&
												currentFolder.children.map(
													(subfolder: NotesFolder) =>
														activeFolder &&
														activeFolder.id !== subfolder.id && (
															<DropdownMenuItem
																key={subfolder.id}
																onClick={() => {
																	moveNote(note.id, subfolder.id);
																}}
																className="w-full text-sm text-right hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
															>
																<FolderInput
																	size={14}
																	className="text-gray-500"
																/>
																<span>
																	{`${currentFolder.name} / ${subfolder.name}`}
																</span>
															</DropdownMenuItem>
														)
												)}
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>
							);
						})}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel
					className="w-full flex justify-between items-center text-sm font-semibold text-gray-900 cursor-pointer"
					onClick={() => handleMoveOrCategorize("categorize")}
				>
					<span>Categorize</span>
					<ChevronDown
						size={14}
						className={`transition ${
							moveOrCategorize === "categorize" ? "rotate-180" : ""
						}`}
					/>
				</DropdownMenuLabel>
				{moveOrCategorize === "categorize" && (
					<DropdownMenuGroup>
						{Object.entries(categories).map(([key, category]: any) => {
							if (key === "all" || key === note.category) return null;
							const Icon = category.icon;
							return (
								<DropdownMenuItem
									key={key}
									onClick={() => {
										categorizeNote(note.id, key);
									}}
									className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
								>
									<Icon size={14} className="text-gray-500" />
									<span>{category.name}</span>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuGroup>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						deleteNote(note.id);
					}}
					className="bg-red-50 hover:bg-red-100 flex items-center gap-2 cursor-pointer"
				>
					<X size={16} className="mr-2 text-red-700" />
					<span className="text-sm font-normal text-red-700">Delete</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
