import { useState, useRef, useEffect } from "react";
import { EditorSetup } from "./EditorSetup";
import { useNotesStore } from "@/stores/useNotesStore";
import { Note, Tag } from "@/types/notes";
import { Hash } from "lucide-react";

interface NoteViewProps {
	note: Note;
	tags: Record<string, Tag>;
	onBack: () => void;
}

export const NoteView = ({ note, tags }: NoteViewProps) => {
	const { updateNote } = useNotesStore();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editedTitle, setEditedTitle] = useState(note.title);
	const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []);

	const titleRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setEditedTitle(note.title);
		setSelectedTags(note.tags || []);
	}, [note]);

	useEffect(() => {
		if (isEditingTitle && titleRef.current) {
			titleRef.current.focus();
			titleRef.current.select();
		}
	}, [isEditingTitle]);

	const handleTitleBlur = () => {
		setIsEditingTitle(false);
		if (editedTitle !== note.title) {
			updateNote(note.id, { title: editedTitle });
		}
	};

	const handleTagToggle = (tagId: string) => {
		const newTags = selectedTags.includes(tagId)
			? selectedTags.filter((t) => t !== tagId)
			: [...selectedTags, tagId];

		setSelectedTags(newTags);
		updateNote(note.id, { tags: newTags });
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString();
	};

	return (
		<div className="h-full flex flex-col bg-card">
				{/* Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="max-w-4xl mx-auto px-8 py-6">
						{/* Title */}
						{isEditingTitle ? (
							<input
								ref={titleRef}
								type="text"
								value={editedTitle}
								onChange={(e) => setEditedTitle(e.target.value)}
								onBlur={handleTitleBlur}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleTitleBlur();
									}
									if (e.key === "Escape") {
										setEditedTitle(note.title);
										setIsEditingTitle(false);
									}
								}}
								className="w-full text-4xl font-bold text-card-foreground outline-none border-b-2 border-primary pb-2 mb-4 bg-transparent"
							/>
						) : (
							<h1
								onClick={() => setIsEditingTitle(true)}
								className="text-4xl font-bold text-card-foreground cursor-text hover:bg-accent rounded p-2 -m-2 transition-colors mb-4"
							>
								{editedTitle || "Untitled"}
							</h1>
						)}

						{/* Metadata and Tags */}
						<div className="mb-6 space-y-3">
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<span>Created: {formatDate(note.createdAt)}</span>
								{note.updatedAt &&
									new Date(note.updatedAt).getTime() !==
										new Date(note.createdAt).getTime() && (
										<span>Updated: {formatDate(note.updatedAt)}</span>
									)}
							</div>

							{/* Tags selector */}
							<div className="flex items-center gap-2">
								<Hash size={16} className="text-muted-foreground" />
								<div className="flex flex-wrap gap-2">
									{Object.entries(tags).map(([tagId, tag]) => {
										const isSelected = selectedTags.includes(tagId);
										const Icon = tag.icon;
										return (
											<button
												key={tagId}
												onClick={() => handleTagToggle(tagId)}
												className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
													isSelected
														? `bg-primary/10 text-primary border border-primary/30`
														: `bg-muted text-muted-foreground hover:bg-accent border border-border`
												}`}
											>
												{typeof Icon === "function" && <Icon size={12} />}
												{tag.name}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						<div className="border-t border-border pt-6">
							{/* Yoopta Editor */}
							<EditorSetup note={note} />
						</div>
					</div>
				</div>
			</div>
	);
};
