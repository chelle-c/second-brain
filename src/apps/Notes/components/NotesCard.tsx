import { Calendar, ChevronRight, Folder as FolderIcon, Inbox, Redo2, Undo2 } from "lucide-react";
import React, { useMemo } from "react";
import { getFolderBreadcrumb } from "@/lib/folderHelpers";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder, Note, Tag } from "@/types/notes";
import { NotesDropdownMenu } from "./NotesDropdownMenu";
import { TagFilter } from "./TagFilter";

interface NotesCardProps {
	folders: Folder[];
	activeFolder: Folder | null;
	setActiveFolder: React.Dispatch<React.SetStateAction<Folder | null>>;
	getFolderById: (id: string) => Folder | undefined;
	tags: Record<string, Tag>;
	activeTags: string[];
	getNoteCount: (folderId: string, archived?: boolean, includeDescendants?: boolean) => number;
	setActiveTags: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectNote: (noteId: string) => void;
	viewMode: "active" | "archived";
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

export const NotesCard: React.FC<NotesCardProps> = ({
	folders,
	activeFolder,
	setActiveFolder,
	tags,
	activeTags,
	setActiveTags,
	onSelectNote,
	viewMode,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}) => {
	const { notes } = useNotesStore();

	const formatDate = (date: Date) => {
		const now = new Date();
		const noteDate = new Date(date);
		const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) return "Just now";
		if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return noteDate.toLocaleDateString();
	};

	// Get direct children of active folder
	const childFolders = useMemo(() => {
		if (!activeFolder) return [];
		return folders
			.filter((f) => f.parentId === activeFolder.id && !f.archived)
			.sort((a, b) => (a.order || 0) - (b.order || 0));
	}, [activeFolder, folders]);

	// Get breadcrumb path
	const breadcrumb = useMemo(() => {
		if (!activeFolder) return [];
		return getFolderBreadcrumb(folders, activeFolder.id);
	}, [activeFolder, folders]);

	// Filter notes
	const filteredNotes = useMemo(() => {
		if (!activeFolder) return [];

		// Get all folder IDs in subtree
		const getSubtreeIds = (folderId: string): string[] => {
			const children = folders.filter((f) => f.parentId === folderId);
			return [folderId, ...children.flatMap((child) => getSubtreeIds(child.id))];
		};

		const folderIds = getSubtreeIds(activeFolder.id);

		return notes.filter((note) => {
			const matchesArchived = note.archived === (viewMode === "archived");
			if (!matchesArchived) return false;

			const matchesFolder = folderIds.includes(note.folder);
			if (!matchesFolder) return false;

			const matchesTags =
				activeTags.length === 0 || activeTags.some((tag) => note.tags?.includes(tag));

			return matchesTags;
		});
	}, [notes, activeFolder, viewMode, activeTags, folders]);

	// Group notes by direct children
	const groupedNotes = useMemo(() => {
		if (childFolders.length === 0) {
			return { ungrouped: filteredNotes, grouped: {} };
		}

		const grouped: Record<string, Note[]> = {};
		const ungrouped: Note[] = [];

		filteredNotes.forEach((note) => {
			const childFolder = childFolders.find((f) => f.id === note.folder);
			if (childFolder) {
				if (!grouped[childFolder.id]) {
					grouped[childFolder.id] = [];
				}
				grouped[childFolder.id].push(note);
			} else if (note.folder === activeFolder?.id) {
				ungrouped.push(note);
			}
		});

		return { ungrouped, grouped };
	}, [filteredNotes, childFolders, activeFolder]);

	const renderNoteItem = (note: Note) => (
		<article
			key={note.id}
			className="relative p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer animate-fadeIn"
		>
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
				<div className="relative z-10">
					<NotesDropdownMenu
						note={note}
						folders={folders}
						activeFolder={activeFolder}
						tags={tags}
					/>
				</div>
			</div>
		</article>
	);

	return (
		<div className="h-full flex flex-col p-6 animate-fadeIn">
			<div className="space-y-4 mb-6">
				{/* Folder title with inline undo/redo */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{breadcrumb.length > 1 && (
							<>
								{breadcrumb.slice(0, -1).map((folder) => (
									<React.Fragment key={folder.id}>
										<button
											type="button"
											onClick={() => setActiveFolder(folder)}
											className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
										>
											<FolderIcon size={16} />
											<span className="text-sm">{folder.name}</span>
										</button>
										<ChevronRight size={16} className="text-muted-foreground" />
									</React.Fragment>
								))}
							</>
						)}
						{React.createElement(activeFolder?.id === "inbox" ? Inbox : FolderIcon, {
							size: 24,
						})}
						<h1 className="text-2xl font-semibold">{activeFolder?.name || "Notes"}</h1>
						<span className="text-sm text-muted-foreground">
							({filteredNotes.length})
						</span>
					</div>

					{/* Undo/Redo buttons */}
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

				{/* Child folders quick access */}
				{childFolders.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{childFolders.map((folder) => (
							<button
								key={folder.id}
								type="button"
								onClick={() => setActiveFolder(folder)}
								className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-accent rounded-lg text-sm transition-colors cursor-pointer"
							>
								<FolderIcon size={14} />
								{folder.name}
								<span className="text-xs text-muted-foreground ml-1">
									{
										notes.filter(
											(n) =>
												n.folder === folder.id &&
												n.archived === (viewMode === "archived")
										).length
									}
								</span>
							</button>
						))}
					</div>
				)}

				{/* Tag filter */}
				<TagFilter tags={tags} activeTags={activeTags} setActiveTags={setActiveTags} />
			</div>

			{/* Notes list */}
			<div className="flex-1 overflow-y-auto">
				{filteredNotes.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground animate-fadeIn">
						<p className="text-lg mb-2">
							No {viewMode} notes in {activeFolder?.name || "this folder"}
						</p>
						<p className="text-sm">
							{activeTags.length > 0
								? "Try removing some tag filters"
								: viewMode === "active"
								? "Create a new note to get started"
								: "No archived notes yet"}
						</p>
					</div>
				) : childFolders.length > 0 ? (
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

						{Object.entries(groupedNotes.grouped).map(([folderId, folderNotes]) => {
							const folder = childFolders.find((f) => f.id === folderId);
							if (!folder || folderNotes.length === 0) return null;

							return (
								<div key={folderId}>
									<button
										type="button"
										onClick={() => setActiveFolder(folder)}
										className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 hover:text-foreground cursor-pointer transition-colors"
									>
										<FolderIcon size={14} />
										{folder.name}
										<ChevronRight size={14} />
									</button>
									<div className="space-y-2">
										{folderNotes.map(renderNoteItem)}
									</div>
								</div>
							);
						})}
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