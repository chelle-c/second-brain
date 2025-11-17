import { useState, useRef, useMemo, useEffect } from "react";
import { useNotesStore } from "@/stores/useNotesStore";
import { Note, Category } from "@/types/notes";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import YooptaEditor, { createYooptaEditor } from "@yoopta/editor";
import Paragraph from "@yoopta/paragraph";
import Blockquote from "@yoopta/blockquote";
import Embed from "@yoopta/embed";
import Image from "@yoopta/image";
import Link, { LinkElementProps } from "@yoopta/link";
import Callout from "@yoopta/callout";
import Video from "@yoopta/video";
import File from "@yoopta/file";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import { NumberedList, BulletedList, TodoList } from "@yoopta/lists";
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from "@yoopta/marks";
import Code from "@yoopta/code";
import LinkTool, { DefaultLinkToolRender } from "@yoopta/link-tool";
import ActionMenu, { DefaultActionMenuRender } from "@yoopta/action-menu-list";
import Toolbar, { DefaultToolbarRender } from "@yoopta/toolbar";

interface NoteViewModalProps {
	note: Note;
	categories: Record<string, Category>;
	onClose: () => void;
}

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
};

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const img = document.createElement("img");
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.width, height: img.height });
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
};

// Helper function to get video dimensions
const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		const url = URL.createObjectURL(file);

		video.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve({ width: video.videoWidth, height: video.videoHeight });
		};

		video.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load video"));
		};

		video.src = url;
	});
};

export const NoteViewModal = ({ note, categories, onClose }: NoteViewModalProps) => {
	const { updateNote, deleteNote } = useNotesStore();
	const editor = useMemo(() => createYooptaEditor(), []);
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

	const plugins = [
		Paragraph,
		HeadingOne,
		HeadingTwo,
		HeadingThree,
		Blockquote,
		Callout,
		NumberedList,
		BulletedList,
		TodoList,
		Code,
		Link.extend({
			elementProps: {
				link: (props: LinkElementProps) => ({
					...props,
					target: "_blank",
				}),
			},
		}),
		Embed,
		Image.extend({
			options: {
				onUpload: async (file: File) => {
					try {
						const base64 = await fileToBase64(file);
						const dimensions = await getImageDimensions(file);

						return {
							src: base64,
							alt: file.name,
							sizes: {
								width: dimensions.width,
								height: dimensions.height,
							},
						};
					} catch (error) {
						console.error("Error uploading image:", error);
						throw error;
					}
				},
			},
		}),
		Video.extend({
			options: {
				onUpload: async (file: File) => {
					try {
						const base64 = await fileToBase64(file);
						const dimensions = await getVideoDimensions(file);

						return {
							src: base64,
							alt: file.name,
							sizes: {
								width: dimensions.width,
								height: dimensions.height,
							},
						};
					} catch (error) {
						console.error("Error uploading video:", error);
						throw error;
					}
				},
			},
		}),
		File.extend({
			options: {
				onUpload: async (file: File) => {
					try {
						const base64 = await fileToBase64(file);

						return {
							src: base64,
							format: file.type,
							name: file.name,
							size: file.size,
						};
					} catch (error) {
						console.error("Error uploading file:", error);
						throw error;
					}
				},
			},
		}),
	];

	const TOOLS = {
		ActionMenu: {
			render: DefaultActionMenuRender,
			tool: ActionMenu,
		},
		Toolbar: {
			render: DefaultToolbarRender,
			tool: Toolbar,
		},
		LinkTool: {
			render: DefaultLinkToolRender,
			tool: LinkTool,
		},
	};

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
					<div className="flex items-center justify-between p-8 shrink-0 max-h-[4vh]">
						<div></div>
						<button
							onClick={onClose}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
							title="Close"
						>
							<X size={20} />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto">
						<div className="min-h-full max-w-3xl mx-auto h-full px-8 py-4">
							<div className="flex flex-col space-y-4 w-full h-full max-h-[62vh] border-b">
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
										className="w-full text-4xl font-bold text-gray-800 outline-none border-b-2 border-blue-400 pb-2"
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
									className="yoopta-editor-container w-full overflow-y-auto h-full"
								>
									<YooptaEditor
										editor={editor}
										plugins={plugins}
										tools={TOOLS}
										marks={MARKS}
										selectionBoxRoot={selectionRef}
										value={editorValue}
										onChange={handleEditorChange}
										width="100%"
										className="w-full h-full"
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
