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
// Stable, index-based IDs so typing above a heading doesn't churn IDs (no flicker).
const getHeadings = (editor: Editor): TocItem[] => {
	const items: TocItem[] = [];
	const { doc } = editor.state;
	let index = 0;
	doc.descendants((node, pos) => {
		if (node.type.name === "heading") {
			const level = node.attrs.level as number;
			const text = node.textContent;
			if (text) {
				items.push({ id: `heading-${index}`, level, text, pos });
				index++;
			}
		}
	});
	return items;
};
const findHeadingElement = (editor: Editor, pos: number): HTMLElement | null => {
	try {
		const { view } = editor;
		const nodeDOM = view.nodeDOM(pos);
		if (nodeDOM instanceof HTMLElement) return nodeDOM;
		const domAtPos = view.domAtPos(pos);
		if (domAtPos.node) {
			const element =
				domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement;
			if (element) {
				const heading = element.closest("h1, h2, h3, h4, h5, h6");
				if (heading instanceof HTMLElement) return heading;
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
	useEffect(() => {
		localStorage.setItem("notes-toc-open", isOpen.toString());
	}, [isOpen]);
	const updateHeadings = useCallback(() => {
		if (editor) setItems(getHeadings(editor));
	}, [editor]);
	useEffect(() => {
		if (!editor) return;
		updateHeadings();
		editor.on("update", updateHeadings);
		return () => {
			editor.off("update", updateHeadings);
		};
	}, [editor, updateHeadings]);
	useEffect(() => {
		if (!editor) return;
		const editorElement = editor.view.dom;
		scrollContainerRef.current =
			editorElement.closest(".overflow-y-auto") ||
			editorElement.closest("[class*='overflow']") ||
			document.querySelector(".h-full.overflow-y-auto");
	}, [editor]);
	useEffect(() => {
		if (!editor || items.length === 0) return;
		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) return;
		const updateActiveHeading = () => {
			const containerRect = scrollContainer.getBoundingClientRect();
			const containerTop = containerRect.top;
			let activeHeading: TocItem | null = null;
			let closestDistance = Infinity;
			for (const item of items) {
				const el = findHeadingElement(editor, item.pos);
				if (!el) continue;
				const rect = el.getBoundingClientRect();
				const distanceFromTop = rect.top - containerTop;
				if (distanceFromTop <= 50) {
					if (distanceFromTop > -rect.height) {
						const absDistance = Math.abs(distanceFromTop);
						if (absDistance < closestDistance || distanceFromTop <= 0) {
							closestDistance = absDistance;
							activeHeading = item;
						}
					}
				} else if (!activeHeading) {
					activeHeading = item;
					break;
				}
			}
			if (!activeHeading && items.length > 0) {
				for (let i = items.length - 1; i >= 0; i--) {
					const item = items[i];
					const el = findHeadingElement(editor, item.pos);
					if (el) {
						const rect = el.getBoundingClientRect();
						if (rect.top < containerRect.bottom) {
							activeHeading = item;
							break;
						}
					}
				}
			}
			setActiveId(activeHeading?.id || items[0]?.id || null);
		};
		updateActiveHeading();
		scrollContainer.addEventListener("scroll", updateActiveHeading, { passive: true });
		editor.on("update", updateActiveHeading);
		return () => {
			scrollContainer.removeEventListener("scroll", updateActiveHeading);
			editor.off("update", updateActiveHeading);
		};
	}, [editor, items]);
	const scrollToHeading = (item: TocItem) => {
		if (!editor) return;
		if (activeId === item.id) return;
		const scrollContainer = scrollContainerRef.current;
		const headingElement = findHeadingElement(editor, item.pos);
		if (headingElement && scrollContainer) {
			const containerRect = scrollContainer.getBoundingClientRect();
			const headingRect = headingElement.getBoundingClientRect();
			const scrollTop = scrollContainer.scrollTop;
			const targetScrollTop = scrollTop + headingRect.top - containerRect.top - 24;
			scrollContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
		} else if (headingElement) {
			headingElement.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const toggleOpen = () => setIsOpen((v) => !v);

	if (!editor) return null;

	if (!isOpen) {
		return (
			<div className="shrink-0 h-full">
				<div className="h-full flex flex-col border border-border rounded-none rounded-br-xl bg-card/95 backdrop-blur-sm shadow-sm overflow-hidden">
					<div className="flex items-center justify-center p-3 border-b border-border bg-muted/50 shrink-0">
						<button
							type="button"
							onClick={toggleOpen}
							className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
							title="Show Table of Contents"
						>
							<PanelRightOpen className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-52 shrink-0 h-full">
			<div className="h-full flex flex-col border border-border rounded-none rounded-br-xl bg-card/95 backdrop-blur-sm shadow-sm overflow-hidden">
				<div className="flex items-center justify-between p-3 border-b border-border bg-muted/50 shrink-0">
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
				<div className="flex-1 overflow-y-auto p-2">
					{items.length === 0 ? (
						<p className="text-xs text-muted-foreground italic p-2">
							No headings found. Add headings to see the table of
							contents.
						</p>
					) : (
						<nav>
							<ul className="space-y-0.5">
								{items.map((item) => {
									const isActive = activeId === item.id;
									return (
										<li key={item.id}>
											<button
												type="button"
												onClick={() =>
													scrollToHeading(item)
												}
												disabled={isActive}
												className={`w-full text-left text-sm py-1.5 px-2 rounded transition-colors truncate ${
													isActive
														? "bg-accent text-accent-foreground font-medium cursor-default"
														: "text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
												}`}
												style={{
													paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
												}}
												title={item.text}
											>
												<span
													className={`inline-block w-5 mr-1 text-xs ${
														isActive
															? "text-primary"
															: "text-muted-foreground/50"
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
					)}
				</div>
			</div>
		</div>
	);
};
export default TableOfContentsSidebar;