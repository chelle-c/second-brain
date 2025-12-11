import { ReactNode } from "react";

interface NotesLayoutProps {
	sidebar: ReactNode;
	content: ReactNode;
	showSidebar?: boolean;
}

export function NotesLayout({ sidebar, content, showSidebar = true }: NotesLayoutProps) {
	return (
		<div className="flex h-full w-full overflow-hidden">
			{/* Secondary sidebar for folders - hidden when showSidebar is false */}
			{showSidebar && (
				<div className="w-60 min-w-60 max-w-60 border-r border-border bg-muted dark:bg-background/50 backdrop-blur-sm shrink-0 h-full overflow-hidden">
					<div className="h-full overflow-y-auto overflow-x-hidden">{sidebar}</div>
				</div>
			)}

			{/* Main content area */}
			<div className="flex-1 h-full overflow-hidden">{content}</div>
		</div>
	);
}
