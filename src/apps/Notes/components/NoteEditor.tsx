/**
 * NoteEditor.tsx
 *
 * Unified view for both *creating* a new note and *editing* an existing one.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Calendar, Clock, Pencil, Trash2 } from "lucide-react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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

import { useNotesStore } from "@/stores/useNotesStore";
import type { Folder, Note, NoteReminder, Tag } from "@/types/notes";
import { BubbleMenuBar } from "../editor/components/BubbleMenuBar";
import { SlashCommands } from "../editor/components/SlashCommandMenu";
import { Callout } from "../editor/extensions/Callout";
import { LinkPreview } from "../editor/extensions/LinkPreview";
import { DragHandle } from "../editor/extensions/DragHandle";
import { TagSelector } from "./TagSelector";
import { TableOfContentsSidebar } from "./TableOfContentsSidebar";
import { ReminderModal } from "./ReminderModal";

const lowlight = createLowlight(common);
const SAVE_DEBOUNCE_MS = 500;
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// ── content parsing ─────────────────────────────────────────────────────────
const parseContent = (content: string): JSONContent => {
	if (!content) return EMPTY_DOC;
	try {
		const parsed = JSON.parse(content);
		if (parsed && parsed.type === "doc") return parsed as JSONContent;
		return EMPTY_DOC;
	} catch {
		return EMPTY_DOC;
	}
};

// ── shared extension factory ─────────────────────────────────────────────────
//
// Several of our custom extensions (LinkPreview in particular) internally
// register their own copy of the Link extension so they can hook into link
// nodes.  TipTap deduplicates by extension *name*, so if more than one
// extension with name "link" ends up in the final array we get the console
// warning and unpredictable behaviour.
//
// Strategy:
//   1. Build the raw list exactly as before.
//   2. Walk backwards through the array and keep only the *first* occurrence
//      of each extension name we care about (link).  Walking backwards means
//      we keep the one that was added last — i.e. our explicitly-configured
//      Link with the HTMLAttributes we want — and drop any earlier duplicate
//      that was pulled in by LinkPreview / SlashCommands / etc.
//
const createExtensions = (isNew: boolean) => {
	const raw = [
		StarterKit.configure({
			codeBlock: false,
		}),
		TextStyle,
		Color,
		Highlight.configure({ multicolor: !isNew }),
		FontFamily,
		TextAlign.configure({ types: ["heading", "paragraph"] }),
		// Our canonical Link config – must appear AFTER LinkPreview so the
		// dedup pass keeps this one.
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
				isNew ? "Start writing or type '/' for commands…" : "Type '/' for commands…",
		}),
		Typography,
		CodeBlockLowlight.configure({ lowlight }),
		Callout,
		LinkPreview,
		...(isNew ? [] : [DragHandle]),
		SlashCommands,
	];

	// Deduplicate: for every extension name, keep only the LAST occurrence.
	// This lets our explicitly-configured Link (added after LinkPreview) win.
	const seen = new Set<string>();
	const deduped: typeof raw = [];

	for (let i = raw.length - 1; i >= 0; i--) {
		const ext = raw[i];
		// Extensions created by .configure() or direct import expose their
		// name via .name on the object itself.  Some are plain classes.
		const name =
			(ext as { name?: string }).name ??
			(ext as { spec?: { name?: string } }).spec?.name ??
			undefined;

		if (name && seen.has(name)) {
			// Skip – we already kept a later copy of this extension.
			continue;
		}

		if (name) seen.add(name);
		deduped.unshift(ext); // maintain original order
	}

	return deduped;
};

// ── paste guard ─────────────────────────────────────────────────────────────
function handlePasteGuard(view: any, event: any): boolean {
	const clipboardData = event.clipboardData;
	const plainText = clipboardData?.getData("text/plain");
	const html = clipboardData?.getData("text/html");

	const nativeEvent = event as unknown as { shiftKey?: boolean };
	if (nativeEvent.shiftKey && plainText) {
		view.dispatch(view.state.tr.insertText(plainText));
		return true;
	}

	if (html && plainText) {
		const hasCodeBlock = /<pre[\s>]|<code[\s>]/i.test(html);
		if (hasCodeBlock) {
			const isIDECopy =
				html.includes("hljs") ||
				html.includes("syntax") ||
				html.includes("token") ||
				html.includes("monaco") ||
				html.includes("CodeMirror") ||
				html.includes("ace_") ||
				html.includes("prism-");
			const strippedHtml = html
				.replace(/<[^>]*>/g, "")
				.replace(/&[a-z]+;/gi, " ")
				.trim();
			const isMostlyPlainText =
				strippedHtml.length > 0 &&
				Math.abs(strippedHtml.length - plainText.trim().length) / plainText.trim().length <
					0.1;
			if (isIDECopy || isMostlyPlainText) {
				view.dispatch(view.state.tr.insertText(plainText));
				return true;
			}
		}
	}
	return false;
}

// ── reminder display helpers ─────────────────────────────────────────────────
function formatReminderDateTime(reminder: NoteReminder): { date: string; time: string } {
	const dt = new Date(reminder.dateTime);
	return {
		date: dt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
		time: dt.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		}),
	};
}

function formatNotifSummary(reminder: NoteReminder): string {
	return reminder.notifications
		.map((n) => {
			const plural = n.value === 1 ? "" : "s";
			if (n.unit === "minutes") return `${n.value} min`;
			if (n.unit === "hours") return `${n.value} hr${plural}`;
			return `${n.value} day${plural}`;
		})
		.join(", ");
}

// ── props ────────────────────────────────────────────────────────────────────
interface NoteEditorProps {
	note?: Note;
	tags: Record<string, Tag>;
	activeFolder?: Folder | null;
	onBack: () => void;
	onNoteCreated?: (noteId: string) => void;
	registerBackHandler?: (handler: () => void) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
	note,
	tags,
	activeFolder,
	onNoteCreated,
	registerBackHandler,
}) => {
	const isCreateMode = !note;
	const { addNote, updateNote } = useNotesStore();

	// ── local state ──────────────────────────────────────────────────────────
	const [title, setTitle] = useState(note?.title ?? "");
	const [isEditingTitle, setIsEditingTitle] = useState(isCreateMode);
	const [selectedTags, setSelectedTags] = useState<string[]>(note?.tags ?? []);
	const [reminder, setReminder] = useState<NoteReminder | null>(note?.reminder ?? null);
	const [showReminderModal, setShowReminderModal] = useState(false);

	const titleRef = useRef<HTMLInputElement>(null);

	// ── create-mode refs ─────────────────────────────────────────────────────
	const titleValueRef = useRef(title);
	const selectedTagsRef = useRef(selectedTags);
	const reminderRef = useRef(reminder);
	const hasSavedRef = useRef(false);

	useEffect(() => {
		titleValueRef.current = title;
	}, [title]);
	useEffect(() => {
		selectedTagsRef.current = selectedTags;
	}, [selectedTags]);
	useEffect(() => {
		reminderRef.current = reminder;
	}, [reminder]);

	// ── sync from note prop (edit mode) ──────────────────────────────────────
	const noteIdRef = useRef(note?.id);
	useEffect(() => {
		if (!note) return;
		if (noteIdRef.current !== note.id) {
			noteIdRef.current = note.id;
			setTitle(note.title);
			setSelectedTags(note.tags ?? []);
			setReminder(note.reminder ?? null);
		}
	}, [note]);

	// ── focus title on mount ─────────────────────────────────────────────────
	useEffect(() => {
		if (isCreateMode) titleRef.current?.focus();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ── extensions ───────────────────────────────────────────────────────────
	const extensions = useMemo(() => createExtensions(isCreateMode), [isCreateMode]);

	// ── editor ───────────────────────────────────────────────────────────────
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedContentRef = useRef<string>(note?.content ?? "");

	const editor = useEditor({
		extensions,
		content: isCreateMode ? EMPTY_DOC : parseContent(note!.content),
		autofocus: !isCreateMode,
		editorProps: {
			attributes: { class: "tiptap-editor focus:outline-none min-h-[200px]" },
			handlePaste: handlePasteGuard,
		},
		onUpdate: ({ editor: ed }) => {
			if (isCreateMode) return;
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
			saveTimeoutRef.current = setTimeout(() => {
				const content = JSON.stringify(ed.getJSON());
				if (content !== lastSavedContentRef.current) {
					lastSavedContentRef.current = content;
					updateNote(note!.id, { content }, false);
				}
				saveTimeoutRef.current = null;
			}, SAVE_DEBOUNCE_MS);
		},
	});

	// ── flush pending save on unmount (edit mode) ────────────────────────────
	useEffect(() => {
		return () => {
			if (!isCreateMode && editor) {
				if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
				const content = JSON.stringify(editor.getJSON());
				if (content !== lastSavedContentRef.current) {
					lastSavedContentRef.current = content;
					updateNote(note!.id, { content }, false);
				}
			}
		};
	}, [editor, isCreateMode, note, updateNote]);

	// ── create-mode helpers ──────────────────────────────────────────────────
	const checkHasContent = useCallback(() => {
		if (titleValueRef.current.trim()) return true;
		if (!editor) return false;
		const hasText = (c: JSONContent): boolean => {
			if (c.text?.trim()) return true;
			return c.content?.some(hasText) ?? false;
		};
		return hasText(editor.getJSON());
	}, [editor]);

	const saveNewNote = useCallback(() => {
		if (hasSavedRef.current || !editor) return null;
		try {
			hasSavedRef.current = true;
			return addNote({
				title: titleValueRef.current.trim() || "Untitled",
				content: JSON.stringify(editor.getJSON()),
				tags: selectedTagsRef.current,
				folder: activeFolder?.id || "inbox",
				reminder: reminderRef.current,
			});
		} catch (error) {
			console.error("Failed to create note:", error);
			hasSavedRef.current = false;
			return null;
		}
	}, [addNote, activeFolder, editor]);

	const handleBack = useCallback(() => {
		if (!hasSavedRef.current && checkHasContent()) {
			const noteId = saveNewNote();
			if (noteId && onNoteCreated) onNoteCreated(noteId);
		}
	}, [checkHasContent, saveNewNote, onNoteCreated]);

	useEffect(() => {
		if (isCreateMode && registerBackHandler) registerBackHandler(handleBack);
	}, [isCreateMode, registerBackHandler, handleBack]);

	// ── create-mode: auto-save on unmount ────────────────────────────────────
	useEffect(() => {
		if (!isCreateMode) return;
		return () => {
			if (hasSavedRef.current || !editor) return;
			const hasText = (c: JSONContent): boolean => {
				if (c.text?.trim()) return true;
				return c.content?.some(hasText) ?? false;
			};
			if (titleValueRef.current.trim() || hasText(editor.getJSON())) {
				try {
					hasSavedRef.current = true;
					addNote({
						title: titleValueRef.current.trim() || "Untitled",
						content: JSON.stringify(editor.getJSON()),
						tags: selectedTagsRef.current,
						folder: activeFolder?.id || "inbox",
						reminder: reminderRef.current,
					});
				} catch (error) {
					console.error("Failed to auto-save note on unmount:", error);
				}
			}
		};
	}, [addNote, activeFolder, editor, isCreateMode]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── edit-mode handlers ───────────────────────────────────────────────────
	const handleTitleBlur = useCallback(() => {
		if (isCreateMode) return;
		setIsEditingTitle(false);
		if (title !== note!.title) updateNote(note!.id, { title });
	}, [isCreateMode, title, note, updateNote]);

	const handleTagToggle = useCallback(
		(tagId: string) => {
			setSelectedTags((prev) => {
				const newTags =
					prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId];
				if (!isCreateMode) updateNote(note!.id, { tags: newTags });
				return newTags;
			});
		},
		[isCreateMode, note, updateNote],
	);

	const handleReminderSave = useCallback(
		(r: NoteReminder) => {
			setReminder(r);
			setShowReminderModal(false);
			if (!isCreateMode) updateNote(note!.id, { reminder: r });
		},
		[isCreateMode, note, updateNote],
	);

	const handleReminderClear = useCallback(() => {
		setReminder(null);
		if (!isCreateMode) updateNote(note!.id, { reminder: null });
	}, [isCreateMode, note, updateNote]);

	// ── render ───────────────────────────────────────────────────────────────
	if (!editor) return null;

	const formatDate = (date: Date) =>
		new Date(date).toLocaleString(undefined, {
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});

	return (
		<div className="h-full overflow-y-auto bg-card">
			<div className="flex h-full">
				{/* ── Left column ─────────────────────────────────────────────── */}
				<div className="flex-1 min-w-0 overflow-y-auto">
					<div className="max-w-4xl mx-auto px-8 py-6">
						{/* ── Title ────────────────────────────────────────────── */}
						{isCreateMode || isEditingTitle ?
							<input
								ref={titleRef}
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={handleTitleBlur}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleTitleBlur();
									}
									if (e.key === "Escape" && !isCreateMode) {
										setTitle(note!.title);
										setIsEditingTitle(false);
									}
								}}
								placeholder="Untitled"
								className="w-full text-4xl font-bold text-card-foreground outline-none mb-4 placeholder:text-muted-foreground bg-transparent border-b-2 border-primary pb-2"
							/>
						:	<button
								type="button"
								onClick={() => setIsEditingTitle(true)}
								className="w-full text-left text-4xl font-bold text-card-foreground cursor-text hover:bg-accent rounded p-2 -m-2 transition-colors mb-4"
							>
								{title || "Untitled"}
							</button>
						}

						{/* ── Metadata (edit mode only) ────────────────────────── */}
						{!isCreateMode && note && (
							<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
								<span className="flex items-center gap-1.5">
									<Calendar size={14} />
									<span className="font-medium text-foreground/60">Created:</span>
									{formatDate(note.createdAt)}
								</span>
								{note.updatedAt &&
									new Date(note.updatedAt).getTime() !==
										new Date(note.createdAt).getTime() && (
										<span className="flex items-center gap-1.5">
											<Clock size={14} />
											<span className="font-medium text-foreground/60">
												Updated:
											</span>
											{formatDate(note.updatedAt)}
										</span>
									)}
							</div>
						)}

						{/* ── Tags ──────────────────────────────────────────────── */}
						<div className="mb-4">
							<TagSelector
								tags={tags}
								selectedTags={selectedTags}
								onTagToggle={handleTagToggle}
							/>
						</div>

						{/* ── Reminder section ─────────────────────────────────── */}
						<div className="mb-5">
							{reminder ?
								<div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
									<Bell size={16} className="text-primary flex-shrink-0" />
									<div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm flex-1 min-w-0">
										<span className="text-foreground font-medium">
											{formatReminderDateTime(reminder).date}{" "}
											<span className="text-muted-foreground font-normal">
												at
											</span>{" "}
											{formatReminderDateTime(reminder).time}
										</span>
										<span className="text-muted-foreground text-xs">
											Notify: {formatNotifSummary(reminder)}
										</span>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<button
											type="button"
											onClick={() => setShowReminderModal(true)}
											className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
											aria-label="Edit reminder"
										>
											<Pencil size={15} />
										</button>
										<button
											type="button"
											onClick={handleReminderClear}
											className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-red-500"
											aria-label="Remove reminder"
										>
											<Trash2 size={15} />
										</button>
									</div>
								</div>
							:	<button
									type="button"
									onClick={() => setShowReminderModal(true)}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors"
								>
									<Bell size={15} />
									<span>Reminder</span>
								</button>
							}
						</div>

						{/* ── Divider + Editor ─────────────────────────────────── */}
						<div className="border-t border-border pt-6">
							<div className="w-full min-h-[300px] tiptap-editor-wrapper">
								<BubbleMenuBar editor={editor} />
								<EditorContent editor={editor} />
							</div>
						</div>
					</div>
				</div>

				{/* ── Right column: ToC ────────────────────────────────────────── */}
				<div className="flex-shrink-0 h-full sticky top-0" style={{ height: "100vh" }}>
					<TableOfContentsSidebar editor={editor} />
				</div>
			</div>

			{/* ── Reminder Modal ───────────────────────────────────────────────── */}
			<ReminderModal
				isOpen={showReminderModal}
				onClose={() => setShowReminderModal(false)}
				initialReminder={reminder}
				onSave={handleReminderSave}
			/>
		</div>
	);
};
