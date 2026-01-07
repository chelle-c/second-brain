import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface NotesLayoutProps {
	sidebar: ReactNode;
	content: ReactNode;
	isCollapsed: boolean;
	onToggleCollapse: (collapsed: boolean) => void;
}

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 240;
const COLLAPSE_THRESHOLD = 180;

export function NotesLayout({ sidebar, content, isCollapsed, onToggleCollapse }: NotesLayoutProps) {
	const [sidebarWidth, setSidebarWidth] = useState(() => {
		const saved = localStorage.getItem("notes-sidebar-width");
		return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
	});
	const [isResizing, setIsResizing] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const startXRef = useRef<number>(0);
	const startWidthRef = useRef<number>(0);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsResizing(true);
			startXRef.current = e.clientX;
			startWidthRef.current = sidebarWidth;
		},
		[sidebarWidth]
	);

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			const delta = e.clientX - startXRef.current;
			const newWidth = startWidthRef.current + delta;

			if (newWidth < COLLAPSE_THRESHOLD) {
				onToggleCollapse(true);
			} else if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
				setSidebarWidth(newWidth);
				localStorage.setItem("notes-sidebar-width", newWidth.toString());
				if (isCollapsed) {
					onToggleCollapse(false);
				}
			} else if (newWidth >= MIN_SIDEBAR_WIDTH) {
				setSidebarWidth(MAX_SIDEBAR_WIDTH);
				localStorage.setItem("notes-sidebar-width", MAX_SIDEBAR_WIDTH.toString());
				if (isCollapsed) {
					onToggleCollapse(false);
				}
			}
		};

		const handleMouseUp = () => {
			setIsResizing(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, [isResizing, isCollapsed, onToggleCollapse]);

	useEffect(() => {
		if (!isCollapsed) {
			const saved = localStorage.getItem("notes-sidebar-width");
			if (saved) {
				setSidebarWidth(parseInt(saved, 10));
			}
		}
	}, [isCollapsed]);

	const displayWidth = isCollapsed ? 48 : sidebarWidth;

	return (
		<div className="flex h-full w-full overflow-hidden">
			<aside
				ref={sidebarRef}
				className="border-r border-border bg-muted shrink-0 h-full overflow-hidden relative"
				style={{
					width: `${displayWidth}px`,
					transition: isResizing ? "none" : "width 200ms ease",
				}}
				aria-label="Folder navigation"
			>
				{sidebar}

				{!isCollapsed && (
					<div
						className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
						onMouseDown={handleMouseDown}
						style={{
							touchAction: "none",
						}}
					/>
				)}
			</aside>

			<main className="flex-1 h-full overflow-hidden transition-all duration-200">
				{content}
			</main>
		</div>
	);
}
