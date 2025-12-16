import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNotesStore } from "@/stores/useNotesStore";
import { Tag, NotesFolder, Subfolder } from "@/types/notes";
import { ConfirmationModal } from "@/components/ConfirmationModal";
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
import LinkPreviewPlugin from "./LinkPreview";
import { useLinkPreviewAutoConvert } from "../hooks/useLinkPreviewAutoConvert";
import { Hash } from "lucide-react";

interface NoteCreateProps {
	tags: Record<string, Tag>;
	activeFolder: NotesFolder | Subfolder | null;
	onBack: () => void;
	onNoteCreated: (noteId: string) => void;
	registerBackHandler?: (handler: () => void) => void;
	registerSaveHandler?: (handler: () => void) => void;
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

export const NoteCreate = ({ tags, activeFolder, onBack, onNoteCreated, registerBackHandler, registerSaveHandler }: NoteCreateProps) => {
	const { addNote } = useNotesStore();
	const editor = useMemo(() => createYooptaEditor(), []);
	const selectionRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	const [title, setTitle] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [editorValue, setEditorValue] = useState({});
	const [showDiscardModal, setShowDiscardModal] = useState(false);
	const [pendingBack, setPendingBack] = useState(false);

	// Enable automatic URL to LinkPreview conversion
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

	const hasContent = useCallback(() => {
		if (title.trim()) return true;
		const content = JSON.stringify(editorValue);
		// Check if editor has meaningful content
		return content !== "{}" && content !== '{"":{"id":"","value":[],"type":"Paragraph"}}';
	}, [title, editorValue]);

	const handleBack = useCallback(() => {
		if (hasContent()) {
			setPendingBack(true);
			setShowDiscardModal(true);
		} else {
			onBack();
		}
	}, [hasContent, onBack]);

	// Register handlers for external use (e.g., breadcrumb buttons)
	useEffect(() => {
		if (registerBackHandler) {
			registerBackHandler(handleBack);
		}
	}, [registerBackHandler, handleBack]);

	const handleSave = useCallback(() => {
		const content = JSON.stringify(editor.getEditorValue());
		const folderId = activeFolder?.id || "inbox";

		const noteId = addNote({
			title: title.trim() || "Untitled",
			content,
			tags: selectedTags,
			folder: folderId,
		});

		onNoteCreated(noteId);
	}, [editor, activeFolder, title, selectedTags, addNote, onNoteCreated]);

	useEffect(() => {
		if (registerSaveHandler) {
			registerSaveHandler(handleSave);
		}
	}, [registerSaveHandler, handleSave]);

	const handleDiscard = () => {
		setShowDiscardModal(false);
		if (pendingBack) {
			onBack();
		}
	};

	const handleTagToggle = (tagId: string) => {
		setSelectedTags((prev) =>
			prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
		);
	};

	const handleEditorChange = (value: any) => {
		setEditorValue(value);
	};

	// Handle Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleBack();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [title, editorValue]);

	return (
		<>
			<ConfirmationModal
				isOpen={showDiscardModal}
				title="Discard Note?"
				message="You have unsaved changes. Are you sure you want to discard this note?"
				confirmLabel="Discard"
				cancelLabel="Keep Editing"
				variant="warning"
				onConfirm={handleDiscard}
				onCancel={() => {
					setShowDiscardModal(false);
					setPendingBack(false);
				}}
			/>

			<div className="h-full flex flex-col bg-card border border-border animate-slideIn">
				{/* Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="max-w-4xl mx-auto px-8 py-6">
						{/* Title */}
						<input
							ref={titleRef}
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Untitled"
							className="w-full text-4xl font-bold text-card-foreground outline-none mb-4 placeholder:text-muted-foreground bg-transparent"
						/>

						{/* Tags selector */}
						<div className="flex items-center gap-2 mb-6">
							<Hash size={16} className="text-muted-foreground" />
							<div className="flex flex-wrap gap-2">
								{Object.entries(tags).map(([tagId, tag]) => {
									const isSelected = selectedTags.includes(tagId);
									const Icon = tag.icon;
									return (
										<button
											key={tagId}
											type="button"
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
			</div>
		</>
	);
};
