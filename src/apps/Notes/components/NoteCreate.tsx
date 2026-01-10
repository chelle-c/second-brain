import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef, useState } from "react";

import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder, Tag } from "@/types/notes";
import { BubbleMenuBar } from "../editor/components/BubbleMenuBar";
import { SlashCommands } from "../editor/components/SlashCommandMenu";
import { Callout } from "../editor/extensions/Callout";
import { LinkPreview } from "../editor/extensions/LinkPreview";
import { TagSelector } from "./TagSelector";

const lowlight = createLowlight(common);

interface NoteCreateProps {
	tags: Record<string, Tag>;
	activeFolder: Folder | null;
	onBack: () => void;
	onNoteCreated: (noteId: string) => void;
	registerBackHandler: (handler: () => void) => void;
}

const EMPTY_DOC: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export const NoteCreate = ({
	tags,
	activeFolder,
	onNoteCreated,
	registerBackHandler,
}: NoteCreateProps) => {
	const { addNote } = useNotesStore();
	const titleRef = useRef<HTMLInputElement>(null);

	// Use refs to track current values for the save function
	const titleValueRef = useRef("");
	const selectedTagsRef = useRef<string[]>([]);
	const hasSavedRef = useRef(false);

	const [title, setTitle] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	// Sync refs with state
	useEffect(() => {
		titleValueRef.current = title;
	}, [title]);

	useEffect(() => {
		selectedTagsRef.current = selectedTags;
	}, [selectedTags]);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false, // We use CodeBlockLowlight instead
			}),
			Underline,
			Highlight.configure({
				multicolor: false,
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					target: "_blank",
					rel: "noopener noreferrer",
				},
			}),
			Image.configure({
				inline: false,
				allowBase64: true,
			}),
			Table.configure({
				resizable: true,
			}),
			TableRow,
			TableHeader,
			TableCell,
			TaskList,
			TaskItem.configure({
				nested: true,
			}),
			Placeholder.configure({
				placeholder: "Start writing or type '/' for commands...",
			}),
			Typography,
			CodeBlockLowlight.configure({
				lowlight,
			}),
			Callout,
			LinkPreview,
			SlashCommands,
		],
		content: EMPTY_DOC,
		autofocus: false,
		editorProps: {
			attributes: {
				class: "tiptap-editor focus:outline-none min-h-[200px]",
			},
			// Handle paste to prevent unwanted code block conversion
			handlePaste(view, event) {
				const clipboardData = event.clipboardData;
				const plainText = clipboardData?.getData("text/plain");
				const html = clipboardData?.getData("text/html");

				// If user is holding Shift, paste as plain text
				// Cast to access native event properties
				const nativeEvent = event as unknown as { shiftKey?: boolean };
				if (nativeEvent.shiftKey && plainText) {
					view.dispatch(view.state.tr.insertText(plainText));
					return true;
				}

				// Check if clipboard HTML contains pre/code tags that would create code blocks
				if (html && plainText) {
					const hasCodeBlock = /<pre[\s>]|<code[\s>]/i.test(html);

					if (hasCodeBlock) {
						// Check if this looks like IDE/editor clipboard with syntax highlighting
						const isIDECopy =
							html.includes("hljs") ||
							html.includes("syntax") ||
							html.includes("token") ||
							html.includes("monaco") ||
							html.includes("CodeMirror") ||
							html.includes("ace_") ||
							html.includes("prism-");

						// Check if HTML is wrapping mostly plain text in code tags
						const strippedHtml = html
							.replace(/<[^>]*>/g, "")
							.replace(/&[a-z]+;/gi, " ")
							.trim();
						const isMostlyPlainText =
							strippedHtml.length > 0 &&
							Math.abs(strippedHtml.length - plainText.trim().length) / plainText.trim().length < 0.1;

						if (isIDECopy || isMostlyPlainText) {
							// Insert as plain text instead to avoid code block
							view.dispatch(view.state.tr.insertText(plainText));
							return true;
						}
					}
				}

				// Let Tiptap handle the paste normally
				return false;
			},
		},
	});

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	const checkHasContent = useCallback(() => {
		const currentTitle = titleValueRef.current;

		if (currentTitle.trim()) return true;

		if (!editor) return false;

		const editorContent = editor.getJSON();

		// Check if there's any actual text in the editor
		const hasText = (content: JSONContent): boolean => {
			if (content.text?.trim()) return true;
			if (content.content) {
				return content.content.some(hasText);
			}
			return false;
		};

		return hasText(editorContent);
	}, [editor]);

	const saveNote = useCallback(() => {
		if (hasSavedRef.current) return null;
		if (!editor) return null;

		const currentTitle = titleValueRef.current;
		const currentTags = selectedTagsRef.current;
		const editorContent = editor.getJSON();

		const content = JSON.stringify(editorContent);

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
	}, [addNote, activeFolder, editor]);

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
			if (!hasSavedRef.current && editor) {
				const currentTitle = titleValueRef.current;
				const currentTags = selectedTagsRef.current;
				const editorContent = editor.getJSON();

				// Check if there's actual content
				const hasText = (content: JSONContent): boolean => {
					if (content.text?.trim()) return true;
					if (content.content) {
						return content.content.some(hasText);
					}
					return false;
				};

				if (currentTitle.trim() || hasText(editorContent)) {
					const content = JSON.stringify(editorContent);

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
			}
		};
	}, [addNote, activeFolder, editor]);

	const handleTagToggle = (tagId: string) => {
		setSelectedTags((prev) =>
			prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
		);
	};

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTitle(e.target.value);
	};

	if (!editor) {
		return null;
	}

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
					{/* Tiptap Editor */}
					<div className="w-full min-h-[300px] tiptap-editor-wrapper">
						<BubbleMenuBar editor={editor} />
						<EditorContent editor={editor} />
					</div>
				</div>
			</div>
		</div>
	);
};
