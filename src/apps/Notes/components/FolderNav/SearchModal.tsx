import { Calendar, FileText, Folder, FolderOpen, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import type { Folder as FolderType, Note } from "@/types/notes";

type FilterMode = "all" | "folders" | "notes";

interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	notes: Note[];
	folders: FolderType[];
	onSelectNote: (noteId: string, folderId: string) => void;
}

interface NoteResult {
	type: "note";
	id: string;
	title: string;
	folderId: string;
	folderName: string;
	createdAt: Date;
	archived: boolean;
	contentPreview: string;
}

interface FolderResult {
	type: "folder";
	id: string;
	name: string;
	parentName: string | null;
	noteCount: number;
}

type SearchResult = NoteResult | FolderResult;

export const SearchModal: React.FC<SearchModalProps> = ({
	isOpen,
	onClose,
	notes,
	folders,
	onSelectNote,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [filterMode, setFilterMode] = useState<FilterMode>("all");
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
			setSearchTerm("");
			setSelectedIndex(0);
		}
	}, [isOpen]);

	const getFolderName = (folderId: string): string => {
		const folder = folders.find((f) => f.id === folderId);
		return folder?.name || "Inbox";
	};

	const getParentFolderName = (parentId: string | null): string | null => {
		if (!parentId) return null;
		const parent = folders.find((f) => f.id === parentId);
		return parent?.name || null;
	};

	const getNoteCountForFolder = (folderId: string): number => {
		return notes.filter((n) => n.folder === folderId && !n.archived).length;
	};

	// Extract plain text from each Yoopta block separately
	// Returns an array of block texts for per-block searching
	const extractBlocksFromContent = (content: string): string[] => {
		try {
			const parsed = JSON.parse(content);
			const blocks: string[] = [];

			// Yoopta stores blocks as an object with block IDs as keys
			// Each block has a "value" array containing elements with "children"
			for (const blockId of Object.keys(parsed)) {
				const block = parsed[blockId];
				if (!block?.value) continue;

				let blockText = "";

				// Check for URL in block props (for link/embed blocks)
				if (block.meta?.props?.url) {
					blockText += block.meta.props.url + " ";
				}

				// Extract text from value array
				for (const element of block.value) {
					if (element?.children) {
						for (const child of element.children) {
							if (child?.text !== undefined) {
								blockText += child.text;
							}
							// Handle nested props with URLs (inline links)
							if (child?.props?.url) {
								blockText += child.props.url + " ";
							}
						}
					}
				}

				const trimmed = blockText.trim();
				if (trimmed) {
					blocks.push(trimmed);
				}
			}

			return blocks;
		} catch {
			// Fallback: return entire content as single block
			return [content];
		}
	};

	const { noteResults, folderResults, allResults } = useMemo(() => {
		if (!searchTerm.trim()) {
			return { noteResults: [], folderResults: [], allResults: [] };
		}

		const term = searchTerm.toLowerCase();

		const noteResults: NoteResult[] = notes
			.map((note) => {
				const blocks = extractBlocksFromContent(note.content);
				// Find the first block that matches the search term
				const matchingBlock = blocks.find((block) =>
					block.toLowerCase().includes(term)
				);
				return { note, blocks, matchingBlock };
			})
			.filter(({ note, matchingBlock }) => {
				// Check title match
				if (note.title.toLowerCase().includes(term)) return true;
				// Check if any block matches
				return matchingBlock !== undefined;
			})
			.map(({ note, matchingBlock }) => {
				// Use the matching block as preview, truncated to 120 chars
				const preview = matchingBlock?.trim() || "";
				const contentPreview = preview.length > 120
					? `${preview.slice(0, 120)}...`
					: preview;

				return {
					type: "note" as const,
					id: note.id,
					title: note.title || "Untitled",
					folderId: note.folder,
					folderName: getFolderName(note.folder),
					createdAt: note.createdAt,
					archived: note.archived,
					contentPreview,
				};
			});

		const folderResults: FolderResult[] = folders
			.filter((folder) => folder.name.toLowerCase().includes(term))
			.map((folder) => ({
				type: "folder" as const,
				id: folder.id,
				name: folder.name,
				parentName: getParentFolderName(folder.parentId),
				noteCount: getNoteCountForFolder(folder.id),
			}));

		const allResults: SearchResult[] = [...folderResults, ...noteResults];

		return { noteResults, folderResults, allResults };
	}, [searchTerm, notes, folders]);

	const filteredResults = useMemo(() => {
		switch (filterMode) {
			case "folders":
				return folderResults;
			case "notes":
				return noteResults;
			default:
				return allResults;
		}
	}, [filterMode, noteResults, folderResults, allResults]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [filteredResults]);

	// Scroll selected item into view
	useEffect(() => {
		if (resultsRef.current && filteredResults.length > 0) {
			const selectedElement = resultsRef.current.querySelector(
				`[data-index="${selectedIndex}"]`
			);
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex, filteredResults]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) =>
				prev < filteredResults.length - 1 ? prev + 1 : 0
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) =>
				prev > 0 ? prev - 1 : filteredResults.length - 1
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const result = filteredResults[selectedIndex];
			if (result && result.type === "note") {
				onSelectNote(result.id, result.folderId);
				onClose();
			}
		} else if (e.key === "Tab") {
			e.preventDefault();
			// Cycle through filter modes
			setFilterMode((prev) => {
				if (prev === "all") return "folders";
				if (prev === "folders") return "notes";
				return "all";
			});
		}
	};

	const formatDate = (date: Date) => {
		const now = new Date();
		const noteDate = new Date(date);
		const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) return "Just now";
		if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return noteDate.toLocaleDateString();
	};

	const renderNoteResult = (result: NoteResult, index: number) => (
		<button
			key={`note-${result.id}`}
			type="button"
			data-index={index}
			onClick={() => {
				onSelectNote(result.id, result.folderId);
				onClose();
			}}
			className={`w-full text-left p-3 rounded-lg border transition-all ${
				index === selectedIndex
					? "border-primary bg-primary/10"
					: "border-border hover:bg-accent"
			}`}
			role="option"
			aria-selected={index === selectedIndex}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<FileText size={14} className="shrink-0 text-muted-foreground" />
						<h4 className="font-medium truncate">{result.title}</h4>
					</div>
					{result.contentPreview && (
						<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
							{result.contentPreview}
						</p>
					)}
					<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
						<span className="flex items-center gap-1">
							<Folder size={12} />
							{result.folderName}
						</span>
						<span className="flex items-center gap-1">
							<Calendar size={12} />
							{formatDate(result.createdAt)}
						</span>
						{result.archived && (
							<span className="text-orange-600">Archived</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);

	const renderFolderResult = (result: FolderResult, index: number) => (
		<div
			key={`folder-${result.id}`}
			data-index={index}
			className={`p-3 rounded-lg border ${
				index === selectedIndex
					? "border-primary bg-primary/10"
					: "border-border"
			}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderOpen size={16} className="text-muted-foreground" />
					<span className="font-medium">{result.name}</span>
					{result.parentName && (
						<span className="text-xs text-muted-foreground">
							in {result.parentName}
						</span>
					)}
				</div>
				<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
					{result.noteCount} {result.noteCount === 1 ? "note" : "notes"}
				</span>
			</div>
		</div>
	);

	const renderGroupedResults = () => {
		// Always show section headers with counts
		const showFolders = filterMode === "all" || filterMode === "folders";
		const showNotes = filterMode === "all" || filterMode === "notes";
		let currentIndex = 0;

		return (
			<>
				{showFolders && (
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide py-1">
							<FolderOpen size={12} />
							Folders ({folderResults.length})
						</div>
						{folderResults.length === 0 ? (
							<div className="text-sm text-muted-foreground py-2 pl-5">
								No folders found
							</div>
						) : (
							folderResults.map((result) => {
								const index = currentIndex++;
								return renderFolderResult(result, index);
							})
						)}
					</div>
				)}

				{showFolders && showNotes && <div className="my-3 border-t border-border" />}

				{showNotes && (
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide py-1">
							<FileText size={12} />
							Notes ({noteResults.length})
						</div>
						{noteResults.length === 0 ? (
							<div className="text-sm text-muted-foreground py-2 pl-5">
								No notes found
							</div>
						) : (
							noteResults.map((result) => {
								const index = currentIndex++;
								return renderNoteResult(result, index);
							})
						)}
					</div>
				)}
			</>
		);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Search Notes and Folders"
			description="Find notes by title or content, and folders by name"
			className="sm:max-w-2xl"
		>
			<div className="space-y-4">
				{/* Search Input */}
				<div className="relative">
					<Search
						size={18}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						ref={inputRef}
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search by title, content, or folder name..."
						className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					{searchTerm && (
						<button
							type="button"
							onClick={() => setSearchTerm("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
						>
							<X size={16} />
						</button>
					)}
				</div>

				{/* Filter Toggle Buttons */}
				<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
					<button
						type="button"
						onClick={() => setFilterMode("all")}
						className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							filterMode === "all"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						All
						{searchTerm && allResults.length > 0 && (
							<span className="ml-1.5 text-xs">({allResults.length})</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => setFilterMode("folders")}
						className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							filterMode === "folders"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Folders
						{searchTerm && folderResults.length > 0 && (
							<span className="ml-1.5 text-xs">({folderResults.length})</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => setFilterMode("notes")}
						className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							filterMode === "notes"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Notes
						{searchTerm && noteResults.length > 0 && (
							<span className="ml-1.5 text-xs">({noteResults.length})</span>
						)}
					</button>
				</div>

				{/* Results */}
				{searchTerm && (
					<div
						ref={resultsRef}
						className="max-h-96 overflow-y-auto space-y-1"
						role="listbox"
					>
						{renderGroupedResults()}
					</div>
				)}

				{/* Help Text */}
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>Use ↑↓ to navigate, Enter to select, Tab to switch filter</span>
					{searchTerm && filteredResults.length > 0 && (
						<span>
							{filteredResults.length}{" "}
							{filteredResults.length === 1 ? "result" : "results"}
						</span>
					)}
				</div>
			</div>
		</Modal>
	);
};
