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
import type { Extensions } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
import { SlashCommands } from "./components/SlashCommandMenu";
import { Callout } from "./extensions/Callout";
import { LinkPreview, isValidUrl } from "./extensions/LinkPreview";
import { DragHandle } from "./extensions/DragHandle";
const lowlight = createLowlight(common);
export interface NoteExtensionOptions {
	isNew?: boolean;
	placeholder?: string;
	/** Include the DragHandle extension (disabled in create mode by default). */
	dragHandle?: boolean;
}
export function createNoteExtensions(options: NoteExtensionOptions = {}): Extensions {
	const { isNew = false, placeholder, dragHandle = !isNew } = options;
	const raw: Extensions = [
		StarterKit.configure({
			codeBlock: false,
			// Disable spell-check on inline code (Issue: spellcheck in code)
			code: { HTMLAttributes: { spellcheck: "false" } },
		}),
		Underline,
		TextStyle,
		Color,
		Highlight.configure({ multicolor: true }),
		FontFamily,
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		Link.configure({
			openOnClick: false,
			HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
		}),
		Image.configure({ inline: false, allowBase64: true }),
		Table.configure({ resizable: true }),
		TableRow,
		TableHeader,
		TableCell,
		TaskList,
		TaskItem.configure({ nested: true }),
		Placeholder.configure({
			placeholder:
				placeholder ??
				(isNew ? "Start writing or type '/' for commands…" : "Type '/' for commands…"),
		}),
		Typography,
		// Disable spell-check on code blocks (Issue: spellcheck in code)
		CodeBlockLowlight.configure({ lowlight, HTMLAttributes: { spellcheck: "false" } }),
		Callout,
		LinkPreview,
		...(dragHandle ? [DragHandle] : []),
		SlashCommands,
	];
	// De-duplicate by extension name (last definition wins)
	const seen = new Set<string>();
	const deduped: Extensions = [];
	for (let i = raw.length - 1; i >= 0; i--) {
		const ext = raw[i] as { name?: string; spec?: { name?: string } };
		const name = ext?.name ?? ext?.spec?.name;
		if (name && seen.has(name)) continue;
		if (name) seen.add(name);
		deduped.unshift(raw[i]);
	}
	return deduped;
}
// ── paste handling ───────────────────────────────────────────────────────────
function isSingleUrl(text: string): boolean {
	const t = text.trim();
	if (!t || /\s/.test(t)) return false;
	return isValidUrl(t) || isValidUrl(`https://${t}`);
}
export function handleEditorPaste(view: EditorView, event: ClipboardEvent): boolean {
	const clipboardData = event.clipboardData;
	const plainText = clipboardData?.getData("text/plain") ?? "";
	const html = clipboardData?.getData("text/html") ?? "";
	const nativeEvent = event as unknown as { shiftKey?: boolean };
	// Shift+paste → plain text
	if (nativeEvent.shiftKey && plainText) {
		view.dispatch(view.state.tr.insertText(plainText));
		return true;
	}
	// Auto-embed a pasted bare URL as a Link Preview (only on an empty selection)
	if (plainText && isSingleUrl(plainText) && view.state.selection.empty) {
		const strippedHtml = html.replace(/<[^>]*>/g, "").trim();
		const htmlIsJustUrl = !html || strippedHtml === plainText.trim();
		if (htmlIsJustUrl) {
			const linkPreviewType = view.state.schema.nodes.linkPreview;
			if (linkPreviewType) {
				const url =
					isValidUrl(plainText.trim()) ? plainText.trim() : `https://${plainText.trim()}`;
				view.dispatch(view.state.tr.replaceSelectionWith(linkPreviewType.create({ url })));
				return true;
			}
		}
	}
	// Only flatten genuine IDE/code-editor copies to plain text
	if (html && plainText) {
		const isIDECopy =
			html.includes("hljs") ||
			html.includes("monaco") ||
			html.includes("CodeMirror") ||
			html.includes("ace_") ||
			html.includes("prism-") ||
			/class="[^"]*\btoken\b[^"]*"/i.test(html);
		const isWrappedInSingleCodeBlock = /^\s*<(pre|code)[\s>][\s\S]*<\/(pre|code)>\s*$/i.test(
			html.trim(),
		);
		if (isIDECopy && isWrappedInSingleCodeBlock) {
			view.dispatch(view.state.tr.insertText(plainText));
			return true;
		}
	}
	return false;
}
// Produce clean plain text when copying OUT of the editor — single newlines
// between blocks, no trailing blank lines (Issue: errant newlines on paste).
export function noteClipboardTextSerializer(slice: Slice): string {
	const text = slice.content.textBetween(0, slice.content.size, "\n");
	return text
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/^\n+|\n+$/g, "");
}