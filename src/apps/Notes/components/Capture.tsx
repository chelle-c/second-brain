import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useNotesStore } from "@/stores/useNotesStore";
import { X } from "lucide-react";
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

interface CaptureProps {
	setCaptureNewNote: (value: boolean) => void;
	categories: any;
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

export const Capture = ({ setCaptureNewNote, categories }: CaptureProps) => {
	const { addNote } = useNotesStore();
	const editor = useMemo(() => createYooptaEditor(), []);
	const selectionRef = useRef(null);

	const [newNote, setNewNote] = useState({ title: "", content: "", category: "uncategorized" });
	const [editorValue, setEditorValue] = useState({});

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

	const handleAddNote = () => {
		if (newNote.title.trim()) {
			// Serialize editor content to JSON
			const content = JSON.stringify(editor.getEditorValue());

			addNote({
				title: newNote.title,
				content: content,
				category: newNote.category,
				folder: "inbox",
			});
			setCaptureNewNote(false);
		}
	};

	const handleChange = (value: any) => {
		setEditorValue(value);
	};

	const modalHeight = "h-[80vh]";

	return (
		<>
			{/* Modal Overlay */}
			<div
				className="fixed inset-0 bg-black/50 z-40"
				onClick={() => setCaptureNewNote(false)}
			/>

			{/* Modal Content */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div
					className={`bg-white rounded-lg shadow-xl w-full max-w-4xl ${modalHeight} flex flex-col`}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b shrink-0">
						<button
							onClick={() => setCaptureNewNote(false)}
							className="p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<X size={20} />
						</button>
						<h2 className="text-lg font-semibold">
							{newNote.title ? "Edit Note" : "New Note"}
						</h2>
						<div className="w-7" /> {/* Spacer for centering */}
					</div>

					{/* Content Area */}
					<div className="flex-1 overflow-y-auto">
						<div className="max-w-3xl mx-auto px-8 py-8">
							{/* Title */}
							<input
								type="text"
								value={newNote.title}
								onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
								placeholder="Untitled"
								className="w-full text-4xl font-bold text-gray-800 outline-none mb-6 placeholder:text-gray-400"
								autoFocus
							/>

							{/* Yoopta Editor - Only for Full Notes */}
							<div ref={selectionRef} className="yoopta-editor-container w-full">
								<YooptaEditor
									editor={editor}
									plugins={plugins}
									tools={TOOLS}
									marks={MARKS}
									selectionBoxRoot={selectionRef}
									value={editorValue}
									onChange={handleChange}
									placeholder="Start writing..."
									autoFocus={false}
									width="100%"
									className="w-full"
								/>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="flex flex-col sm:flex-row justify-between gap-3 p-4 border-t shrink-0">
						<Select
							value={newNote.category}
							onValueChange={(value) => setNewNote({ ...newNote, category: value })}
						>
							<SelectTrigger className="w-full sm:w-[180px]">
								<SelectValue placeholder="Select a category" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Categories</SelectLabel>
									{Object.entries(categories).map(
										([key, category]: any) =>
											category.name !== "All" && (
												<SelectItem
													key={key}
													value={key}
													className="capitalize"
												>
													{category.name}
												</SelectItem>
											)
									)}
								</SelectGroup>
							</SelectContent>
						</Select>
						<div className="flex gap-2">
							<Button
								type="button"
								onClick={handleAddNote}
								className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors cursor-pointer"
							>
								Save Note
							</Button>
							<Button
								type="button"
								onClick={() => setCaptureNewNote(false)}
								className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
