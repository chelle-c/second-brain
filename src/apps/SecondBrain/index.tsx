import React, { useState, useEffect, useRef } from "react";
import useAppStore from "../../stores/useAppStore";
import { Category, NotesFolder, NotesFolders, Subfolder } from "../../types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Inbox,
	CheckCircle,
	Lightbulb,
	BookOpen,
	Archive,
	Calendar,
	Search,
	X,
	ChevronRight,
	ChevronDown,
	FolderPlus,
	Folder,
	MoreVertical,
	Hash,
	Edit2,
	Trash2,
} from "lucide-react";

// TODO: Set inbox as initial active folder
// TODO: Save subfolder changes to file storage
// TODO: Fix functions to edit subfolder names
// TODO: Fix notes "Move to" submenu to include subfolders
// TODO: Add ability to add, edit and delete top-level folders

export function SecondBrainApp() {
	const {
		notes,
		notesFolders,
		subfolders,
		addNote,
		deleteNote,
		updateNote,
		categorizeNote,
		addSubFolder,
		removeSubfolder,
	} = useAppStore();
	const [newNote, setNewNote] = useState({ title: "", content: "", category: "" });
	const [activeFolder, setActiveFolder] = useState<NotesFolder | Subfolder | null>(null);
	const [activeCategory, setActiveCategory] = useState("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
	const [showNewSubfolder, setShowNewSubfolder] = useState<string | null>(null);
	const [newSubfolderName, setNewSubfolderName] = useState("");

	const defaultSubFolders: Subfolder[] = subfolders;

	const [openDropdown, setOpenDropdown] = useState<string | null>(null);
	const [editingFolder, setEditingFolder] = useState("");
	const [editFolderName, setEditFolderName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (activeFolder && activeFolder.id === "inbox" && inputRef.current) {
			inputRef.current.focus();
		}
	}, [activeFolder]);

	const mainFolders: NotesFolders = Object.entries(notesFolders).reduce((acc, [key, value]) => {
		acc[key] = {
			id: key,
			name: value.name,
			parent: value.parent,
		};
		return acc;
	}, {} as NotesFolders);

	const categories: Record<string, Category> = {
		all: { name: "All", icon: Hash },
		actions: { name: "Actions", icon: CheckCircle },
		ideas: { name: "Ideas", icon: Lightbulb },
		reference: { name: "Reference", icon: BookOpen },
		archive: { name: "Archive", icon: Archive },
	};

	const handleAddNote = (e: { preventDefault: () => void }) => {
		e.preventDefault();
		if (newNote.title.trim()) {
			addNote({
				...newNote,
				folder: "inbox",
				category: "uncategorized",
			});
			setNewNote({ title: "", content: "", category: "" });
		}
	};

	const getAllFolders = () => {
		const existingFolders: NotesFolders = mainFolders;
		if (defaultSubFolders && Array.isArray(defaultSubFolders)) {
			defaultSubFolders.forEach((subfolder: Subfolder) => {
				const parentHasChildren = existingFolders[subfolder.parent]?.children;
				if (!parentHasChildren) {
					existingFolders[subfolder.parent].children = [];
				}
				existingFolders[subfolder.parent].children?.push(subfolder);
			});
		}
		return existingFolders;
	};

	const allFolders = getAllFolders();

	const toggleFolder = (folderKey: string) => {
		const newExpanded = new Set(expandedFolders);
		if (newExpanded.has(folderKey)) {
			newExpanded.delete(folderKey);
		} else {
			newExpanded.add(folderKey);
		}
		setExpandedFolders(newExpanded);
	};

	const getNoteCount = (folderId: string, categoryId?: string) => {
		if (categoryId) {
			return notes.filter((n) => n.folder === folderId && n.category === categoryId).length;
		}
		return notes.filter((n) => n.folder === folderId).length;
	};

	const moveNote = (folderId: string, newFolder: string) => {
		updateNote(folderId, { folder: newFolder });
	};

	const addSubfolder = (parentKey: string) => {
		if (newSubfolderName.trim()) {
			const newSubfolder: Subfolder = {
				id: `${parentKey}_${Date.now()}`,
				name: newSubfolderName.trim(),
				parent: parentKey,
			};

			addSubFolder(newSubfolder);

			setNewSubfolderName("");
			setShowNewSubfolder(null);
		}
	};

	const deleteSubfolder = (parentKey: string, subfolderId: string) => {
		// Move all notes from this subfolder to parent folder
		removeSubfolder(subfolderId);

		// If we were viewing this folder, switch to parent
		if (activeFolder && activeFolder.id === subfolderId) {
			const parentFolder = allFolders[parentKey];
			setActiveFolder(parentFolder ? parentFolder : null);
		}
	};

	const startEditingFolder = (folderId: string) => {
		// TODO: implement
	};

	const saveEditedFolder = () => {
		// TODO: implement
	};

	const getCurrentFolder = (id: string): NotesFolder | Subfolder => {
		// Drill down into folder children to find subfolder first
		const currentFolder = Object.values(allFolders).find((f) => f.id === id);
		if (currentFolder === undefined) {
			const currentSubfolder = Object.values(allFolders).find(
				(f) => f.children && f.children.find((c) => c.id === id)
			);
			return currentSubfolder?.children?.find((c) => c.id === id) as Subfolder;
		}
		return currentFolder ? currentFolder : { id: "inbox", name: "Inbox" };
	};

	const getCurrentFolderParentName = (id: string) => {
		const currentFolder = getCurrentFolder(id);
		return Object.values(allFolders).find((f) => f.id === currentFolder.parent)?.name;
	};

	const isEditableFolder = () => {
		// Can only edit subfolders, not main folders or inbox
		return (
			activeFolder && getCurrentFolder(activeFolder.id)?.parent && activeFolder.id !== "inbox"
		);
	};

	const formatDate = (date: Date) => {
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) return "Just now";
		if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return date.toLocaleDateString();
	};

	const filteredNotes = notes.filter((note) => {
		if (activeFolder) {
			const matchesFolder = note.folder === activeFolder.id;
			const matchesCategory = activeCategory === "all" || note.category === activeCategory;
			const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
			return matchesFolder && matchesCategory && matchesSearch;
		}
	});

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-800 mb-2">Second Brain</h1>
					<p className="text-gray-600">Capture now, organize later</p>
				</div>

				{/* Quick Capture - Always Visible */}
				<Card className="mb-6 border-2 border-blue-200">
					<CardContent className="p-4">
						<div className="flex gap-2 mb-4">
							<input
								ref={inputRef}
								type="text"
								value={newNote.title}
								onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleAddNote(e);
								}}
								placeholder="Quick capture: What's on your mind? (Press Enter to save)"
								className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								autoFocus
							/>
							<button
								type="button"
								onClick={handleAddNote}
								className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
							>
								Capture
							</button>
						</div>
					</CardContent>
				</Card>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Sidebar */}
					<div className="lg:col-span-1 space-y-4">
						{/* Folder Navigation */}
						<Card>
							<CardContent className="p-4">
								<h3 className="font-semibold mb-3 text-gray-700">Folders</h3>
								<div className="space-y-1">
									{/* Inbox */}
									<button
										onClick={() => {
											const inboxFolder = Object.values(allFolders).find(
												(f) => f.id === "inbox"
											) as NotesFolder;
											setActiveFolder(inboxFolder);
											setActiveCategory("all");
										}}
										className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
											activeFolder && activeFolder.id === "inbox"
												? "bg-gray-100 border-l-2 border-gray-400"
												: "hover:bg-gray-50"
										}`}
									>
										<div className="flex items-center gap-2">
											<Inbox size={18} />
											<span className="text-sm font-medium">Inbox</span>
										</div>
										<span className="text-xs text-gray-500">
											{getNoteCount("inbox")}
										</span>
									</button>

									{/* Main folders */}
									{Object.entries(mainFolders).map(
										([key, folder]: [string, NotesFolder]) => {
											if (key === "inbox") return null;
											const Icon = folder.name === "Inbox" ? Inbox : Folder;
											const hasSubfolders =
												folder.children && folder.children.length > 0;
											const isExpanded = expandedFolders.has(key);

											return (
												<div key={key}>
													<div
														className={`flex items-center rounded-lg transition-colors ${
															activeFolder && activeFolder.id === key
																? "bg-gray-100 border-l-2 border-gray-400"
																: "hover:bg-gray-50"
														}`}
													>
														{hasSubfolders && (
															<button
																onClick={() => toggleFolder(key)}
																className="p-1 hover:bg-gray-200 rounded"
															>
																{isExpanded ? (
																	<ChevronDown size={14} />
																) : (
																	<ChevronRight size={14} />
																)}
															</button>
														)}
														<div
															onClick={() => {
																setActiveFolder(
																	getCurrentFolder(key)
																);
																setActiveCategory("all");
															}}
															className="flex-1 flex items-center justify-between px-2 py-2 cursor-pointer"
														>
															<div className="flex items-center gap-2">
																<Icon size={18} />
																<span className="text-sm font-medium">
																	{folder.name}
																</span>
															</div>
															<div className="flex items-center gap-1">
																<span className="text-xs text-gray-500">
																	{getNoteCount(key)}
																</span>
															</div>
														</div>
													</div>

													{/* Subfolders */}
													{isExpanded &&
														folder.children &&
														folder.children.length > 0 &&
														folder.children.map((subfolder) => (
															<div
																key={subfolder.id}
																className={`ml-8 flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
																	activeFolder === subfolder
																		? "bg-gray-100 border-l-2 border-gray-400"
																		: "hover:bg-gray-50"
																}`}
															>
																<button
																	onClick={() => {
																		setActiveFolder(subfolder);
																		setActiveCategory("all");
																	}}
																	className="flex-1 flex items-center justify-between"
																>
																	<div className="flex items-center gap-2">
																		<Folder size={16} />
																		<span className="text-sm">
																			{subfolder.name}
																		</span>
																	</div>
																	<span className="text-xs text-gray-500">
																		{getNoteCount(subfolder.id)}
																	</span>
																</button>
															</div>
														))}
												</div>
											);
										}
									)}
								</div>
							</CardContent>
						</Card>

						{/* Category Filter - Only show if not in Inbox */}
						{activeFolder && activeFolder.id !== "inbox" && (
							<Card>
								<CardContent className="p-4">
									<h3 className="font-semibold mb-3 text-gray-700">Categories</h3>
									<div className="space-y-1">
										{Object.entries(categories).map(([key, category]) => {
											const Icon = category.icon;
											const count =
												key === "all"
													? getNoteCount(activeFolder.id)
													: getNoteCount(activeFolder.id, key);

											return (
												<button
													key={key}
													onClick={() => setActiveCategory(key)}
													className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
														activeCategory === key
															? "bg-gray-100 border-l-2 border-gray-400"
															: "hover:bg-gray-50"
													}`}
												>
													<div className="flex items-center gap-2">
														<Icon size={16} />
														<span className="text-sm">
															{category.name}
														</span>
													</div>
													<span className="text-xs text-gray-500">
														{count}
													</span>
												</button>
											);
										})}
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Main Content */}
					<div className="lg:col-span-3">
						<Card>
							<CardHeader>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<CardTitle className="flex items-center gap-2">
											{React.createElement(
												activeFolder && activeFolder.name === "Inbox"
													? Inbox
													: Folder,
												{
													size: 20,
												}
											)}
											{activeFolder && editingFolder === activeFolder.id ? (
												<input
													type="text"
													value={editFolderName}
													onChange={(e) =>
														setEditFolderName(e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter") saveEditedFolder();
														if (e.key === "Escape") {
															setEditingFolder("");
															setEditFolderName("");
														}
													}}
													onBlur={saveEditedFolder}
													className="px-2 py-1 text-lg font-semibold border rounded"
													autoFocus
												/>
											) : (
												<span>
													{activeFolder &&
														getCurrentFolder(activeFolder.id) && (
															<span className="text-sm text-gray-500">
																{getCurrentFolderParentName(
																	activeFolder.id
																)}{" "}
																/
															</span>
														)}{" "}
													{activeFolder &&
														getCurrentFolder(activeFolder.id).name}
													{activeFolder &&
														activeFolder.id !== "inbox" &&
														activeCategory !== "all" && (
															<span className="text-sm text-gray-500">
																{" / "}
																{categories[activeCategory].name}
															</span>
														)}
												</span>
											)}
										</CardTitle>
										<div className="flex items-center gap-2">
											<Search size={18} className="text-gray-400" />
											<input
												type="text"
												placeholder="Search notes..."
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
											/>
										</div>
									</div>

									{/* Folder Actions */}
									{activeFolder && activeFolder.id !== "inbox" && (
										<div className="flex items-center gap-2 border-t pt-2">
											{/* Add Subfolder - only for main folders */}
											{getCurrentFolderParentName(activeFolder.id) ===
												undefined && (
												<>
													{activeFolder &&
													showNewSubfolder === activeFolder.id ? (
														<div className="flex gap-2">
															<input
																type="text"
																value={newSubfolderName}
																onChange={(e) =>
																	setNewSubfolderName(
																		e.target.value
																	)
																}
																onKeyDown={(e) => {
																	if (e.key === "Enter")
																		addSubfolder(
																			activeFolder.id
																		);
																	if (e.key === "Escape") {
																		setShowNewSubfolder(null);
																		setNewSubfolderName("");
																	}
																}}
																placeholder="Subfolder name"
																className="px-2 py-1 text-sm border rounded"
																autoFocus
															/>
															<button
																onClick={() =>
																	addSubfolder(activeFolder.id)
																}
																className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
															>
																Add
															</button>
															<button
																onClick={() => {
																	setShowNewSubfolder(null);
																	setNewSubfolderName("");
																}}
																className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
															>
																Cancel
															</button>
														</div>
													) : (
														<button
															onClick={() => {
																setShowNewSubfolder(
																	activeFolder.id
																);
															}}
															className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
														>
															<FolderPlus size={14} />
															Add Subfolder
														</button>
													)}
												</>
											)}

											{/* Edit and Delete - only for subfolders */}
											{isEditableFolder() && (
												<>
													<button
														onClick={() =>
															startEditingFolder(activeFolder.id)
														}
														className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
													>
														<Edit2 size={14} />
														Rename
													</button>
													<button
														onClick={() => {
															const parent =
																getCurrentFolderParentName(
																	activeFolder.id
																);
															if (
																activeFolder &&
																parent &&
																confirm(
																	`Delete "${
																		getCurrentFolder(
																			activeFolder.id
																		)?.name
																	}"? Notes will be moved to ${parent}.`
																)
															) {
																deleteSubfolder(
																	parent,
																	activeFolder.id
																);
															}
														}}
														className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"
													>
														<Trash2 size={14} />
														Delete
													</button>
												</>
											)}
										</div>
									)}
								</div>
							</CardHeader>

							<CardContent>
								{activeFolder && filteredNotes.length === 0 ? (
									<div className="text-center py-12 text-gray-400">
										<p className="text-lg mb-2">
											No notes in {getCurrentFolder(activeFolder.id)?.name}
											{activeFolder &&
												activeFolder.id !== "inbox" &&
												activeCategory !== "all" &&
												` / ${categories[activeCategory].name}`}
										</p>
										<p className="text-sm">
											{activeFolder && activeFolder.id === "inbox"
												? "Start capturing thoughts above!"
												: activeCategory !== "all"
												? `No ${categories[
														activeCategory
												  ].name.toLowerCase()} in this folder`
												: "Move notes here from your inbox"}
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{filteredNotes.map((note) => (
											<div
												key={note.id}
												className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
											>
												<div className="flex justify-between items-start gap-4">
													<div className="flex-1">
														<p className="text-gray-800 mb-2">
															{note.title}
														</p>
														<div className="flex items-center gap-4 text-xs text-gray-500">
															<span className="flex items-center gap-1">
																<Calendar size={12} />
																{formatDate(note.createdAt)}
															</span>
															{note.category &&
																note.category !==
																	"uncategorized" && (
																	<span className="flex items-center gap-1">
																		{React.createElement(
																			categories[
																				note.category
																			]?.icon || Hash,
																			{ size: 12 }
																		)}
																		{categories[note.category]
																			?.name || note.category}
																	</span>
																)}
														</div>
													</div>
													<div className="relative flex items-center gap-1">
														<button
															onClick={() =>
																setOpenDropdown(
																	openDropdown === note.id
																		? null
																		: note.id
																)
															}
															className="p-1 hover:bg-gray-100 rounded transition-colors"
															title="Actions"
														>
															<MoreVertical
																size={16}
																className="text-gray-600"
															/>
														</button>

														{/* Dropdown Menu */}
														{openDropdown === note.id && (
															<div className="absolute right-0 top-8 z-10 w-56 bg-white border rounded-lg shadow-lg">
																<div className="py-1">
																	{/* Move to folder section */}
																	<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
																		Move to folder
																	</div>
																	{Object.entries(allFolders).map(
																		([key, folder]) => {
																			if (
																				(activeFolder &&
																					key ===
																						activeFolder.id) ||
																				key === "inbox"
																			)
																				return null;
																			const Icon = Folder;
																			return (
																				<button
																					key={key}
																					onClick={() => {
																						moveNote(
																							note.id,
																							key
																						);
																						setOpenDropdown(
																							null
																						);
																					}}
																					className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
																				>
																					<Icon
																						size={14}
																						className="text-gray-500"
																					/>
																					{folder.parent && (
																						<span className="text-gray-400 text-xs">
																							{
																								allFolders[
																									folder
																										.parent
																								]
																									.name
																							}{" "}
																							/
																						</span>
																					)}
																					<span>
																						{
																							folder.name
																						}
																					</span>
																				</button>
																			);
																		}
																	)}

																	{/* Categorize section - only for non-inbox folders */}
																	{activeFolder &&
																		activeFolder.id !==
																			"inbox" && (
																			<>
																				<div className="border-t my-1"></div>
																				<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
																					Categorize as
																				</div>
																				{Object.entries(
																					categories
																				).map(
																					([
																						key,
																						category,
																					]) => {
																						if (
																							key ===
																								"all" ||
																							key ===
																								note.category
																						)
																							return null;
																						const Icon =
																							category.icon;
																						return (
																							<button
																								key={
																									key
																								}
																								onClick={() => {
																									categorizeNote(
																										note.id,
																										key
																									);
																									setOpenDropdown(
																										null
																									);
																								}}
																								className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
																							>
																								<Icon
																									size={
																										14
																									}
																									className="text-gray-500"
																								/>
																								<span>
																									{
																										category.name
																									}
																								</span>
																							</button>
																						);
																					}
																				)}
																			</>
																		)}

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
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
