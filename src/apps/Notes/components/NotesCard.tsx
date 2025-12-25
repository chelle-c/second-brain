import {
	Calendar,
	ChevronRight,
	Folder,
	Inbox,
	Redo2,
	Search,
	Undo2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { useNotesStore } from "@/stores/useNotesStore";
import type {
	Note,
	NotesFolder,
	NotesFolders,
	Subfolder,
	Tag,
} from "@/types/notes";
import { NotesDropdownMenu } from "./NotesDropdownMenu";
import { TagFilter } from "./TagFilter";

interface NotesCardProps {
	allFolders: NotesFolders;
	activeFolder: NotesFolder | Subfolder | null;
	setActiveFolder: React.Dispatch<
		React.SetStateAction<NotesFolder | Subfolder | null>
	>;
	getCurrentFolder: (id: string) => NotesFolder | Subfolder;
	tags: Record<string, Tag>;
	activeTags: string[];
	getNoteCount: (folderId: string, archived?: boolean) => number;
	setActiveTags: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectNote: (noteId: string) => void;
	viewMode: "active" | "archived";
	setViewMode: (mode: "active" | "archived") => void;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
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
	setViewMode,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
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
				activeTags.length === 0 ||
				activeTags.some((tag) => note.tags?.includes(tag));
			if (!matchesTags) return false;

			const matchesSearch = note.title
				.toLowerCase()
				.includes(searchTerm.toLowerCase());

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
		<article
			key={note.id}
			className="relative p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer animate-fadeIn"
		>
			{/* Clickable overlay for the entire card */}
			<button
				type="button"
				onClick={() => onSelectNote(note.id)}
				className="absolute inset-0 w-full h-full rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				aria-label={`Open note: ${note.title || "Untitled"}`}
			/>
			<div className="flex justify-between items-start gap-4">
				<div className="flex-1 min-w-0">
					<h3 className="text-card-foreground mb-2 font-medium truncate">
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
										className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
									>
										{typeof Icon === "function" && <Icon size={10} />}
										{tag.name}
									</span>
								);
							})}
						</div>
					)}

					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1">
							<Calendar size={12} />
							{formatDate(note.createdAt)}
						</span>
					</div>
				</div>
				{/* Dropdown positioned above the card button with relative z-index */}
				<div className="relative z-10">
					<NotesDropdownMenu
						note={note}
						allFolders={allFolders}
						activeFolder={activeFolder}
						tags={tags}
					/>
				</div>
			</div>
		</article>
	);

	return (
		<div className="h-full flex flex-col p-6 animate-fadeIn">
			{/* Header */}
			<div className="space-y-4 mb-6">
				{/* Top bar with toggle and undo/redo */}
				<div className="flex items-center justify-between">
					<AnimatedToggle
						options={[
							{ value: "active", label: "Active" },
							{ value: "archived", label: "Archived" },
						]}
						value={viewMode}
						onChange={(value) => setViewMode(value as "active" | "archived")}
					/>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onUndo}
							disabled={!canUndo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Undo (Ctrl+Z)"
						>
							<Undo2 size={18} />
						</button>
						<button
							type="button"
							onClick={onRedo}
							disabled={!canRedo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Redo (Ctrl+Y)"
						>
							<Redo2 size={18} />
						</button>
					</div>
				</div>

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
								className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
							>
								<Folder size={18} />
								<span className="text-sm">{parentFolderName}</span>
							</button>
							<ChevronRight size={16} className="text-muted-foreground" />
						</>
					)}
					{React.createElement(
						activeFolder && activeFolder.name === "Inbox" ? Inbox : Folder,
						{ size: 24 },
					)}
					<h1 className="text-2xl font-semibold">
						{activeFolder && getCurrentFolder(activeFolder.id).name}
					</h1>
					<span className="text-sm text-muted-foreground">
						({filteredNotes.length})
					</span>
				</div>

				{/* Subfolders quick access - moved below title */}
				{!isSubfolder && currentSubfolders.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{currentSubfolders.map((subfolder) => (
							<button
								key={subfolder.id}
								type="button"
								onClick={() => setActiveFolder(subfolder)}
								className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-accent rounded-lg text-sm transition-colors cursor-pointer"
							>
								<Folder size={14} />
								{subfolder.name}
								<span className="text-xs text-muted-foreground ml-1">
									{
										notes.filter(
											(n) =>
												n.folder === subfolder.id &&
												n.archived === (viewMode === "archived"),
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
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						placeholder="Search notes..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-background"
					/>
				</div>

				{/* Tag filter */}
				<TagFilter
					tags={tags}
					activeTags={activeTags}
					setActiveTags={setActiveTags}
				/>
			</div>

			{/* Notes list */}
			<div className="flex-1 overflow-y-auto">
				{filteredNotes.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground animate-fadeIn">
						<p className="text-lg mb-2">
							No {viewMode} notes in{" "}
							{getCurrentFolder(activeFolder?.id || "")?.name}
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
								<h3 className="text-sm font-medium text-muted-foreground mb-2">
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
									(sf) => sf.id === subfolderId,
								);
								if (!subfolder || subfolderNotes.length === 0) return null;

								return (
									<div key={subfolderId}>
										<button
											type="button"
											onClick={() => setActiveFolder(subfolder)}
											className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 hover:text-foreground cursor-pointer"
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
							},
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
