import React, { useState } from "react";
import { useNotesStore } from "@/stores/useNotesStore";
import { NotesDropdownMenu } from "./NotesDropdownMenu";
import { CategoryCard } from "./CategoryCard";
import { NoteViewModal } from "./NoteViewModal";
import { Note, NotesFolder, NotesFolders, Subfolder, Category } from "@/types/notes";
import {
	Inbox,
	Calendar,
	Search,
	FolderPlus,
	Folder,
	Hash,
	Edit2,
	Trash2,
	FilePenLine,
} from "lucide-react";

interface NotesCardProps {
	allFolders: NotesFolders;
	activeFolder: NotesFolder | Subfolder | null;
	setActiveFolder: React.Dispatch<React.SetStateAction<NotesFolder | Subfolder | null>>;
	getCurrentFolder: Function;
	categories: Record<string, Category>;
	activeCategory: string;
	getNoteCount: Function;
	setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
	setCaptureNewNote: React.Dispatch<React.SetStateAction<boolean>>;
}

export const NotesCard: React.FC<NotesCardProps> = ({
	allFolders,
	activeFolder,
	setActiveFolder,
	getCurrentFolder,
	categories,
	activeCategory,
	getNoteCount,
	setActiveCategory,
	setCaptureNewNote,
}) => {
	const { notes, addSubFolder, removeSubfolder, updateSubFolder } = useNotesStore();
	const [searchTerm, setSearchTerm] = useState("");
	const [showNewSubfolder, setShowNewSubfolder] = useState<string | null>(null);
	const [newSubfolderName, setNewSubfolderName] = useState("");
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);
	const [editingFolder, setEditingFolder] = useState("");
	const [editFolderName, setEditFolderName] = useState("");
	const [viewingNote, setViewingNote] = useState<Note | null>(null);

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
		const folder = getCurrentFolder(folderId);
		setEditingFolder(folderId);
		setEditFolderName(folder.name);
	};

	const saveEditedFolder = () => {
		if (editFolderName.trim() && editingFolder) {
			updateSubFolder(editingFolder, { name: editFolderName.trim() });
			setEditingFolder("");
			setEditFolderName("");
		}
	};

	const getCurrentFolderParentName = (id: string) => {
		const currentFolder = getCurrentFolder(id);
		return Object.values(allFolders).find((f: NotesFolder) => f.id === currentFolder?.parent)
			?.name;
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
		<div className="w-full max-h-[98vh] bg-white flex flex-col items-center justify-between gap-4 p-8 rounded-lg shadow-md overflow-x-hidden overflow-y-auto animate-slideUp">
			<div className="w-full space-y-3">
				<div className="w-full flex flex-col md:flex-row items-center justify-between">
					<div className="w-full flex items-center justify-start gap-2">
						{React.createElement(
							activeFolder && activeFolder.name === "Inbox" ? Inbox : Folder,
							{
								size: 20,
							}
						)}
						{activeFolder && editingFolder === activeFolder.id ? (
							<input
								type="text"
								value={editFolderName}
								onChange={(e) => setEditFolderName(e.target.value)}
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
								{activeFolder && getCurrentFolder(activeFolder.id) && (
									<span className="text-sm text-gray-500">
										{getCurrentFolderParentName(activeFolder.id)} /
									</span>
								)}{" "}
								{activeFolder && getCurrentFolder(activeFolder.id).name}
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
					</div>
					<div className="flex items-center gap-2">
						<div className="relative flex items-center gap-2">
							<Search size={18} className="absolute left-2 text-gray-400" />
							<input
								type="text"
								placeholder="Search notes..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-8 pr-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500/55 placeholder:font-medium"
							/>
						</div>
						<button
							type="button"
							onClick={() => setCaptureNewNote(true)}
							className="flex items-center px-2 py-1 text-sm bg-gray-100 text-sky-700 rounded-lg hover:bg-sky-600 transition-colors cursor-pointer hover:text-white"
						>
							<FilePenLine size={20} className="mr-1" />
							<span className="text-sm font-medium whitespace-nowrap">New Note</span>
						</button>
					</div>
				</div>

				{/* Folder Actions */}
				{activeFolder && activeFolder.id !== "inbox" && (
					<div className="flex items-center gap-2 border-t pt-2">
						{/* Add Subfolder - only for main folders */}
						{getCurrentFolderParentName(activeFolder.id) === undefined && (
							<>
								{activeFolder && showNewSubfolder === activeFolder.id ? (
									<div className="flex gap-2">
										<input
											type="text"
											value={newSubfolderName}
											onChange={(e) => setNewSubfolderName(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter")
													addSubfolder(activeFolder.id);
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
											onClick={() => addSubfolder(activeFolder.id)}
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
											setShowNewSubfolder(activeFolder.id);
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
									onClick={() => startEditingFolder(activeFolder.id)}
									className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
								>
									<Edit2 size={14} />
									Rename
								</button>
								<button
									onClick={() => {
										const parent = getCurrentFolderParentName(activeFolder.id);
										if (
											activeFolder &&
											parent &&
											confirm(
												`Delete "${
													getCurrentFolder(activeFolder.id)?.name
												}"? Notes will be moved to ${parent}.`
											)
										) {
											deleteSubfolder(parent, activeFolder.id);
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
				<CategoryCard
					{...{
						categories,
						getNoteCount,
						activeFolder,
						activeCategory,
						setActiveCategory,
					}}
				/>
			</div>

			<div className="w-full">
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
						{filteredNotes.map((note: Note) => (
							<div
								key={note.id}
								className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
								onClick={() => setViewingNote(note)}
							>
								<div className="flex justify-between items-start gap-4">
									<div className="flex-1">
										<p className="text-gray-800 mb-2 font-medium">
											{note.title}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span className="flex items-center gap-1">
												<Calendar size={12} />
												{formatDate(note.createdAt)}
											</span>
											{note.category && note.category !== "uncategorized" && (
												<span className="flex items-center gap-1">
													{React.createElement(
														categories[note.category]?.icon || Hash,
														{ size: 12 }
													)}
													{categories[note.category]?.name ||
														note.category}
												</span>
											)}
										</div>
									</div>
									<div onClick={(e) => e.stopPropagation()}>
										<NotesDropdownMenu
											openDropdown={openDropdown}
											setOpenDropdown={setOpenDropdown}
											note={note}
											allFolders={allFolders}
											activeFolder={activeFolder}
											categories={categories}
										/>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{viewingNote && (
				<NoteViewModal
					note={viewingNote}
					categories={categories}
					onClose={() => setViewingNote(null)}
				/>
			)}
		</div>
	);
};
