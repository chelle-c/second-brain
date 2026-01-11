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
import { useEffect, useRef } from "react";

import { BubbleMenuBar } from "./components/BubbleMenuBar";
import { SlashCommands } from "./components/SlashCommandMenu";
import { Callout } from "./extensions/Callout";
import { LinkPreview } from "./extensions/LinkPreview";
import { DragHandle } from "./extensions/DragHandle";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
	content: JSONContent | string;
	onUpdate?: (content: JSONContent) => void;
	editable?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
}

export const TiptapEditor = ({
	content,
	onUpdate,
	editable = true,
	placeholder = "Type '/' for commands...",
	autoFocus = false,
}: TiptapEditorProps) => {
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;

	const editor = useEditor({
		extensions: [
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
				placeholder,
			}),
			Typography,
			CodeBlockLowlight.configure({
				lowlight,
			}),
			Callout,
			LinkPreview,
			DragHandle,
			SlashCommands,
		],
		content,
		editable,
		autofocus: autoFocus,
		editorProps: {
			attributes: {
				class: "tiptap-editor prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[200px]",
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

				return false;
			},
		},
		onUpdate: ({ editor }) => {
			onUpdateRef.current?.(editor.getJSON());
		},
	});

	// Handle content updates from props
	const initialContentRef = useRef(content);
	useEffect(() => {
		if (editor && content !== initialContentRef.current) {
			const currentContent = JSON.stringify(editor.getJSON());
			const newContent = typeof content === "string" ? content : JSON.stringify(content);

			if (currentContent !== newContent) {
				editor.commands.setContent(content);
				initialContentRef.current = content;
			}
		}
	}, [editor, content]);

	// Update editable state
	useEffect(() => {
		if (editor) {
			editor.setEditable(editable);
		}
	}, [editor, editable]);

	if (!editor) {
		return null;
	}

	return (
		<div className="tiptap-editor-wrapper">
			<BubbleMenuBar editor={editor} />
			<EditorContent editor={editor} />
		</div>
	);
};

// Hook for external access to editor instance
export const useTiptapEditor = TiptapEditor;

export default TiptapEditor;
