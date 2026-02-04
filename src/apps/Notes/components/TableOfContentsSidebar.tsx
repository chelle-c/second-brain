import { useState, useEffect, useCallback, useRef } from "react";
import { List, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Editor } from "@tiptap/core";

export interface TocItem {
	id: string;
	level: number;
	text: string;
	pos: number;
}

interface TableOfContentsSidebarProps {
	editor: Editor | null;
}

// Extract headings from the editor
const getHeadings = (editor: Editor): TocItem[] => {
	const items: TocItem[] = [];
	const { doc } = editor.state;

	doc.descendants((node, pos) => {
		if (node.type.name === "heading") {
			const id = `heading-${pos}`;
			const level = node.attrs.level as number;
			const text = node.textContent;

			if (text) {
				items.push({ id, level, text, pos });
			}
		}
	});

	return items;
};

// Find the heading DOM element from a position
const findHeadingElement = (editor: Editor, pos: number): HTMLElement | null => {
	try {
		const { view } = editor;
		const nodeDOM = view.nodeDOM(pos);
		if (nodeDOM instanceof HTMLElement) {
			return nodeDOM;
		}
		// Fallback: try domAtPos
		const domAtPos = view.domAtPos(pos);
		if (domAtPos.node) {
			const element =
				domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
			// Walk up to find the heading element
			if (element) {
				const heading = element.closest("h1, h2, h3, h4, h5, h6");
				if (heading instanceof HTMLElement) {
					return heading;
				}
			}
		}
	} catch {
		// Position might be invalid
	}
	return null;
};

export const TableOfContentsSidebar = ({ editor }: TableOfContentsSidebarProps) => {
	const [isOpen, setIsOpen] = useState(() => {
		const saved = localStorage.getItem("notes-toc-open");
		return saved ? saved === "true" : true;
	});
	const [items, setItems] = useState<TocItem[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const scrollContainerRef = useRef<Element | null>(null);

	// Persist open state to localStorage
	useEffect(() => {
		localStorage.setItem("notes-toc-open", isOpen.toString());
	}, [isOpen]);

	const handleSetIsOpen = (open: boolean) => {
		setIsOpen(open);
	};

	// Update headings when editor content changes
	const updateHeadings = useCallback(() => {
		if (editor) {
			setItems(getHeadings(editor));
		}
	}, [editor]);

	useEffect(() => {
		if (!editor) return;

		// Initial update
		updateHeadings();

		// Listen for editor updates
		editor.on("update", updateHeadings);

		return () => {
			editor.off("update", updateHeadings);
		};
	}, [editor, updateHeadings]);

	// Find and cache the scroll container
	useEffect(() => {
		if (!editor) return;

		const editorElement = editor.view.dom;
		scrollContainerRef.current =
			editorElement.closest(".overflow-y-auto") ||
			editorElement.closest("[class*='overflow']") ||
			document.querySelector(".h-full.overflow-y-auto");
	}, [editor]);

	// Track active heading based on scroll position / visibility
	useEffect(() => {
		if (!editor || items.length === 0) return;

		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) return;

		const updateActiveHeading = () => {
			const containerRect = scrollContainer.getBoundingClientRect();
			const containerTop = containerRect.top;

			// Find the heading closest to the top of the viewport
			let activeHeading: TocItem | null = null;
			let closestDistance = Infinity;

			for (const item of items) {
				const headingElement = findHeadingElement(editor, item.pos);
				if (headingElement) {
					const rect = headingElement.getBoundingClientRect();
					// Calculate distance from top of container (with some buffer for "at top")
					const distanceFromTop = rect.top - containerTop;

					// Heading is visible or just above the viewport
					if (distanceFromTop <= 50) {
						// If heading is at or above the top, it's a candidate
						// We want the one closest to (but not below) the top
						if (distanceFromTop > -rect.height) {
							const absDistance = Math.abs(distanceFromTop);
							if (absDistance < closestDistance || distanceFromTop <= 0) {
								closestDistance = absDistance;
								activeHeading = item;
							}
						}
					} else if (!activeHeading) {
						// If no heading is at/above top yet, take the first visible one
						activeHeading = item;
						break;
					}
				}
			}

			// If no heading found, default to the last heading that's above viewport
			if (!activeHeading && items.length > 0) {
				for (let i = items.length - 1; i >= 0; i--) {
					const item = items[i];
					const headingElement = findHeadingElement(editor, item.pos);
					if (headingElement) {
						const rect = headingElement.getBoundingClientRect();
						if (rect.top < containerRect.bottom) {
							activeHeading = item;
							break;
						}
					}
				}
			}

			setActiveId(activeHeading?.id || items[0]?.id || null);
		};

		// Initial update
		updateActiveHeading();

		// Listen for scroll events
		scrollContainer.addEventListener("scroll", updateActiveHeading, { passive: true });

		// Also update on editor changes
		editor.on("update", updateActiveHeading);

		return () => {
			scrollContainer.removeEventListener("scroll", updateActiveHeading);
			editor.off("update", updateActiveHeading);
		};
	}, [editor, items]);

	const scrollToHeading = (item: TocItem) => {
		if (!editor) return;

		// Don't scroll if this heading is already active
		if (activeId === item.id) return;

		const scrollContainer = scrollContainerRef.current;
		const headingElement = findHeadingElement(editor, item.pos);

		if (headingElement && scrollContainer) {
			// Calculate the position to scroll to
			const containerRect = scrollContainer.getBoundingClientRect();
			const headingRect = headingElement.getBoundingClientRect();
			const scrollTop = scrollContainer.scrollTop;

			// Calculate target scroll position (heading at top with some padding)
			const targetScrollTop = scrollTop + headingRect.top - containerRect.top - 170;

			console.log("Scrolling to heading:", item.id, targetScrollTop);

			// Smooth scroll to the heading
			scrollContainer.scrollTo({
				top: Math.max(0, targetScrollTop),
				behavior: "smooth",
			});
		} else if (headingElement) {
			// Fallback: use scrollIntoView
			headingElement.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	};

	const toggleOpen = () => handleSetIsOpen(!isOpen);

	// Don't render if no editor
	if (!editor) return null;

	// ── collapsed ─────────────────────────────────────────────────────────────────
	if (!isOpen) {
		return (
			// Shrink left margin; height fills viewport via the parent sticky wrapper
			<div className="w-8 shrink-0">
				<div className="sticky top-0 h-screen flex flex-col">
					<button
						type="button"
						onClick={toggleOpen}
						className="p-1.5 rounded-lg bg-muted hover:bg-accent transition-colors"
						title="Show Table of Contents"
					>
						<PanelRightOpen className="w-4 h-4" />
					</button>
				</div>
			</div>
		);
	}

	// ── expanded ──────────────────────────────────────────────────────────────────
	return (
		// mr-2 keeps a small gap from the window edge; h-screen + sticky keeps it
		// pinned for the full page height
		<div className="w-52 mr-2 shrink-0">
			<div className="sticky top-0 h-screen flex flex-col border border-border rounded-sm bg-card/95 backdrop-blur-sm shadow-sm overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-3 border-b border-border bg-muted/50 flex-shrink-0">
					<div className="flex items-center gap-2 text-sm font-medium text-foreground">
						<List className="w-4 h-4" />
						<span>Contents</span>
					</div>
					<button
						type="button"
						onClick={toggleOpen}
						className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
						title="Hide Table of Contents"
					>
						<PanelRightClose className="w-4 h-4" />
					</button>
				</div>

				{/* Scrollable content – flex-1 fills remaining height */}
				<div className="flex-1 overflow-y-auto p-2">
					{items.length === 0 ?
						<p className="text-xs text-muted-foreground italic p-2">
							No headings found. Add headings to see the table of contents.
						</p>
					:	<nav>
							<ul className="space-y-0.5">
								{items.map((item) => {
									const isActive = activeId === item.id;
									return (
										<li key={item.id}>
											<button
												type="button"
												onClick={() => scrollToHeading(item)}
												disabled={isActive}
												className={`w-full text-left text-sm py-1.5 px-2 rounded transition-colors truncate ${
													isActive ?
														"bg-accent text-accent-foreground font-medium cursor-default"
													:	"text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
												}`}
												style={{
													paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
												}}
												title={item.text}
											>
												<span
													className={`inline-block w-5 mr-1 text-xs ${
														isActive ? "text-primary" : (
															"text-muted-foreground/50"
														)
													}`}
												>
													H{item.level}
												</span>
												{item.text}
											</button>
										</li>
									);
								})}
							</ul>
						</nav>
					}
				</div>
			</div>
		</div>
	);
};

export default TableOfContentsSidebar;
