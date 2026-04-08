import { ChevronRight, Folder as FolderIcon, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPicker, type IconPickerSelection } from "@/components/IconPicker";
import type { Folder, Note } from "@/types/notes";
import { useDropZone, useDragState, type DragItem } from "@/hooks/useDragAndDrop";

type DropPosition = "above" | "inside" | "below";

interface FolderItemProps {
	folder: Folder;
	isActive: boolean;
	isExpanded: boolean;
	noteCount: number;
	hasChildren?: boolean;
	onToggle?: () => void;
	onSelect: () => void;
	onContextMenu: (e: React.MouseEvent) => void;
	isEditing: boolean;
	editValue: string;
	onEditChange: (value: string) => void;
	onEditSave: () => void;
	onEditCancel: () => void;
	isDragging: boolean;
	isDragOver: boolean;
	onDragStart: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onDragEnd: () => void;
	onMouseDown: () => void;
	onMouseUp: () => void;
	dataFolderId?: string;
	isInbox?: boolean;
	depth?: number;
	draggable?: boolean;
	isDragReady?: boolean;
	onNoteDrop?: (item: DragItem<Note>) => void;
	canDropNote?: (item: DragItem<Note>) => boolean;
	/** Called when user picks an icon OR an emoji via the picker. */
	onChangeIcon?: (icon: LucideIcon, emoji?: string) => void;
	draggedFolderParentId?: string | null;
	onFolderReorder?: (targetFolderId: string, position: "above" | "below") => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({
	folder,
	isActive,
	isExpanded,
	noteCount,
	hasChildren = false,
	onSelect,
	onContextMenu,
	isEditing,
	editValue,
	onEditChange,
	onEditSave,
	onEditCancel,
	isDragging,
	isDragOver,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
	onMouseDown,
	onMouseUp,
	dataFolderId,
	isInbox = false,
	depth = 0,
	draggable = false,
	isDragReady = false,
	onNoteDrop,
	canDropNote,
	onChangeIcon,
	draggedFolderParentId,
	onFolderReorder,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const { isDragging: isGlobalDragging, draggedItem } = useDragState();
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

	const {
		isOver: isNoteOver,
		canDrop: canDropNoteHere,
		dropHandlers: noteDropHandlers,
	} = useDropZone<Note>({
		accepts: ["note"],
		onDrop: (item) => onNoteDrop?.(item),
		canDrop: (item) => canDropNote?.(item) ?? true,
	});

	const isDraggingNote = isGlobalDragging && draggedItem?.type === "note";

	const isSibling =
		!isInbox &&
		!isDragging &&
		draggedFolderParentId !== undefined &&
		draggedFolderParentId === folder.parentId;

	useEffect(() => {
		if (!isDragOver) setDropPosition(null);
	}, [isDragOver]);

	// ── Render icon ──────────────────────────────────────────────────────────

	const renderFolderIcon = (size: number) => {
		if (isInbox) return <Inbox size={size} className="shrink-0" />;
		if (folder.emoji) {
			return (
				<span
					role="img"
					aria-hidden
					className="shrink-0"
					style={{ fontSize: `${size}px`, lineHeight: 1 }}
				>
					{folder.emoji}
				</span>
			);
		}
		const IconComponent = folder.icon || FolderIcon;
		return <IconComponent size={size} className="shrink-0" />;
	};

	// ── Handle picker selection ──────────────────────────────────────────────

	const handlePickerSelect = (selection: IconPickerSelection) => {
		if (!onChangeIcon) return;
		if (selection.type === "icon") {
			onChangeIcon(selection.icon, undefined);
		} else {
			// For emoji, we pass the default FolderIcon but signal the emoji
			onChangeIcon(FolderIcon, selection.emoji);
		}
		setShowIconPicker(false);
	};

	// ── Editing state ────────────────────────────────────────────────────────

	if (isEditing) {
		return (
			<div
				className={`flex items-center rounded-lg px-2 py-1.5 ${isActive ? "bg-primary/10" : ""}`}
				data-folder-id={dataFolderId}
				style={{ paddingLeft: `${depth * 12 + 8}px` }}
			>
				<div className="w-3.5 mr-1.5" />
				<input
					ref={inputRef}
					type="text"
					value={editValue}
					onChange={(e) => onEditChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							onEditSave();
						} else if (e.key === "Escape") {
							e.preventDefault();
							onEditCancel();
						}
					}}
					onBlur={onEditSave}
					className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
					autoFocus
					aria-label="Folder name"
				/>
			</div>
		);
	}

	// ── Combined drag handlers ───────────────────────────────────────────────

	const handleDragOver = (e: React.DragEvent) => {
		if (isDraggingNote) {
			noteDropHandlers.onDragOver(e);
			setDropPosition(null);
			return;
		}
		onDragOver(e);
		if (isSibling) {
			const rect = e.currentTarget.getBoundingClientRect();
			const y = e.clientY - rect.top;
			const h = rect.height;
			if (y < h * 0.3) setDropPosition("above");
			else if (y > h * 0.7) setDropPosition("below");
			else setDropPosition("inside");
		} else {
			setDropPosition(null);
		}
	};

	const handleDragEnter = (e: React.DragEvent) => {
		if (isDraggingNote) noteDropHandlers.onDragEnter(e);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		if (isDraggingNote) noteDropHandlers.onDragLeave(e);
		else onDragLeave(e);
	};

	const handleDrop = (e: React.DragEvent) => {
		const pos = dropPosition;
		setDropPosition(null);
		if (isDraggingNote) {
			noteDropHandlers.onDrop(e);
		} else if ((pos === "above" || pos === "below") && onFolderReorder) {
			e.preventDefault();
			e.stopPropagation();
			onFolderReorder(folder.id, pos);
		} else {
			onDrop(e);
		}
	};

	// ── Visual states ────────────────────────────────────────────────────────

	const isNoteDropTarget = isDraggingNote && isNoteOver;
	const canAcceptNote = isDraggingNote && canDropNoteHere;
	const showNotAllowed = isDraggingNote && isNoteOver && !canDropNoteHere;

	const showInsideHighlight =
		(isDragOver && !isDragging && (!dropPosition || dropPosition === "inside")) ||
		(isNoteDropTarget && canAcceptNote);

	const cursorStyle =
		showNotAllowed ? "not-allowed"
		: isDragReady && !isDragging ? "grab"
		: "pointer";

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSelect();
		}
	};

	return (
		<div
			role="button"
			tabIndex={0}
			className={`group relative w-full flex items-center rounded-lg transition-all text-left ${
				isInbox ? "mb-2" : ""
			} ${isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"} ${
				isDragging ? "opacity-30 cursor-grabbing" : ""
			} ${showInsideHighlight ? "bg-accent" : ""}`}
			data-folder-id={dataFolderId}
			draggable={draggable}
			onMouseDown={() => !isInbox && onMouseDown()}
			onMouseUp={onMouseUp}
			onMouseLeave={onMouseUp}
			onDragStart={onDragStart}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onDragEnd={onDragEnd}
			onContextMenu={onContextMenu}
			onClick={onSelect}
			onKeyDown={handleKeyDown}
			style={{
				paddingLeft: isInbox ? "8px" : `${depth * 12 + 8}px`,
				userSelect: "none",
				WebkitUserSelect: "none",
				cursor: cursorStyle,
			}}
		>
			{dropPosition === "above" && (
				<div className="absolute top-0 left-4 right-4 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
			)}
			{dropPosition === "below" && (
				<div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
			)}

			<span className={`shrink-0 transition-transform mr-1 ${!hasChildren && "invisible"}`}>
				<ChevronRight
					size={12}
					className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
				/>
			</span>

			<div
				className={`flex-1 flex items-center gap-2 min-w-0 ${isInbox ? "py-2 px-1" : "py-1.5 px-1"}`}
			>
				{!isInbox && onChangeIcon ?
					<Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
						<PopoverTrigger asChild>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowIconPicker(true);
								}}
								className="shrink-0 p-0.5 -m-0.5 rounded hover:bg-accent/50 transition-colors cursor-pointer"
								title="Change icon"
							>
								{renderFolderIcon(16)}
							</button>
						</PopoverTrigger>
						<PopoverContent
							className="w-auto p-2"
							align="start"
							side="right"
							onClick={(e) => e.stopPropagation()}
						>
							<IconPicker
								currentIcon={!folder.emoji ? folder.icon : undefined}
								currentEmoji={folder.emoji}
								onSelect={handlePickerSelect}
								variant="compact"
							/>
						</PopoverContent>
					</Popover>
				:	renderFolderIcon(isInbox ? 20 : 16)}
				<span className={`font-medium truncate ${isInbox ? "text-base" : "text-sm"}`}>
					{folder.name}
				</span>
			</div>

			<div className="flex items-center gap-2 pr-2 shrink-0">
				<span
					className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
					aria-label={`${noteCount} notes`}
				>
					{noteCount}
				</span>
			</div>
		</div>
	);
};
