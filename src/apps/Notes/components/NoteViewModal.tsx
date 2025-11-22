import { useState, useRef, useEffect } from "react";
import { EditorSetup } from "./EditorSetup";
import { useNotesStore } from "@/stores/useNotesStore";
import { Note, Category } from "@/types/notes";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoteViewModalProps {
	note: Note;
	categories: Record<string, Category>;
	onClose: () => void;
}

export const NoteViewModal = ({ note, categories, onClose }: NoteViewModalProps) => {
	const { updateNote, deleteNote } = useNotesStore();
	const selectionRef = useRef(null);

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editedTitle, setEditedTitle] = useState(note.title);
	const [editorValue, setEditorValue] = useState(() => {
		try {
			return note.content ? JSON.parse(note.content) : {};
		} catch {
			return {};
		}
	});
	const titleRef = useRef<HTMLInputElement>(null);

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

	const handleEditorChange = (value: any) => {
		setEditorValue(value);
		// Auto-save content
		const content = JSON.stringify(value);
		if (content !== note.content) {
			updateNote(note.id, { content });
		}
	};

	const handleDelete = () => {
		if (confirm("Are you sure you want to delete this note?")) {
			deleteNote(note.id);
			onClose();
		}
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString();
	};

	return (
		<>
			{/* Modal Overlay */}
			<div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

			{/* Modal Content */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between px-12 pt-8 shrink-0 max-h-[10vh]">
						<div></div>
						<button
							onClick={onClose}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Close"
						>
							<X size={24} />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto">
						<div className="min-h-full max-w-3xl mx-auto h-full px-8 py-4">
							<div className="flex flex-col space-y-1 w-full h-[85%] border-b">
								{/* Title - Click to edit */}
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
										}}
										className="w-full text-4xl font-bold text-gray-800 outline-none border-b-2 border-sky-400 pb-2"
									/>
								) : (
									<h1
										onClick={() => setIsEditingTitle(true)}
										className="text-4xl font-bold text-gray-800 cursor-text hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
									>
										{editedTitle || "Untitled"}
									</h1>
								)}

								{/* Metadata */}
								<div className="flex items-center gap-4 text-sm text-gray-500 pb-4 border-b">
									<span>Created: {formatDate(note.createdAt)}</span>
									{note.updatedAt &&
										note.updatedAt.getTime() !== note.createdAt.getTime() && (
											<span>Updated: {formatDate(note.updatedAt)}</span>
										)}
									{note.category && note.category !== "uncategorized" && (
										<span className="flex items-center gap-1">
											{categories[note.category]?.icon &&
												(() => {
													const Icon = categories[note.category].icon;
													return <Icon size={14} />;
												})()}
											{categories[note.category]?.name || note.category}
										</span>
									)}
								</div>

								{/* Yoopta Editor */}
								<div
									ref={selectionRef}
									className="overflow-y-auto w-full h-full"
								>
									<EditorSetup
										value={editorValue}
										onChange={handleEditorChange}
									/>
								</div>
							</div>
							{/* Actions */}
							<div className="flex items-center justify-end gap-2 pt-4">
								<Button
									onClick={handleDelete}
									className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
								>
									<Trash2 size={14} />
									Delete
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
