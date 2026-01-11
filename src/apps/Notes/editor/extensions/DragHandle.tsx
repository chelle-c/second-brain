import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { ResolvedPos, Node as PMNode, Slice } from "@tiptap/pm/model";

const dragHandlePluginKey = new PluginKey("dragHandle");

export interface DragHandleOptions {
	dragHandleWidth: number;
}

interface BlockInfo {
	node: PMNode;
	pos: number;
	depth: number;
}

// Find the top-level block node at a given position
const findBlockNode = ($pos: ResolvedPos): BlockInfo | null => {
	for (let depth = $pos.depth; depth > 0; depth--) {
		const node = $pos.node(depth);
		if (node.isBlock && $pos.node(depth - 1).type.name === "doc") {
			return {
				node,
				pos: $pos.before(depth),
				depth,
			};
		}
	}
	return null;
};

export const DragHandle = Extension.create<DragHandleOptions>({
	name: "dragHandle",

	addOptions() {
		return {
			dragHandleWidth: 24,
		};
	},

	addProseMirrorPlugins() {
		let dragHandleElement: HTMLElement | null = null;
		let currentBlock: BlockInfo | null = null;
		let draggedSlice: Slice | null = null;
		let draggedNodePos: number | null = null;
		let isDragging = false;
		let hideTimeout: ReturnType<typeof setTimeout> | null = null;

		const createDragHandle = (): HTMLElement => {
			const handle = document.createElement("div");
			handle.className = "drag-handle";
			handle.draggable = true;
			handle.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="9" cy="5" r="2"/>
					<circle cx="9" cy="12" r="2"/>
					<circle cx="9" cy="19" r="2"/>
					<circle cx="15" cy="5" r="2"/>
					<circle cx="15" cy="12" r="2"/>
					<circle cx="15" cy="19" r="2"/>
				</svg>
			`;
			handle.style.cssText = `
				position: absolute;
				left: -28px;
				width: 24px;
				height: 24px;
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: grab;
				border-radius: 4px;
				opacity: 0;
				transition: opacity 0.15s ease;
				color: var(--muted-foreground, #888);
				z-index: 50;
				user-select: none;
			`;
			handle.setAttribute("contenteditable", "false");
			handle.setAttribute("data-drag-handle", "true");
			return handle;
		};

		const showDragHandle = (view: EditorView, block: BlockInfo) => {
			if (!dragHandleElement) return;

			// Clear any pending hide
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}

			try {
				const coords = view.coordsAtPos(block.pos);
				const parentRect = view.dom.parentElement?.getBoundingClientRect();

				if (!parentRect) return;

				const scrollTop = view.dom.parentElement?.scrollTop || 0;
				const top = coords.top - parentRect.top + scrollTop;

				dragHandleElement.style.top = `${top}px`;
				dragHandleElement.style.opacity = "1";
				currentBlock = block;
			} catch {
				hideDragHandle();
			}
		};

		const hideDragHandle = () => {
			if (dragHandleElement && !isDragging) {
				dragHandleElement.style.opacity = "0";
			}
			if (!isDragging) {
				currentBlock = null;
			}
		};

		const hideDragHandleDelayed = () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
			}
			hideTimeout = setTimeout(() => {
				if (!isDragging && !dragHandleElement?.matches(":hover")) {
					hideDragHandle();
				}
			}, 300);
		};

		return [
			new Plugin({
				key: dragHandlePluginKey,
				view: (editorView) => {
					dragHandleElement = createDragHandle();

					// Ensure parent has relative positioning
					const parent = editorView.dom.parentElement;
					if (parent) {
						const computedStyle = getComputedStyle(parent);
						if (computedStyle.position === "static") {
							parent.style.position = "relative";
						}
						parent.appendChild(dragHandleElement);
					}

					// Drag start - store the node to be moved
					const handleDragStart = (event: DragEvent) => {
						if (!currentBlock || !event.dataTransfer) return;

						isDragging = true;
						draggedNodePos = currentBlock.pos;

						const { state } = editorView;
						const nodeSize = currentBlock.node.nodeSize;

						// Create a slice of the node to be moved
						draggedSlice = state.doc.slice(currentBlock.pos, currentBlock.pos + nodeSize);

						// Select the node visually
						const selection = NodeSelection.create(state.doc, currentBlock.pos);
						editorView.dispatch(state.tr.setSelection(selection));

						// Get the node's DOM for drag image
						const nodeDOM = editorView.nodeDOM(currentBlock.pos);
						if (nodeDOM instanceof HTMLElement) {
							nodeDOM.classList.add("is-dragging");

							// Create a drag image
							const dragImage = nodeDOM.cloneNode(true) as HTMLElement;
							dragImage.style.cssText = `
								position: absolute;
								top: -1000px;
								left: -1000px;
								opacity: 0.8;
								background: var(--card, white);
								padding: 8px;
								border-radius: 4px;
								box-shadow: 0 4px 12px rgba(0,0,0,0.15);
								max-width: 400px;
								pointer-events: none;
							`;
							document.body.appendChild(dragImage);
							event.dataTransfer.setDragImage(dragImage, 0, 0);
							setTimeout(() => dragImage.remove(), 0);
						}

						event.dataTransfer.effectAllowed = "move";
						event.dataTransfer.setData("application/x-prosemirror-node", "true");

						if (dragHandleElement) {
							dragHandleElement.style.cursor = "grabbing";
						}
					};

					const handleDragEnd = () => {
						isDragging = false;
						draggedSlice = null;
						draggedNodePos = null;

						if (dragHandleElement) {
							dragHandleElement.style.cursor = "grab";
							dragHandleElement.style.opacity = "0";
						}
						currentBlock = null;

						document.querySelectorAll(".is-dragging").forEach((el) => {
							el.classList.remove("is-dragging");
						});
					};

					const handleMouseEnter = () => {
						if (hideTimeout) {
							clearTimeout(hideTimeout);
							hideTimeout = null;
						}
						if (dragHandleElement) {
							dragHandleElement.style.backgroundColor = "var(--accent, rgba(0,0,0,0.05))";
						}
					};

					const handleMouseLeave = () => {
						if (dragHandleElement) {
							dragHandleElement.style.backgroundColor = "transparent";
						}
						hideDragHandleDelayed();
					};

					dragHandleElement.addEventListener("dragstart", handleDragStart);
					dragHandleElement.addEventListener("dragend", handleDragEnd);
					dragHandleElement.addEventListener("mouseenter", handleMouseEnter);
					dragHandleElement.addEventListener("mouseleave", handleMouseLeave);

					return {
						update: () => {},
						destroy: () => {
							if (hideTimeout) {
								clearTimeout(hideTimeout);
							}
							dragHandleElement?.remove();
							dragHandleElement = null;
						},
					};
				},
				props: {
					handleDOMEvents: {
						mousemove: (view, event) => {
							if (isDragging) return false;

							const target = event.target as HTMLElement;
							if (target.closest("[data-drag-handle]")) {
								return false;
							}

							const pos = view.posAtCoords({
								left: event.clientX,
								top: event.clientY,
							});

							if (!pos) {
								hideDragHandleDelayed();
								return false;
							}

							try {
								const $pos = view.state.doc.resolve(pos.pos);
								const blockInfo = findBlockNode($pos);

								if (blockInfo) {
									if (!currentBlock || currentBlock.pos !== blockInfo.pos) {
										showDragHandle(view, blockInfo);
									}
								} else {
									hideDragHandleDelayed();
								}
							} catch {
								hideDragHandleDelayed();
							}

							return false;
						},
						mouseleave: (_view, event) => {
							const relatedTarget = event.relatedTarget as HTMLElement;
							if (relatedTarget?.closest("[data-drag-handle]")) {
								return false;
							}
							hideDragHandleDelayed();
							return false;
						},
						dragover: (_view, event) => {
							if (draggedSlice) {
								event.preventDefault();
								event.dataTransfer!.dropEffect = "move";
							}
							return false;
						},
						drop: (view, event) => {
							if (!draggedSlice || draggedNodePos === null) {
								return false;
							}

							event.preventDefault();

							const dropPos = view.posAtCoords({
								left: event.clientX,
								top: event.clientY,
							});

							if (!dropPos) {
								return true;
							}

							try {
								const $dropPos = view.state.doc.resolve(dropPos.pos);
								const dropBlock = findBlockNode($dropPos);

								// Determine insert position
								let insertPos: number;
								if (dropBlock) {
									// Check if we're in the top or bottom half of the block
									const blockDOM = view.nodeDOM(dropBlock.pos);
									if (blockDOM instanceof HTMLElement) {
										const rect = blockDOM.getBoundingClientRect();
										const midpoint = rect.top + rect.height / 2;
										if (event.clientY < midpoint) {
											// Insert before
											insertPos = dropBlock.pos;
										} else {
											// Insert after
											insertPos = dropBlock.pos + dropBlock.node.nodeSize;
										}
									} else {
										insertPos = dropBlock.pos + dropBlock.node.nodeSize;
									}
								} else {
									insertPos = $dropPos.pos;
								}

								const { state } = view;
								let tr = state.tr;

								// Calculate the original node's range
								const originalNodeSize = draggedSlice.content.size;
								const originalEnd = draggedNodePos + originalNodeSize;

								// If inserting before the original position, adjust the delete range
								if (insertPos <= draggedNodePos) {
									// Insert first, then delete (adjusted position)
									tr = tr.insert(insertPos, draggedSlice.content);
									tr = tr.delete(
										draggedNodePos + originalNodeSize,
										originalEnd + originalNodeSize
									);
								} else if (insertPos >= originalEnd) {
									// Delete first, then insert (adjusted position)
									tr = tr.delete(draggedNodePos, originalEnd);
									tr = tr.insert(insertPos - originalNodeSize, draggedSlice.content);
								} else {
									// Dropping within the same node - don't do anything
									return true;
								}

								// Set selection to the moved node
								const newPos = insertPos <= draggedNodePos
									? insertPos
									: insertPos - originalNodeSize;
								tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));

								view.dispatch(tr);
							} catch (e) {
								console.error("Drop error:", e);
							}

							// Reset drag state
							isDragging = false;
							draggedSlice = null;
							draggedNodePos = null;

							document.querySelectorAll(".is-dragging").forEach((el) => {
								el.classList.remove("is-dragging");
							});

							return true;
						},
					},
					handleDrop: () => {
						return false;
					},
				},
			}),
		];
	},
});

export default DragHandle;
