import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Bell, Calendar, Clock, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { TagSelector } from "./TagSelector";
import { TableOfContentsSidebar } from "./TableOfContentsSidebar";
import { ReminderModal } from "./ReminderModal";
import {
	createNoteExtensions,
	handleEditorPaste,
	noteClipboardTextSerializer,
} from "../editor/editorExtensions";

const SAVE_DEBOUNCE_MS = 500;
const EMPTY_DOC: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

// keep parseContent / formatReminderDateTime / formatNotifSummary /
// selectionToIconValue / iconValueToPickerProps exactly as they are

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

function formatReminderDateTime(reminder: NoteReminder): {
	date: string;
	time: string;
} {
	const dt = new Date(reminder.dateTime);
	return {
		date: dt.toLocaleDateString(undefined, {
			month: "long",
			day: "numeric",
			year: "numeric",
		}),
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

function selectionToIconValue(sel: IconPickerSelection): string {
	return sel.type === "icon" ? sel.name : sel.emoji;
}

function iconValueToPickerProps(value?: string | null) {
	if (!value) return {};
	const lucide = findIconByName(value);
	if (lucide) return { currentIcon: lucide };
	if (isEmojiString(value)) return { currentEmoji: value };
	return {};
}

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
	const [title, setTitle] = useState(note?.title ?? "");
	const [isEditingTitle, setIsEditingTitle] = useState(isCreateMode);
	const [selectedTags, setSelectedTags] = useState<string[]>(
		note?.tags ?? [],
	);
	const [reminder, setReminder] = useState<NoteReminder | null>(
		note?.reminder ?? null,
	);
	const [showReminderModal, setShowReminderModal] = useState(false);
	const [noteIcon, setNoteIcon] = useState<string | null>(note?.icon ?? null);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const titleRef = useRef<HTMLInputElement>(null);
	const titleValueRef = useRef(title);
	const selectedTagsRef = useRef(selectedTags);
	const reminderRef = useRef(reminder);
	const noteIconRef = useRef(noteIcon);
	const hasSavedRef = useRef(false);

	// Always points to the latest note prop – prevents stale-closure saves
	// that could overwrite an edited duplicate with its original content. (Issue 6)
	const noteRef = useRef<Note | undefined>(note);

	useEffect(() => {
		noteRef.current = note;
	}, [note]);

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

	const noteIdRef = useRef(note?.id);
	useEffect(() => {
		if (!note) return;
		if (noteIdRef.current !== note.id) {
			noteIdRef.current = note.id;
			setTitle(note.title);
			setSelectedTags(note.tags ?? []);
			setReminder(note.reminder ?? null);
			setNoteIcon(note.icon ?? null);
			// Reset the save baseline so edits to the new note aren't compared
			// against the previous note's content.
			lastSavedContentRef.current = note.content ?? "";
		}
	}, [note]);

	useEffect(() => {
		if (isCreateMode) titleRef.current?.focus();
	}, []);

	const extensions = useMemo(
		() => createNoteExtensions({ isNew: isCreateMode }),
		[isCreateMode],
	);

	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedContentRef = useRef<string>(note?.content ?? "");

	const editor = useEditor({
		extensions,
		content: isCreateMode ? EMPTY_DOC : parseContent(note!.content),
		autofocus: !isCreateMode,
		editorProps: {
			attributes: {
				class: "tiptap-editor focus:outline-none min-h-[200px] break-words max-w-full",
			},
			handlePaste: handleEditorPaste,
			clipboardTextSerializer: noteClipboardTextSerializer,
		},
		onUpdate: ({ editor: ed }) => {
			if (isCreateMode) return;
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
			saveTimeoutRef.current = setTimeout(() => {
				const current = noteRef.current;
				if (!current) return;
				const content = JSON.stringify(ed.getJSON());
				if (content !== lastSavedContentRef.current) {
					lastSavedContentRef.current = content;
					updateNote(current.id, { content }, false);
				}
				saveTimeoutRef.current = null;
			}, SAVE_DEBOUNCE_MS);
		},
	});

	useEffect(() => {
		return () => {
			if (!isCreateMode && editor) {
				if (saveTimeoutRef.current)
					clearTimeout(saveTimeoutRef.current);
				const current = noteRef.current;
				if (!current) return;
				const content = JSON.stringify(editor.getJSON());
				if (content !== lastSavedContentRef.current) {
					lastSavedContentRef.current = content;
					updateNote(current.id, { content }, false);
				}
			}
		};
	}, [editor, isCreateMode, updateNote]);

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
		if (isCreateMode && registerBackHandler)
			registerBackHandler(handleBack);
	}, [isCreateMode, registerBackHandler, handleBack]);

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
					console.error(
						"Failed to auto-save note on unmount:",
						error,
					);
				}
			}
		};
	}, [addNote, activeFolder, editor, isCreateMode]);

	const handleTitleBlur = useCallback(() => {
		if (isCreateMode) return;
		setIsEditingTitle(false);
		const current = noteRef.current;
		if (current && title !== current.title)
			updateNote(current.id, { title });
	}, [isCreateMode, title, updateNote]);

	const handleTagToggle = useCallback(
		(tagId: string) => {
			setSelectedTags((prev) => {
				const newTags = prev.includes(tagId)
					? prev.filter((t) => t !== tagId)
					: [...prev, tagId];
				if (!isCreateMode && noteRef.current)
					updateNote(noteRef.current.id, { tags: newTags });
				return newTags;
			});
		},
		[isCreateMode, updateNote],
	);

	const handleReminderSave = useCallback(
		(r: NoteReminder) => {
			setReminder(r);
			setShowReminderModal(false);
			if (!isCreateMode && noteRef.current)
				updateNote(noteRef.current.id, { reminder: r });
		},
		[isCreateMode, updateNote],
	);

	const handleReminderClear = useCallback(() => {
		setReminder(null);
		if (!isCreateMode && noteRef.current)
			updateNote(noteRef.current.id, { reminder: null });
	}, [isCreateMode, updateNote]);

	const handleIconSelect = useCallback(
		(selection: IconPickerSelection) => {
			const value = selectionToIconValue(selection);
			setNoteIcon(value);
			setShowIconPicker(false);
			if (!isCreateMode && noteRef.current)
				updateNote(noteRef.current.id, { icon: value });
		},
		[isCreateMode, updateNote],
	);

	const handleIconRemove = useCallback(() => {
		setNoteIcon(null);
		setShowIconPicker(false);
		if (!isCreateMode && noteRef.current)
			updateNote(noteRef.current.id, { icon: null });
	}, [isCreateMode, updateNote]);

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
		<div className="h-full flex bg-card overflow-hidden">
			{/* Scoped styles to keep long/large content inside bounds (Issue 9) */}
			<style>{`
				.tiptap-editor { overflow-wrap: anywhere; word-break: break-word; }
				.tiptap-editor pre { overflow-x: auto; max-width: 100%; }
				.tiptap-editor img { max-width: 100%; height: auto; }
				.tiptap-editor table { display: block; width: max-content; max-width: 100%; overflow-x: auto; }
			`}</style>
			{/* Scrollable content area */}
			<div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					{noteIcon ? (
						<Popover
							open={showIconPicker}
							onOpenChange={setShowIconPicker}
						>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="mb-2 p-1 rounded-lg hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
									aria-label="Change or remove note icon"
								>
									{renderNoteIcon(noteIcon, 32)}
								</button>
							</PopoverTrigger>
							<PopoverContent
								className="w-auto p-2"
								align="start"
								side="bottom"
							>
								<IconPicker
									{...pickerProps}
									onSelect={handleIconSelect}
									onRemove={handleIconRemove}
									showRemove
									variant="default"
								/>
							</PopoverContent>
						</Popover>
					) : (
						<Popover
							open={showIconPicker}
							onOpenChange={setShowIconPicker}
						>
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
							<PopoverContent
								className="w-auto p-2"
								align="start"
								side="bottom"
							>
								<IconPicker
									onSelect={handleIconSelect}
									variant="default"
								/>
							</PopoverContent>
						</Popover>
					)}
					{isCreateMode || isEditingTitle ? (
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
								if (
									e.key === "Escape" &&
									!isCreateMode &&
									noteRef.current
								) {
									setTitle(noteRef.current.title);
									setIsEditingTitle(false);
								}
							}}
							placeholder="Untitled"
							className="w-full text-4xl font-bold text-card-foreground outline-none mb-4 placeholder:text-muted-foreground bg-transparent border-b-2 border-primary pb-2 break-words"
						/>
					) : (
						<button
							type="button"
							onClick={() => setIsEditingTitle(true)}
							className="w-full text-left text-4xl font-bold text-card-foreground cursor-text hover:bg-accent rounded p-2 -m-2 transition-colors mb-4 break-words"
						>
							{title || "Untitled"}
						</button>
					)}
					{!isCreateMode && note && (
						<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
							<span className="flex items-center gap-1.5">
								<Calendar size={14} />
								<span className="font-medium text-foreground/60">
									Created:
								</span>
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
					<div className="mb-4">
						<TagSelector
							tags={tags}
							selectedTags={selectedTags}
							onTagToggle={handleTagToggle}
						/>
					</div>
					<div className="mb-5">
						{reminder ? (
							<div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
								<Bell
									size={16}
									className="text-primary shrink-0"
								/>
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
										onClick={() =>
											setShowReminderModal(true)
										}
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
						) : (
							<button
								type="button"
								onClick={() => setShowReminderModal(true)}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors"
							>
								<Bell size={15} />
								<span>Reminder</span>
							</button>
						)}
					</div>
					<div className="border-t border-border pt-6">
						<div className="w-full min-h-[300px] tiptap-editor-wrapper min-w-0">
							<BubbleMenuBar editor={editor} />
							<EditorContent editor={editor} />
						</div>
					</div>
					{/* Scroll-past-end spacer so the last heading can reach the top
					    (fixes ToC highlighting of the final headings – Issue 4). */}
					<div aria-hidden className="h-[80vh]" />
				</div>
			</div>
			{/* ToC – hidden on narrow widths so it never pushes the editor off-screen (Issue 9) */}
			<div className="shrink-0 h-full hidden md:block">
				<TableOfContentsSidebar editor={editor} />
			</div>
			<ReminderModal
				isOpen={showReminderModal}
				onClose={() => setShowReminderModal(false)}
				initialReminder={reminder}
				onSave={handleReminderSave}
			/>
		</div>
	);
};
