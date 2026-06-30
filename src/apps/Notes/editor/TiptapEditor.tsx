import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { BubbleMenuBar } from "./components/BubbleMenuBar";
import {
	createNoteExtensions,
	handleEditorPaste,
	noteClipboardTextSerializer,
} from "./editorExtensions";

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
		extensions: createNoteExtensions({ placeholder }),
		content,
		editable,
		autofocus: autoFocus,
		editorProps: {
			attributes: {
				class: "tiptap-editor prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] break-words",
			},
			handlePaste: handleEditorPaste,
			clipboardTextSerializer: noteClipboardTextSerializer,
		},
		onUpdate: ({ editor }) => onUpdateRef.current?.(editor.getJSON()),
	});

	const initialContentRef = useRef(content);
	useEffect(() => {
		if (editor && content !== initialContentRef.current) {
			const currentContent = JSON.stringify(editor.getJSON());
			const newContent =
				typeof content === "string" ? content : JSON.stringify(content);
			if (currentContent !== newContent) {
				editor.commands.setContent(content);
				initialContentRef.current = content;
			}
		}
	}, [editor, content]);

	useEffect(() => {
		if (editor) editor.setEditable(editable);
	}, [editor, editable]);

	if (!editor) return null;

	return (
		<div className="tiptap-editor-wrapper">
			<BubbleMenuBar editor={editor} />
			<EditorContent editor={editor} />
		</div>
	);
};

export const useTiptapEditor = TiptapEditor;
export default TiptapEditor;
