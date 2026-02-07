import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Code,
	Link,
	Unlink,
	Palette,
	PaintBucket,
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify,
	Undo,
	Redo,
	ChevronDown,
	ListTodo, // ← new: task-list icon
	List, // ← new: bullet-list icon
} from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";

interface BubbleMenuBarProps {
	editor: Editor;
}

// Predefined colors for the color picker
// Each color has light and dark variants - we show appropriate one based on theme
const TEXT_COLORS = [
	{ name: "Default", light: "", dark: "" },
	{ name: "Gray", light: "#6B7280", dark: "#9CA3AF" },
	{ name: "Red", light: "#DC2626", dark: "#F87171" },
	{ name: "Orange", light: "#EA580C", dark: "#FB923C" },
	{ name: "Yellow", light: "#CA8A04", dark: "#FACC15" },
	{ name: "Green", light: "#16A34A", dark: "#4ADE80" },
	{ name: "Blue", light: "#2563EB", dark: "#60A5FA" },
	{ name: "Purple", light: "#9333EA", dark: "#A78BFA" },
	{ name: "Pink", light: "#DB2777", dark: "#F472B6" },
	{ name: "Cyan", light: "#0891B2", dark: "#22D3EE" },
];

const HIGHLIGHT_COLORS = [
	{ name: "None", light: "", dark: "" },
	{ name: "Yellow", light: "#FEF08A", dark: "#854D0E" },
	{ name: "Green", light: "#BBF7D0", dark: "#166534" },
	{ name: "Blue", light: "#BFDBFE", dark: "#1E40AF" },
	{ name: "Purple", light: "#DDD6FE", dark: "#5B21B6" },
	{ name: "Pink", light: "#FBCFE8", dark: "#9D174D" },
	{ name: "Orange", light: "#FED7AA", dark: "#9A3412" },
	{ name: "Red", light: "#FECACA", dark: "#991B1B" },
	{ name: "Gray", light: "#E5E7EB", dark: "#374151" },
	{ name: "Cyan", light: "#A5F3FC", dark: "#155E75" },
];

// Check if dark mode is active
const isDarkMode = () => {
	return document.documentElement.classList.contains("dark");
};

const FONT_FAMILIES = [
	{ name: "Default", value: "" },
	{ name: "Sans Serif", value: "Inter, system-ui, sans-serif" },
	{ name: "Serif", value: "Georgia, serif" },
	{ name: "Mono", value: "ui-monospace, monospace" },
];

export const BubbleMenuBar = ({ editor }: BubbleMenuBarProps) => {
	const [showLinkInput, setShowLinkInput] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showHighlightPicker, setShowHighlightPicker] = useState(false);
	const [showAlignMenu, setShowAlignMenu] = useState(false);
	const [showFontMenu, setShowFontMenu] = useState(false);

	const colorPickerRef = useRef<HTMLDivElement>(null);
	const highlightPickerRef = useRef<HTMLDivElement>(null);
	const alignMenuRef = useRef<HTMLDivElement>(null);
	const fontMenuRef = useRef<HTMLDivElement>(null);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
				setShowColorPicker(false);
			}
			if (highlightPickerRef.current && !highlightPickerRef.current.contains(event.target as Node)) {
				setShowHighlightPicker(false);
			}
			if (alignMenuRef.current && !alignMenuRef.current.contains(event.target as Node)) {
				setShowAlignMenu(false);
			}
			if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
				setShowFontMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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

	const setColor = useCallback(
		(colorObj: { light: string; dark: string }) => {
			const color = isDarkMode() ? colorObj.dark : colorObj.light;
			if (color) {
				editor.chain().focus().setColor(color).run();
			} else {
				editor.chain().focus().unsetColor().run();
			}
			setShowColorPicker(false);
		},
		[editor]
	);

	const setHighlight = useCallback(
		(colorObj: { light: string; dark: string }) => {
			const color = isDarkMode() ? colorObj.dark : colorObj.light;
			if (color) {
				editor.chain().focus().setHighlight({ color }).run();
			} else {
				editor.chain().focus().unsetHighlight().run();
			}
			setShowHighlightPicker(false);
		},
		[editor]
	);

	const setFontFamily = useCallback(
		(fontFamily: string) => {
			if (fontFamily) {
				editor.chain().focus().setFontFamily(fontFamily).run();
			} else {
				editor.chain().focus().unsetFontFamily().run();
			}
			setShowFontMenu(false);
		},
		[editor]
	);

	const setTextAlign = useCallback(
		(align: "left" | "center" | "right" | "justify") => {
			editor.chain().focus().setTextAlign(align).run();
			setShowAlignMenu(false);
		},
		[editor]
	);

	const getCurrentColor = () => {
		const color = editor.getAttributes("textStyle").color;
		return color || "";
	};

	const getCurrentHighlight = () => {
		const highlight = editor.getAttributes("highlight").color;
		return highlight || "";
	};

	const getCurrentAlignment = () => {
		if (editor.isActive({ textAlign: "center" })) return "center";
		if (editor.isActive({ textAlign: "right" })) return "right";
		if (editor.isActive({ textAlign: "justify" })) return "justify";
		return "left";
	};

	const AlignIcon = () => {
		const align = getCurrentAlignment();
		switch (align) {
			case "center":
				return <AlignCenter className="w-4 h-4" />;
			case "right":
				return <AlignRight className="w-4 h-4" />;
			case "justify":
				return <AlignJustify className="w-4 h-4" />;
			default:
				return <AlignLeft className="w-4 h-4" />;
		}
	};

	if (!editor) {
		return null;
	}

	return (
		<BubbleMenu
			editor={editor}
			className="flex items-center gap-0.5 p-1 rounded-lg border border-border bg-popover shadow-lg"
		>
			{showLinkInput ?
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
			:	<>
					{/* Undo/Redo */}
					<ToolbarButton
						onClick={() => editor.chain().focus().undo().run()}
						isActive={false}
						title="Undo (Ctrl+Z)"
						disabled={!editor.can().undo()}
					>
						<Undo className="w-4 h-4" />
					</ToolbarButton>

					<ToolbarButton
						onClick={() => editor.chain().focus().redo().run()}
						isActive={false}
						title="Redo (Ctrl+Y)"
						disabled={!editor.can().redo()}
					>
						<Redo className="w-4 h-4" />
					</ToolbarButton>

					<Divider />

					{/* Text formatting */}
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

					<Divider />

					{/* Text Color */}
					<div className="relative" ref={colorPickerRef}>
						<ToolbarButton
							onClick={() => {
								setShowColorPicker(!showColorPicker);
								setShowHighlightPicker(false);
								setShowAlignMenu(false);
								setShowFontMenu(false);
							}}
							isActive={showColorPicker || !!getCurrentColor()}
							title="Text Color"
						>
							<div className="flex items-center gap-0.5">
								<Palette className="w-4 h-4" />
								<div
									className="w-3 h-0.5 rounded-full"
									style={{ backgroundColor: getCurrentColor() || "currentColor" }}
								/>
							</div>
						</ToolbarButton>
						{showColorPicker && (
							<ColorPicker
								colors={TEXT_COLORS}
								currentColor={getCurrentColor()}
								onSelect={setColor}
								isDark={isDarkMode()}
							/>
						)}
					</div>

					{/* Highlight Color */}
					<div className="relative" ref={highlightPickerRef}>
						<ToolbarButton
							onClick={() => {
								setShowHighlightPicker(!showHighlightPicker);
								setShowColorPicker(false);
								setShowAlignMenu(false);
								setShowFontMenu(false);
							}}
							isActive={showHighlightPicker || editor.isActive("highlight")}
							title="Background Color"
						>
							<div className="flex items-center gap-0.5">
								<PaintBucket className="w-4 h-4" />
								<div
									className="w-3 h-0.5 rounded-full"
									style={{
										backgroundColor: getCurrentHighlight() || "transparent",
									}}
								/>
							</div>
						</ToolbarButton>
						{showHighlightPicker && (
							<ColorPicker
								colors={HIGHLIGHT_COLORS}
								currentColor={getCurrentHighlight()}
								onSelect={setHighlight}
								isDark={isDarkMode()}
							/>
						)}
					</div>

					<Divider />

					{/* Font Family */}
					<div className="relative" ref={fontMenuRef}>
						<ToolbarButton
							onClick={() => {
								setShowFontMenu(!showFontMenu);
								setShowColorPicker(false);
								setShowHighlightPicker(false);
								setShowAlignMenu(false);
							}}
							isActive={showFontMenu}
							title="Font Family"
						>
							<div className="flex items-center gap-0.5">
								<span className="text-xs font-medium">Aa</span>
								<ChevronDown className="w-3 h-3" />
							</div>
						</ToolbarButton>
						{showFontMenu && (
							<div className="absolute top-full left-0 mt-1 py-1 min-w-32 rounded-lg border border-border bg-popover shadow-lg z-50">
								{FONT_FAMILIES.map((font) => (
									<button
										key={font.name}
										type="button"
										onClick={() => setFontFamily(font.value)}
										className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
										style={{ fontFamily: font.value || "inherit" }}
									>
										{font.name}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Text Alignment */}
					<div className="relative" ref={alignMenuRef}>
						<ToolbarButton
							onClick={() => {
								setShowAlignMenu(!showAlignMenu);
								setShowColorPicker(false);
								setShowHighlightPicker(false);
								setShowFontMenu(false);
							}}
							isActive={showAlignMenu}
							title="Text Alignment"
						>
							<div className="flex items-center gap-0.5">
								<AlignIcon />
								<ChevronDown className="w-3 h-3" />
							</div>
						</ToolbarButton>
						{showAlignMenu && (
							<div className="absolute top-full left-0 mt-1 py-1 rounded-lg border border-border bg-popover shadow-lg z-50">
								<button
									type="button"
									onClick={() => setTextAlign("left")}
									className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
										getCurrentAlignment() === "left" ? "bg-accent" : ""
									}`}
								>
									<AlignLeft className="w-4 h-4" />
									<span>Left</span>
								</button>
								<button
									type="button"
									onClick={() => setTextAlign("center")}
									className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
										getCurrentAlignment() === "center" ? "bg-accent" : ""
									}`}
								>
									<AlignCenter className="w-4 h-4" />
									<span>Center</span>
								</button>
								<button
									type="button"
									onClick={() => setTextAlign("right")}
									className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
										getCurrentAlignment() === "right" ? "bg-accent" : ""
									}`}
								>
									<AlignRight className="w-4 h-4" />
									<span>Right</span>
								</button>
								<button
									type="button"
									onClick={() => setTextAlign("justify")}
									className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
										getCurrentAlignment() === "justify" ? "bg-accent" : ""
									}`}
								>
									<AlignJustify className="w-4 h-4" />
									<span>Justify</span>
								</button>
							</div>
						)}
					</div>

					<Divider />

					{/* Link */}
					{editor.isActive("link") ?
						<ToolbarButton onClick={removeLink} isActive={false} title="Remove Link">
							<Unlink className="w-4 h-4" />
						</ToolbarButton>
					:	<ToolbarButton onClick={openLinkInput} isActive={false} title="Add Link">
							<Link className="w-4 h-4" />
						</ToolbarButton>
					}

					<Divider />

					{/* Bullet ↔ Task list toggle */}
					<ToolbarButton
						onClick={() => {
							if (editor.isActive("taskList")) {
								// Convert task list → bullet list
								// Two separate transactions so the second operates on committed state
								editor.chain().focus().toggleTaskList().run();
								editor.chain().focus().toggleBulletList().run();
							} else if (editor.isActive("bulletList")) {
								// Convert bullet list → task list
								editor.chain().focus().toggleBulletList().run();
								editor.chain().focus().toggleTaskList().run();
							} else {
								// Neither active – start a task list
								editor.chain().focus().toggleTaskList().run();
							}
						}}
						isActive={editor.isActive("taskList") || editor.isActive("bulletList")}
						title={
							editor.isActive("taskList") ? "Convert to bullet list"
							: editor.isActive("bulletList") ?
								"Convert to task list"
							:	"Toggle task list"
						}
					>
						{editor.isActive("taskList") ?
							<List className="w-4 h-4" />
						:	<ListTodo className="w-4 h-4" />}
					</ToolbarButton>
				</>
			}
		</BubbleMenu>
	);
};

const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

const ToolbarButton = ({
	onClick,
	isActive,
	title,
	children,
	disabled = false,
}: {
	onClick: () => void;
	isActive: boolean;
	title: string;
	children: React.ReactNode;
	disabled?: boolean;
}) => (
	<button
		type="button"
		onClick={onClick}
		title={title}
		disabled={disabled}
		className={`p-1.5 rounded hover:bg-accent transition-colors ${
			isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
		} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
	>
		{children}
	</button>
);

const ColorPicker = ({
	colors,
	currentColor,
	onSelect,
	isDark,
}: {
	colors: { name: string; light: string; dark: string }[];
	currentColor: string;
	onSelect: (color: { light: string; dark: string }) => void;
	isDark: boolean;
}) => (
	<div className="absolute top-full left-0 mt-1 p-2 rounded-lg border border-border bg-popover shadow-lg z-50 min-w-[180px]">
		<div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 28px)" }}>
			{colors.map((color) => {
				const displayColor = isDark ? color.dark : color.light;
				const isSelected = currentColor === displayColor || (currentColor === "" && displayColor === "");
				return (
					<button
						key={color.name}
						type="button"
						onClick={() => onSelect({ light: color.light, dark: color.dark })}
						title={color.name}
						className={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
							isSelected ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-muted-foreground/30"
						}`}
						style={{
							backgroundColor: displayColor || "transparent",
							backgroundImage: !displayColor
								? "linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)"
								: undefined,
							backgroundSize: !displayColor ? "6px 6px" : undefined,
							backgroundPosition: !displayColor ? "0 0, 0 3px, 3px -3px, -3px 0px" : undefined,
						}}
					/>
				);
			})}
		</div>
	</div>
);

export default BubbleMenuBar;
