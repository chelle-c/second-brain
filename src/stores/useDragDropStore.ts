import { create } from "zustand";

export interface DragItem<T = unknown> {
	type: string;
	id: string;
	data: T;
}

interface DragDropState {
	draggedItem: DragItem | null;
	isDragging: boolean;
	setDraggedItem: (item: DragItem | null) => void;
	clearDrag: () => void;
}

export const useDragDropStore = create<DragDropState>((set) => ({
	draggedItem: null,
	isDragging: false,
	setDraggedItem: (item) => set({ draggedItem: item, isDragging: item !== null }),
	clearDrag: () => set({ draggedItem: null, isDragging: false }),
}));
