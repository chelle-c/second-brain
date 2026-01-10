import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Code,
	Highlighter,
	Link,
	Unlink,
} from "lucide-react";
import { useCallback, useState } from "react";

interface BubbleMenuBarProps {
	editor: Editor;
}

export const BubbleMenuBar = ({ editor }: BubbleMenuBarProps) => {
	const [showLinkInput, setShowLinkInput] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");

	const setLink = useCallback(() => {
		if (linkUrl) {
			editor
				.chain()
				.focus()
				.extendMarkRange("link")
				.setLink({ href: linkUrl })
				.run();
		}
		setShowLinkInput(false);
		setLinkUrl("");
	}, [editor, linkUrl]);

	const removeLink = useCallback(() => {
		editor.chain().focus().unsetLink().run();
	}, [editor]);

	const openLinkInput = useCallback(() => {
		const previousUrl = editor.getAttributes("link").href || "";
		setLinkUrl(previousUrl);
		setShowLinkInput(true);
	}, [editor]);

	if (!editor) {
		return null;
	}

	return (
		<BubbleMenu
			editor={editor}
			className="flex items-center gap-0.5 p-1 rounded-lg border border-border bg-popover shadow-lg"
		>
			{showLinkInput ? (
				<div className="flex items-center gap-1 px-1">
					<input
						type="url"
						placeholder="Enter URL..."
						value={linkUrl}
						onChange={(e) => setLinkUrl(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								setLink();
							}
							if (e.key === "Escape") {
								setShowLinkInput(false);
								setLinkUrl("");
							}
						}}
						className="w-48 px-2 py-1 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
						autoFocus
					/>
					<button
						type="button"
						onClick={setLink}
						className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
					>
						Set
					</button>
					<button
						type="button"
						onClick={() => {
							setShowLinkInput(false);
							setLinkUrl("");
						}}
						className="px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
					>
						Cancel
					</button>
				</div>
			) : (
				<>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBold().run()}
						isActive={editor.isActive("bold")}
						title="Bold (Ctrl+B)"
					>
						<Bold className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleItalic().run()}
						isActive={editor.isActive("italic")}
						title="Italic (Ctrl+I)"
					>
						<Italic className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						isActive={editor.isActive("underline")}
						title="Underline (Ctrl+U)"
					>
						<Underline className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleStrike().run()}
						isActive={editor.isActive("strike")}
						title="Strikethrough"
					>
						<Strikethrough className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleCode().run()}
						isActive={editor.isActive("code")}
						title="Inline Code"
					>
						<Code className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().toggleHighlight().run()}
						isActive={editor.isActive("highlight")}
						title="Highlight"
					>
						<Highlighter className="w-4 h-4" />
					</ToolbarButton>

					<div className="w-px h-5 bg-border mx-1" />

					{editor.isActive("link") ? (
						<ToolbarButton onClick={removeLink} isActive={false} title="Remove Link">
							<Unlink className="w-4 h-4" />
						</ToolbarButton>
					) : (
						<ToolbarButton onClick={openLinkInput} isActive={false} title="Add Link">
							<Link className="w-4 h-4" />
						</ToolbarButton>
					)}
				</>
			)}
		</BubbleMenu>
	);
};

const ToolbarButton = ({
	onClick,
	isActive,
	title,
	children,
}: {
	onClick: () => void;
	isActive: boolean;
	title: string;
	children: React.ReactNode;
}) => (
	<button
		type="button"
		onClick={onClick}
		title={title}
		className={`p-1.5 rounded hover:bg-accent transition-colors ${
			isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
		}`}
	>
		{children}
	</button>
);

export default BubbleMenuBar;
