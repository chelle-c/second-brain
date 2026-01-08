import { useCallback, useEffect, useRef, useState } from "react";
import { useDragDropStore, type DragItem } from "@/stores/useDragDropStore";

export type { DragItem };

// ============================================================================
// Types
// ============================================================================

interface UseDraggableOptions<T> {
	/** Unique type identifier for this draggable (e.g., 'note', 'folder', 'task') */
	type: string;
	/** Unique identifier for this specific item */
	id: string;
	/** Data to pass to the drop zone */
	data: T;
	/** Callback when drag starts */
	onDragStart?: () => void;
	/** Callback when drag ends, with boolean indicating if item was dropped successfully */
	onDragEnd?: (didDrop: boolean) => void;
	/** Whether dragging is disabled */
	disabled?: boolean;
	/** Ref to a custom drag preview element */
	dragPreviewRef?: React.RefObject<HTMLElement | null>;
}

interface UseDropZoneOptions<T = unknown> {
	/** Array of drag types this zone accepts */
	accepts: string[];
	/** Callback when a valid item is dropped */
	onDrop: (item: DragItem<T>) => void;
	/** Function to determine if the dragged item can be dropped here */
	canDrop?: (item: DragItem<T>) => boolean;
	/** Callback when a dragged item enters this zone */
	onDragEnter?: (item: DragItem<T>) => void;
	/** Callback when a dragged item leaves this zone */
	onDragLeave?: () => void;
}

interface DraggableReturn {
	/** Whether this specific item is currently being dragged */
	isDragging: boolean;
	/** Props to spread on the draggable element */
	dragHandlers: {
		draggable: boolean;
		onDragStart: (e: React.DragEvent) => void;
		onDragEnd: (e: React.DragEvent) => void;
	};
}

interface DropZoneReturn {
	/** Whether a draggable item is currently over this zone */
	isOver: boolean;
	/** Whether the current dragged item can be dropped in this zone */
	canDrop: boolean;
	/** Whether any item is being dragged (useful for showing drop zone indicators) */
	isDragActive: boolean;
	/** Props to spread on the drop zone element */
	dropHandlers: {
		onDragOver: (e: React.DragEvent) => void;
		onDragEnter: (e: React.DragEvent) => void;
		onDragLeave: (e: React.DragEvent) => void;
		onDrop: (e: React.DragEvent) => void;
	};
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to make an element draggable.
 *
 * @example
 * ```tsx
 * const { isDragging, dragHandlers } = useDraggable({
 *   type: 'note',
 *   id: note.id,
 *   data: note,
 * });
 *
 * return (
 *   <div {...dragHandlers} className={isDragging ? 'opacity-50' : ''}>
 *     {note.title}
 *   </div>
 * );
 * ```
 */
export function useDraggable<T>({
	type,
	id,
	data,
	onDragStart,
	onDragEnd,
	disabled = false,
	dragPreviewRef,
}: UseDraggableOptions<T>): DraggableReturn {
	const { setDraggedItem, clearDrag, draggedItem } = useDragDropStore();
	const [localIsDragging, setLocalIsDragging] = useState(false);

	const isDragging = localIsDragging && draggedItem?.id === id;

	const handleDragStart = useCallback(
		(e: React.DragEvent) => {
			if (disabled) {
				e.preventDefault();
				return;
			}

			const item: DragItem<T> = { type, id, data };
			setDraggedItem(item);
			setLocalIsDragging(true);

			// Set data transfer
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("application/json", JSON.stringify({ type, id }));

			// Set custom drag preview if provided
			if (dragPreviewRef?.current) {
				const rect = dragPreviewRef.current.getBoundingClientRect();
				e.dataTransfer.setDragImage(
					dragPreviewRef.current,
					rect.width / 2,
					rect.height / 2
				);
			}

			onDragStart?.();
		},
		[type, id, data, setDraggedItem, onDragStart, disabled, dragPreviewRef]
	);

	const handleDragEnd = useCallback(
		(e: React.DragEvent) => {
			const didDrop = e.dataTransfer.dropEffect !== "none";
			clearDrag();
			setLocalIsDragging(false);
			onDragEnd?.(didDrop);
		},
		[clearDrag, onDragEnd]
	);

	return {
		isDragging,
		dragHandlers: {
			draggable: !disabled,
			onDragStart: handleDragStart,
			onDragEnd: handleDragEnd,
		},
	};
}

/**
 * Hook to make an element a drop zone.
 *
 * @example
 * ```tsx
 * const { isOver, canDrop, dropHandlers } = useDropZone({
 *   accepts: ['note'],
 *   onDrop: (item) => moveNote(item.id, folderId),
 *   canDrop: (item) => item.data.folder !== folderId,
 * });
 *
 * return (
 *   <div
 *     {...dropHandlers}
 *     className={cn(
 *       isOver && canDrop && 'bg-accent',
 *       isOver && !canDrop && 'cursor-not-allowed'
 *     )}
 *   >
 *     {folder.name}
 *   </div>
 * );
 * ```
 */
export function useDropZone<T = unknown>({
	accepts,
	onDrop,
	canDrop: canDropFn,
	onDragEnter,
	onDragLeave,
}: UseDropZoneOptions<T>): DropZoneReturn {
	const { draggedItem, isDragging: isDragActive } = useDragDropStore();
	const [isOver, setIsOver] = useState(false);
	const enterCountRef = useRef(0);

	const canAccept = draggedItem && accepts.includes(draggedItem.type);
	const canDrop = canAccept && (canDropFn ? canDropFn(draggedItem as DragItem<T>) : true);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (canDrop) {
				e.dataTransfer.dropEffect = "move";
			} else if (canAccept) {
				e.dataTransfer.dropEffect = "none";
			}
		},
		[canDrop, canAccept]
	);

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			enterCountRef.current++;

			if (enterCountRef.current === 1) {
				setIsOver(true);
				if (draggedItem && canAccept) {
					onDragEnter?.(draggedItem as DragItem<T>);
				}
			}
		},
		[draggedItem, canAccept, onDragEnter]
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			enterCountRef.current--;

			if (enterCountRef.current === 0) {
				setIsOver(false);
				onDragLeave?.();
			}
		},
		[onDragLeave]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			enterCountRef.current = 0;
			setIsOver(false);

			if (draggedItem && canDrop) {
				onDrop(draggedItem as DragItem<T>);
			}
		},
		[draggedItem, canDrop, onDrop]
	);

	// Reset state when drag ends globally
	useEffect(() => {
		if (!draggedItem) {
			enterCountRef.current = 0;
			setIsOver(false);
		}
	}, [draggedItem]);

	return {
		isOver,
		canDrop: !!canDrop,
		isDragActive,
		dropHandlers: {
			onDragOver: handleDragOver,
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop,
		},
	};
}

/**
 * Hook to access the current global drag state.
 * Useful for components that need to react to drag operations
 * without being a drop zone themselves.
 *
 * @example
 * ```tsx
 * const { isDragging, draggedItem } = useDragState();
 *
 * if (isDragging && draggedItem?.type === 'note') {
 *   // Show drop zone indicators
 * }
 * ```
 */
export function useDragState() {
	const { draggedItem, isDragging } = useDragDropStore();
	return { draggedItem, isDragging };
}

/**
 * Hook to get the dragged item if it matches a specific type.
 * Returns null if nothing is being dragged or type doesn't match.
 *
 * @example
 * ```tsx
 * const draggedNote = useDraggedItemOfType<Note>('note');
 *
 * if (draggedNote) {
 *   console.log('Dragging note:', draggedNote.data.title);
 * }
 * ```
 */
export function useDraggedItemOfType<T>(type: string): DragItem<T> | null {
	const { draggedItem } = useDragDropStore();

	if (draggedItem && draggedItem.type === type) {
		return draggedItem as DragItem<T>;
	}

	return null;
}
