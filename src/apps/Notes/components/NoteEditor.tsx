import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Calendar, Clock, Pencil, SmilePlus, Trash2 } from "lucide-react";
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

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	IconPicker,
	renderNoteIcon,
	findIconByName,
	isEmojiString,
	type IconPickerSelection,
} from "@/components/IconPicker";
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
const createExtensions = (isNew: boolean) => {
	const raw = [
		StarterKit.configure({ codeBlock: false }),
		TextStyle,
		Color,
		Highlight.configure({ multicolor: !isNew }),
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
				isNew ? "Start writing or type '/' for commands…" : "Type '/' for commands…",
		}),
		Typography,
		CodeBlockLowlight.configure({ lowlight }),
		Callout,
		LinkPreview,
		...(isNew ? [] : [DragHandle]),
		SlashCommands,
	];

	const seen = new Set<string>();
	const deduped: typeof raw = [];
	for (let i = raw.length - 1; i >= 0; i--) {
		const ext = raw[i];
		const name =
			(ext as { name?: string }).name ??
			(ext as { spec?: { name?: string } }).spec?.name ??
			undefined;
		if (name && seen.has(name)) continue;
		if (name) seen.add(name);
		deduped.unshift(ext);
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

// ── helpers for note icon ────────────────────────────────────────────────────

/** Convert a picker selection to a storable string value. */
function selectionToIconValue(sel: IconPickerSelection): string {
	return sel.type === "icon" ? sel.name : sel.emoji;
}

/** Derive picker props from a stored icon value. */
function iconValueToPickerProps(value?: string | null) {
	if (!value) return {};
	const lucide = findIconByName(value);
	if (lucide) return { currentIcon: lucide };
	if (isEmojiString(value)) return { currentEmoji: value };
	return {};
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
	const [noteIcon, setNoteIcon] = useState<string | null>(note?.icon ?? null);
	const [showIconPicker, setShowIconPicker] = useState(false);

	const titleRef = useRef<HTMLInputElement>(null);

	// ── create-mode refs ─────────────────────────────────────────────────────
	const titleValueRef = useRef(title);
	const selectedTagsRef = useRef(selectedTags);
	const reminderRef = useRef(reminder);
	const noteIconRef = useRef(noteIcon);
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
	useEffect(() => {
		noteIconRef.current = noteIcon;
	}, [noteIcon]);

	// ── sync from note prop (edit mode) ──────────────────────────────────────
	const noteIdRef = useRef(note?.id);
	useEffect(() => {
		if (!note) return;
		if (noteIdRef.current !== note.id) {
			noteIdRef.current = note.id;
			setTitle(note.title);
			setSelectedTags(note.tags ?? []);
			setReminder(note.reminder ?? null);
			setNoteIcon(note.icon ?? null);
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
				icon: noteIconRef.current,
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
						icon: noteIconRef.current,
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

	// ── icon handlers ────────────────────────────────────────────────────────
	const handleIconSelect = useCallback(
		(selection: IconPickerSelection) => {
			const value = selectionToIconValue(selection);
			setNoteIcon(value);
			setShowIconPicker(false);
			if (!isCreateMode) updateNote(note!.id, { icon: value });
		},
		[isCreateMode, note, updateNote],
	);

	const handleIconRemove = useCallback(() => {
		setNoteIcon(null);
		setShowIconPicker(false);
		if (!isCreateMode) updateNote(note!.id, { icon: null });
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

	const pickerProps = iconValueToPickerProps(noteIcon);

	return (
		<div className="h-full flex bg-card">
			{/* ── Scrollable content area ────────────────────────────────── */}
			<div className="flex-1 min-w-0 overflow-y-auto">
				<div className="max-w-4xl mx-auto px-8 py-6">
					{/* ── Note Icon ────────────────────────────────────────── */}
					{noteIcon ?
						<Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="mb-2 p-1 rounded-lg hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
									aria-label="Change or remove note icon"
								>
									{renderNoteIcon(noteIcon, 32)}
								</button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-2" align="start" side="bottom">
								<IconPicker
									{...pickerProps}
									onSelect={handleIconSelect}
									onRemove={handleIconRemove}
									showRemove
									variant="default"
								/>
							</PopoverContent>
						</Popover>
					:	<Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent border border-dashed border-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
									aria-label="Add icon to note"
								>
									<SmilePlus size={16} />
									<span>Add icon</span>
								</button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-2" align="start" side="bottom">
								<IconPicker onSelect={handleIconSelect} variant="default" />
							</PopoverContent>
						</Popover>
					}

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
								<Bell size={16} className="text-primary shrink-0" />
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
								<div className="flex items-center gap-1 shrink-0">
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

			{/* ── Right column: ToC ──────────────────────────────────────── */}
			<div className="shrink-0 h-full">
				<TableOfContentsSidebar editor={editor} />
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
