import { useNotesStore } from "@/stores/useNotesStore";
import type { Note } from "@/types/notes";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { BubbleMenuBar } from "../editor/components/BubbleMenuBar";
import { TableOfContentsSidebar } from "./TableOfContentsSidebar";
import {
	createNoteExtensions,
	handleEditorPaste,
	noteClipboardTextSerializer,
} from "../editor/editorExtensions";

const SAVE_DEBOUNCE_MS = 500;

interface EditorSetupProps {
	note: Note;
}

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

export const EditorSetup = ({ note }: EditorSetupProps) => {
	const { updateNote } = useNotesStore();
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedContentRef = useRef<string>(note.content || "");
	const initialContent = parseContent(note.content);
	const extensions = useMemo(
		() => createNoteExtensions({ isNew: false }),
		[],
	);

	const editor = useEditor({
		extensions,
		content: initialContent,
		autofocus: true,
		editorProps: {
			attributes: {
				class: "tiptap-editor focus:outline-none min-h-[200px] break-words max-w-full",
			},
			handlePaste: handleEditorPaste,
			clipboardTextSerializer: noteClipboardTextSerializer,
		},
		onUpdate: ({ editor }) => {
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

	useEffect(() => () => flushPendingSave(), [flushPendingSave]);

	if (!editor) return null;

	return (
		<div className="w-full tiptap-editor-wrapper">
			<BubbleMenuBar editor={editor} />
			<div className="flex items-stretch">
				<div className="flex-1 min-w-0 transition-all duration-200">
					<EditorContent editor={editor} />
				</div>
				<TableOfContentsSidebar editor={editor} />
			</div>
		</div>
	);
};

export default EditorSetup;
