import { useNotesStore } from "@/stores/useNotesStore";
import type { Note } from "@/types/notes";
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
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BubbleMenuBar } from "../editor/components/BubbleMenuBar";
import { SlashCommands } from "../editor/components/SlashCommandMenu";
import { Callout } from "../editor/extensions/Callout";
import { LinkPreview } from "../editor/extensions/LinkPreview";
import { DragHandle } from "../editor/extensions/DragHandle";
import { TableOfContentsSidebar } from "./TableOfContentsSidebar";

const lowlight = createLowlight(common);

// Debounce delay for saving content (ms)
const SAVE_DEBOUNCE_MS = 500;

interface EditorSetupProps {
	note: Note;
}

// Parse content and convert if needed
const parseContent = (content: string): JSONContent => {
	if (!content) return { type: "doc", content: [{ type: "paragraph" }] };
	try {
		const parsed = JSON.parse(content);
		if (parsed && parsed.type === "doc") return parsed as JSONContent;
		return { type: "doc", content: [{ type: "paragraph" }] };
	} catch {
		return { type: "doc", content: [{ type: "paragraph" }] };
	}
};

// Create extensions outside component to avoid recreation on every render
const createExtensions = () => [
	StarterKit.configure({
		codeBlock: false, // We use CodeBlockLowlight instead
	}),
	Underline,
	TextStyle,
	Color,
	Highlight.configure({
		multicolor: true, // Enable background colors
	}),
	FontFamily,
	TextAlign.configure({
		types: ["heading", "paragraph"],
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
		placeholder: "Type '/' for commands...",
	}),
	Typography,
	CodeBlockLowlight.configure({
		lowlight,
	}),
	Callout,
	LinkPreview,
	DragHandle,
	SlashCommands,
];

export const EditorSetup = ({ note }: EditorSetupProps) => {
	const { updateNote } = useNotesStore();

	// Refs for debounced saving
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedContentRef = useRef<string>(note.content || "");

	// Parse initial content
	const initialContent = parseContent(note.content);

	// Memoize extensions to prevent recreation on every render
	const extensions = useMemo(() => createExtensions(), []);

	const editor = useEditor({
		extensions,
		content: initialContent,
		autofocus: true,
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
						// (e.g., copying from a code editor or terminal)
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
		onUpdate: ({ editor }) => {
			// Debounced save
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			saveTimeoutRef.current = setTimeout(() => {
				const content = JSON.stringify(editor.getJSON());
				if (content !== lastSavedContentRef.current) {
					updateNote(note.id, { content }, false);
					lastSavedContentRef.current = content;
				}
				saveTimeoutRef.current = null;
			}, SAVE_DEBOUNCE_MS);
		},
	});

	// Flush pending saves on unmount
	const flushPendingSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
			saveTimeoutRef.current = null;
		}
		if (editor) {
			const content = JSON.stringify(editor.getJSON());
			if (content !== lastSavedContentRef.current) {
				updateNote(note.id, { content }, false);
				lastSavedContentRef.current = content;
			}
		}
	}, [editor, note.id, updateNote]);

	useEffect(() => {
		return () => {
			flushPendingSave();
		};
	}, [flushPendingSave]);

	if (!editor) {
		return null;
	}

	return (
		<div className="w-full tiptap-editor-wrapper">
			<BubbleMenuBar editor={editor} />
			<div className="flex items-stretch">
				<div className={`flex-1 min-w-0 transition-all duration-200`}>
					<EditorContent editor={editor} />
				</div>
				<TableOfContentsSidebar editor={editor} />
			</div>
		</div>
	);
};

export default EditorSetup;
