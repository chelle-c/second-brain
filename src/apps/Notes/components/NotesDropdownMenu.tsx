import { Fragment, useState, useRef } from "react";
import useAppStore from "../../../stores/useAppStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { NotesFolder } from "../../../types";
import { CornerDownRight, ChevronDown, ChevronUp, X, Folder, MoreVertical } from "lucide-react";

interface NotesDropdownMenuProps {
	openDropdown: string | null;
	setOpenDropdown: any;
	note: any;
	allFolders: any;
	activeFolder: any;
	categories: any;
}

export const NotesDropdownMenu: React.FC<NotesDropdownMenuProps> = ({
	openDropdown,
	setOpenDropdown,
	note,
	allFolders,
	activeFolder,
	categories,
}) => {
	const { deleteNote, updateNote, categorizeNote } = useAppStore();

	const [moveOrCategorize, setMoveOrCategorize] = useState("");

	const menuRef = useRef<HTMLDivElement>(null);

	const handleMoveOrCategorize = (type: string) => {
		moveOrCategorize === type ? setMoveOrCategorize("") : setMoveOrCategorize(type);
	};

	const moveNote = (folderId: string, newFolder: string) => {
		updateNote(folderId, { folder: newFolder });
	};

	return (
		<>
			<div ref={menuRef} className="relative flex items-center gap-1">
				<button
					onClick={() => {
						useClickOutside(menuRef, () => setOpenDropdown(null));
						setOpenDropdown(openDropdown === note.id ? null : note.id);
					}}
					className="p-1 hover:bg-gray-100 rounded transition-colors"
					title="Actions"
					type="button"
				>
					<MoreVertical size={16} className="text-gray-600" />
				</button>

				{openDropdown === note.id && (
					<div className="absolute right-8 top-0 z-10 w-56 bg-white border rounded-lg shadow-lg">
						<div className="py-1">
							{/* Move to folder section */}
							<button
								className="w-full flex justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer"
								onClick={() => handleMoveOrCategorize("move")}
							>
								<span>Move to folder</span>
								{moveOrCategorize === "move" ? (
									<ChevronUp size={14} />
								) : (
									<ChevronDown size={14} />
								)}
							</button>
							{moveOrCategorize === "move" &&
								Object.entries(allFolders).map(
									([key, folder]: [string, unknown]) => {
										if (key === "inbox") return null;
										const currentFolder = folder as NotesFolder;
										return (
											<Fragment key={key}>
												<button
													onClick={() => {
														moveNote(note.id, key);
														setOpenDropdown(null);
													}}
													className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
												>
													<Folder size={14} className="text-gray-500" />
													<span>{currentFolder.name}</span>
												</button>
												{"children" in currentFolder &&
													currentFolder.children &&
													currentFolder.children.length > 0 &&
													currentFolder.children.map(
														(subfolder: NotesFolder) =>
															activeFolder &&
															activeFolder.id !== subfolder.id && (
																<button
																	key={subfolder.id}
																	onClick={() => {
																		moveNote(
																			note.id,
																			subfolder.id
																		);
																		setOpenDropdown(null);
																	}}
																	className="w-full pl-8 py-2 text-sm text-right hover:bg-gray-100 flex items-center gap-2"
																>
																	<CornerDownRight
																		size={14}
																		className="text-gray-500"
																	/>
																	<span>
																		{`${currentFolder.name} / ${subfolder.name}`}
																	</span>
																</button>
															)
													)}
											</Fragment>
										);
									}
								)}

							{/* Categorize section - only for non-inbox folders */}
							<div className="border-t my-1"></div>
							<button
								className="w-full flex justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer"
								onClick={() => handleMoveOrCategorize("categorize")}
							>
								<span>Categorize</span>
								{moveOrCategorize === "categorize" ? (
									<ChevronUp size={14} />
								) : (
									<ChevronDown size={14} />
								)}
							</button>
							{moveOrCategorize === "categorize" &&
								Object.entries(categories).map(([key, category]: any) => {
									if (key === "all" || key === note.category) return null;
									const Icon = category.icon;
									return (
										<button
											key={key}
											onClick={() => {
												categorizeNote(note.id, key);
												setOpenDropdown(null);
											}}
											className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
										>
											<Icon size={14} className="text-gray-500" />
											<span>{category.name}</span>
										</button>
									);
								})}

							<div className="border-t my-1"></div>
							<button
								onClick={() => {
									deleteNote(note.id);
									setOpenDropdown(null);
								}}
								className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
							>
								<X size={14} />
								Delete
							</button>
						</div>
					</div>
				)}
			</div>
		</>
	);
};
