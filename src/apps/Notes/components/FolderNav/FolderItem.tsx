import { ChevronRight, Folder as FolderIcon, Inbox } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import type { Folder } from "@/types/notes";

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
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	// Get icon
	let IconComponent = isInbox ? Inbox : FolderIcon;
	if (!isInbox && folder.icon) {
		IconComponent = folder.icon;
	}

	if (isEditing) {
		return (
			<div
				className={`flex items-center rounded-lg px-2 py-1.5 ${
					isActive ? "bg-primary/10" : ""
				}`}
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

	// Apply grab cursor when ready to drag, pointer otherwise
	const cursorStyle = isDragReady && !isDragging ? "grab" : "pointer";

	return (
		<button
			type="button"
			className={`group relative w-full flex items-center rounded-lg transition-all text-left ${
				isInbox ? "mb-2" : ""
			} ${isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"} ${
				isDragging ? "opacity-30 cursor-grabbing" : ""
			} ${isDragOver && !isDragging ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
			data-folder-id={dataFolderId}
			draggable={draggable}
			onMouseDown={() => !isInbox && onMouseDown()}
			onMouseUp={onMouseUp}
			onMouseLeave={onMouseUp}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			onContextMenu={onContextMenu}
			onClick={onSelect}
			style={{
				paddingLeft: isInbox ? "8px" : `${depth * 12 + 8}px`,
				userSelect: "none",
				WebkitUserSelect: "none",
				cursor: cursorStyle,
			}}
		>
			{/* Chevron - decorative only */}
			<span className={`shrink-0 transition-transform mr-1 ${!hasChildren && "invisible"}`}>
				<ChevronRight
					size={12}
					className={`text-muted-foreground transition-transform ${
						isExpanded ? "rotate-90" : ""
					}`}
				/>
			</span>

			{/* Icon and Name */}
			<div
				className={`flex-1 flex items-center gap-2 min-w-0 ${
					isInbox ? "py-2 px-1" : "py-1.5 px-1"
				}`}
			>
				<IconComponent
					size={isInbox ? 20 : 16}
					className="shrink-0"
					key={`icon-${folder.id}-${folder.icon?.name || "default"}`}
				/>
				<span className={`font-medium truncate ${isInbox ? "text-base" : "text-sm"}`}>
					{folder.name}
				</span>
			</div>

			{/* Badge */}
			<div className="flex items-center gap-2 pr-2 shrink-0">
				<span
					className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
					aria-label={`${noteCount} notes`}
				>
					{noteCount}
				</span>
			</div>
		</button>
	);
};
