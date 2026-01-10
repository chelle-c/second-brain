import ActionMenu, { DefaultActionMenuRender } from "@yoopta/action-menu-list";
import Blockquote from "@yoopta/blockquote";
import Callout from "@yoopta/callout";
import Code from "@yoopta/code";
import YooptaEditor, {
	createYooptaEditor,
	type SlateElement,
	type YooptaContentValue,
	type YooptaPlugin,
} from "@yoopta/editor";
import Embed from "@yoopta/embed";
import File from "@yoopta/file";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Image from "@yoopta/image";
import Link, { type LinkElementProps } from "@yoopta/link";
import LinkTool, { DefaultLinkToolRender } from "@yoopta/link-tool";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import { Bold, CodeMark, Highlight, Italic, Strike, Underline } from "@yoopta/marks";
import Paragraph from "@yoopta/paragraph";
import Table from "@yoopta/table";
import Toolbar, { DefaultToolbarRender } from "@yoopta/toolbar";
import Video from "@yoopta/video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder, Tag } from "@/types/notes";
import { useLinkPreviewAutoConvert } from "../hooks/useLinkPreviewAutoConvert";
import LinkPreviewPlugin from "./LinkPreview";
import { TagSelector } from "./TagSelector";

interface NoteCreateProps {
	tags: Record<string, Tag>;
	activeFolder: Folder | null;
	onBack: () => void;
	onNoteCreated: (noteId: string) => void;
	registerBackHandler: (handler: () => void) => void;
}

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

const fileToBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
};

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

export const NoteCreate = ({
	tags,
	activeFolder,
	onNoteCreated,
	registerBackHandler,
}: NoteCreateProps) => {
	const { addNote } = useNotesStore();
	const editor = useMemo(() => createYooptaEditor(), []);
	const selectionRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	// Use refs to track current values for the save function
	const titleValueRef = useRef("");
	const selectedTagsRef = useRef<string[]>([]);
	const editorValueRef = useRef<YooptaContentValue>({});
	const hasContentRef = useRef(false);
	const hasSavedRef = useRef(false);

	const [title, setTitle] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [editorValue, setEditorValue] = useState<YooptaContentValue>({});

	// Sync refs with state
	useEffect(() => {
		titleValueRef.current = title;
	}, [title]);

	useEffect(() => {
		selectedTagsRef.current = selectedTags;
	}, [selectedTags]);

	useEffect(() => {
		editorValueRef.current = editorValue;
	}, [editorValue]);

	useLinkPreviewAutoConvert(editor);

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	const plugins = useMemo(
		() => [
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
			Table as unknown as YooptaPlugin<Record<string, SlateElement>, Record<string, unknown>>,
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
						const base64 = await fileToBase64(file);
						const dimensions = await getImageDimensions(file);
						return {
							src: base64,
							alt: file.name,
							sizes: { width: dimensions.width, height: dimensions.height },
						};
					},
				},
			}),
			Video.extend({
				options: {
					onUpload: async (file: File) => {
						const base64 = await fileToBase64(file);
						const dimensions = await getVideoDimensions(file);
						return {
							src: base64,
							alt: file.name,
							sizes: { width: dimensions.width, height: dimensions.height },
						};
					},
				},
			}),
			File.extend({
				options: {
					onUpload: async (file: File) => {
						const base64 = await fileToBase64(file);
						return {
							src: base64,
							format: file.type,
							name: file.name,
							size: file.size,
						};
					},
				},
			}),
			LinkPreviewPlugin,
		],
		[]
	);

	const TOOLS = useMemo(
		() => ({
			ActionMenu: { render: DefaultActionMenuRender, tool: ActionMenu },
			Toolbar: { render: DefaultToolbarRender, tool: Toolbar },
			LinkTool: { render: DefaultLinkToolRender, tool: LinkTool },
		}),
		[]
	);

	const checkHasContent = useCallback(() => {
		const currentTitle = titleValueRef.current;
		const currentEditorValue = editorValueRef.current;

		if (currentTitle.trim()) return true;

		const content = JSON.stringify(currentEditorValue);
		if (content === "{}" || content === "{}") return false;

		// Check if there's any actual text in the editor
		try {
			const parsed = currentEditorValue as Record<
				string,
				{ value?: Array<{ children?: Array<{ text?: string }> }> }
			>;
			for (const block of Object.values(parsed)) {
				if (block.value) {
					for (const node of block.value) {
						if (node.children) {
							for (const child of node.children) {
								if (child.text?.trim()) {
									return true;
								}
							}
						}
					}
				}
			}
		} catch {
			return false;
		}

		return false;
	}, []);

	const saveNote = useCallback(() => {
		if (hasSavedRef.current) return null;

		const currentTitle = titleValueRef.current;
		const currentTags = selectedTagsRef.current;
		const currentEditorValue = editorValueRef.current;

		const content = JSON.stringify(currentEditorValue);

		try {
			hasSavedRef.current = true;
			const noteId = addNote({
				title: currentTitle.trim() || "Untitled",
				content,
				tags: currentTags,
				folder: activeFolder?.id || "inbox",
			});

			return noteId;
		} catch (error) {
			console.error("Failed to create note:", error);
			hasSavedRef.current = false;
			return null;
		}
	}, [addNote, activeFolder]);

	const handleBack = useCallback(() => {
		// Auto-save if there's content and haven't saved yet
		if (!hasSavedRef.current && checkHasContent()) {
			const noteId = saveNote();
			if (noteId) {
				onNoteCreated(noteId);
			}
		}
		// Parent component will handle navigation
	}, [checkHasContent, saveNote, onNoteCreated]);

	useEffect(() => {
		if (registerBackHandler) {
			registerBackHandler(handleBack);
		}
	}, [registerBackHandler, handleBack]);

	// Auto-save on unmount (when navigating to another module)
	useEffect(() => {
		return () => {
			// Only save if there's content and hasn't been saved yet
			if (!hasSavedRef.current && checkHasContent()) {
				const currentTitle = titleValueRef.current;
				const currentTags = selectedTagsRef.current;
				const currentEditorValue = editorValueRef.current;
				const content = JSON.stringify(currentEditorValue);

				try {
					hasSavedRef.current = true;
					addNote({
						title: currentTitle.trim() || "Untitled",
						content,
						tags: currentTags,
						folder: activeFolder?.id || "inbox",
					});
				} catch (error) {
					console.error("Failed to auto-save note on unmount:", error);
				}
			}
		};
	}, [addNote, activeFolder, checkHasContent]);

	const handleTagToggle = (tagId: string) => {
		setSelectedTags((prev) =>
			prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
		);
	};

	const handleEditorChange = (value: YooptaContentValue) => {
		setEditorValue(value);
		hasContentRef.current = true;
	};

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTitle(e.target.value);
	};

	return (
		<div className="h-full overflow-y-auto bg-card">
			<div className="max-w-4xl mx-auto px-8 py-6">
				{/* Title */}
				<input
					ref={titleRef}
					type="text"
					value={title}
					onChange={handleTitleChange}
					placeholder="Untitled"
					className="w-full text-4xl font-bold text-card-foreground outline-none mb-4 placeholder:text-muted-foreground bg-transparent"
				/>

				{/* Tags selector */}
				<div className="mb-6">
					<TagSelector
						tags={tags}
						selectedTags={selectedTags}
						onTagToggle={handleTagToggle}
					/>
				</div>

				<div className="border-t pt-6">
					{/* Yoopta Editor */}
					<div ref={selectionRef} className="w-full min-h-[300px]">
						<YooptaEditor
							editor={editor}
							plugins={plugins}
							tools={TOOLS}
							marks={MARKS}
							selectionBoxRoot={selectionRef}
							value={editorValue}
							onChange={handleEditorChange}
							placeholder="Start writing..."
							autoFocus={false}
							width="100%"
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
