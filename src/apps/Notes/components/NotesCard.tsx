import React, { useState, useMemo } from "react";
import { useNotesStore } from "@/stores/useNotesStore";
import { NotesDropdownMenu } from "./NotesDropdownMenu";
import { TagFilter } from "./TagFilter";
import { Note, NotesFolder, NotesFolders, Subfolder, Tag } from "@/types/notes";
import { Inbox, Calendar, Search, Folder, ChevronRight } from "lucide-react";

interface NotesCardProps {
	allFolders: NotesFolders;
	activeFolder: NotesFolder | Subfolder | null;
	setActiveFolder: React.Dispatch<React.SetStateAction<NotesFolder | Subfolder | null>>;
	getCurrentFolder: (id: string) => NotesFolder | Subfolder;
	tags: Record<string, Tag>;
	activeTags: string[];
	getNoteCount: (folderId: string, archived?: boolean) => number;
	setActiveTags: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectNote: (noteId: string) => void;
	viewMode: "active" | "archived";
}

export const NotesCard: React.FC<NotesCardProps> = ({
	allFolders,
	activeFolder,
	setActiveFolder,
	getCurrentFolder,
	tags,
	activeTags,
	setActiveTags,
	onSelectNote,
	viewMode,
}) => {
	const { notes } = useNotesStore();
	const [searchTerm, setSearchTerm] = useState("");

	const formatDate = (date: Date) => {
		const now = new Date();
		const noteDate = new Date(date);
		const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) return "Just now";
		if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return noteDate.toLocaleDateString();
	};

	const getSubfolderIds = (folderId: string): string[] => {
		const folder = allFolders[folderId];
		if (folder?.children && folder.children.length > 0) {
			return folder.children.map((child) => child.id);
		}
		return [];
	};

	const isSubfolder = useMemo(() => {
		if (!activeFolder) return false;
		return "parent" in activeFolder && activeFolder.parent !== undefined;
	}, [activeFolder]);

	const getParentFolderName = (): string | null => {
		if (!activeFolder || !isSubfolder) return null;
		const subfolder = activeFolder as Subfolder;
		const parent = allFolders[subfolder.parent];
		return parent?.name || null;
	};

	const currentSubfolders = useMemo(() => {
		if (!activeFolder || isSubfolder) return [];
		const folder = allFolders[activeFolder.id];
		return folder?.children || [];
	}, [activeFolder, allFolders, isSubfolder]);

	const filteredNotes = useMemo(() => {
		if (!activeFolder) return [];

		return notes.filter((note) => {
			const matchesArchived = note.archived === (viewMode === "archived");
			if (!matchesArchived) return false;

			let matchesFolder = false;
			if (isSubfolder) {
				matchesFolder = note.folder === activeFolder.id;
			} else {
				const subfolderIds = getSubfolderIds(activeFolder.id);
				matchesFolder =
					note.folder === activeFolder.id || subfolderIds.includes(note.folder);
			}
			if (!matchesFolder) return false;

			const matchesTags =
				activeTags.length === 0 || activeTags.some((tag) => note.tags?.includes(tag));
			if (!matchesTags) return false;

			const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());

			return matchesSearch;
		});
	}, [notes, activeFolder, viewMode, activeTags, searchTerm, isSubfolder]);

	const groupedNotes = useMemo(() => {
		if (isSubfolder || currentSubfolders.length === 0) {
			return { ungrouped: filteredNotes, grouped: {} };
		}

		const grouped: Record<string, Note[]> = {};
		const ungrouped: Note[] = [];

		filteredNotes.forEach((note) => {
			const subfolder = currentSubfolders.find((sf) => sf.id === note.folder);
			if (subfolder) {
				if (!grouped[subfolder.id]) {
					grouped[subfolder.id] = [];
				}
				grouped[subfolder.id].push(note);
			} else {
				ungrouped.push(note);
			}
		});

		return { ungrouped, grouped };
	}, [filteredNotes, currentSubfolders, isSubfolder]);

	const parentFolderName = getParentFolderName();

	const renderNoteItem = (note: Note) => (
		<div
			key={note.id}
			tabIndex={0}
			className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer animate-fadeIn"
			onClick={() => onSelectNote(note.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onSelectNote(note.id);
			}}
		>
			<div className="flex justify-between items-start gap-4">
				<div className="flex-1 min-w-0">
					<h3 className="text-gray-800 mb-2 font-medium truncate">
						{note.title || "Untitled"}
					</h3>

					{note.tags && note.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 mb-2">
							{note.tags.map((tagId) => {
								const tag = tags[tagId];
								if (!tag) return null;
								const Icon = tag.icon;
								return (
									<span
										key={tagId}
										className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
									>
										{typeof Icon === "function" && <Icon size={10} />}
										{tag.name}
									</span>
								);
							})}
						</div>
					)}

					<div className="flex items-center gap-4 text-xs text-gray-500">
						<span className="flex items-center gap-1">
							<Calendar size={12} />
							{formatDate(note.createdAt)}
						</span>
					</div>
				</div>
				<div onClick={(e) => e.stopPropagation()}>
					<NotesDropdownMenu
						note={note}
						allFolders={allFolders}
						activeFolder={activeFolder}
						tags={tags}
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div className="h-full flex flex-col p-6 animate-fadeIn">
			{/* Header */}
			<div className="space-y-4 mb-6">
				{/* Folder title */}
				<div className="flex items-center gap-2">
					{parentFolderName && (
						<>
							<button
								type="button"
								onClick={() => {
									const parentId = (activeFolder as Subfolder).parent;
									setActiveFolder(allFolders[parentId]);
								}}
								className="text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
							>
								<Folder size={18} />
								<span className="text-sm">{parentFolderName}</span>
							</button>
							<ChevronRight size={16} className="text-gray-400" />
						</>
					)}
					{React.createElement(
						activeFolder && activeFolder.name === "Inbox" ? Inbox : Folder,
						{ size: 24 }
					)}
					<h1 className="text-2xl font-semibold">
						{activeFolder && getCurrentFolder(activeFolder.id).name}
					</h1>
					<span className="text-sm text-gray-500">({filteredNotes.length})</span>
				</div>

				{/* Subfolders quick access - moved below title */}
				{!isSubfolder && currentSubfolders.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{currentSubfolders.map((subfolder) => (
							<button
								key={subfolder.id}
								type="button"
								onClick={() => setActiveFolder(subfolder)}
								className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm transition-colors cursor-pointer"
							>
								<Folder size={14} />
								{subfolder.name}
								<span className="text-xs text-gray-500 ml-1">
									{
										notes.filter(
											(n) =>
												n.folder === subfolder.id &&
												n.archived === (viewMode === "archived")
										).length
									}
								</span>
							</button>
						))}
					</div>
				)}

				{/* Search */}
				<div className="relative">
					<Search
						size={18}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="text"
						placeholder="Search notes..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:bg-white"
					/>
				</div>

				{/* Tag filter */}
				<TagFilter tags={tags} activeTags={activeTags} setActiveTags={setActiveTags} />
			</div>

			{/* Notes list */}
			<div className="flex-1 overflow-y-auto">
				{filteredNotes.length === 0 ? (
					<div className="text-center py-12 text-gray-400 animate-fadeIn">
						<p className="text-lg mb-2">
							No {viewMode} notes in {getCurrentFolder(activeFolder?.id || "")?.name}
						</p>
						<p className="text-sm">
							{searchTerm && "Try a different search term"}
							{activeTags.length > 0 &&
								!searchTerm &&
								"Try removing some tag filters"}
							{!searchTerm &&
								activeTags.length === 0 &&
								(viewMode === "active"
									? "Create a new note to get started"
									: "No archived notes yet")}
						</p>
					</div>
				) : !isSubfolder && currentSubfolders.length > 0 ? (
					<div className="space-y-6 animate-fadeIn">
						{groupedNotes.ungrouped.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-500 mb-2">
									In {activeFolder?.name}
								</h3>
								<div className="space-y-2">
									{groupedNotes.ungrouped.map(renderNoteItem)}
								</div>
							</div>
						)}

						{Object.entries(groupedNotes.grouped).map(
							([subfolderId, subfolderNotes]) => {
								const subfolder = currentSubfolders.find(
									(sf) => sf.id === subfolderId
								);
								if (!subfolder || subfolderNotes.length === 0) return null;

								return (
									<div key={subfolderId}>
										<button
											type="button"
											onClick={() => setActiveFolder(subfolder)}
											className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2 hover:text-gray-700 cursor-pointer"
										>
											<Folder size={14} />
											{subfolder.name}
											<ChevronRight size={14} />
										</button>
										<div className="space-y-2">
											{subfolderNotes.map(renderNoteItem)}
										</div>
									</div>
								);
							}
						)}
					</div>
				) : (
					<div className="space-y-2 animate-fadeIn">
						{filteredNotes.map(renderNoteItem)}
					</div>
				)}
			</div>
		</div>
	);
};
