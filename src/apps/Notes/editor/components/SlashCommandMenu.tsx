import { Extension, type Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
	useCallback,
} from "react";
import {
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	CheckSquare,
	Quote,
	Code,
	Table,
	Image,
	Minus,
	MessageSquare,
	Link,
	type LucideIcon,
} from "lucide-react";

interface CommandItem {
	title: string;
	description: string;
	icon: LucideIcon;
	command: (props: { editor: Editor; range: { from: number; to: number } }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = any;

const getSuggestionItems = (): CommandItem[] => [
	{
		title: "Heading 1",
		description: "Large section heading",
		icon: Heading1,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
		},
	},
	{
		title: "Heading 2",
		description: "Medium section heading",
		icon: Heading2,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
		},
	},
	{
		title: "Heading 3",
		description: "Small section heading",
		icon: Heading3,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
		},
	},
	{
		title: "Bullet List",
		description: "Create a simple bullet list",
		icon: List,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		},
	},
	{
		title: "Numbered List",
		description: "Create a numbered list",
		icon: ListOrdered,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		},
	},
	{
		title: "Task List",
		description: "Create a todo list with checkboxes",
		icon: CheckSquare,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleTaskList().run();
		},
	},
	{
		title: "Quote",
		description: "Create a block quote",
		icon: Quote,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBlockquote().run();
		},
	},
	{
		title: "Code Block",
		description: "Add a code block",
		icon: Code,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
		},
	},
	{
		title: "Callout",
		description: "Add a callout block",
		icon: MessageSquare,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setCallout().run();
		},
	},
	{
		title: "Table",
		description: "Insert a table",
		icon: Table,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
		},
	},
	{
		title: "Image",
		description: "Upload or embed an image",
		icon: Image,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).run();
			// Trigger image upload dialog
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/*";
			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = () => {
						const base64 = reader.result as string;
						editor.chain().focus().setImage({ src: base64 }).run();
					};
					reader.readAsDataURL(file);
				}
			};
			input.click();
		},
	},
	{
		title: "Divider",
		description: "Add a horizontal divider",
		icon: Minus,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setHorizontalRule().run();
		},
	},
	{
		title: "Link Preview",
		description: "Embed a link with preview",
		icon: Link,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).setLinkPreview().run();
		},
	},
];

interface CommandListRef {
	onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface CommandListProps {
	items: CommandItem[];
	command: (item: CommandItem) => void;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
	({ items, command }, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0);

		const selectItem = useCallback(
			(index: number) => {
				const item = items[index];
				if (item) {
					command(item);
				}
			},
			[items, command]
		);

		useEffect(() => {
			setSelectedIndex(0);
		}, [items]);

		useImperativeHandle(ref, () => ({
			onKeyDown: ({ event }: { event: KeyboardEvent }) => {
				if (event.key === "ArrowUp") {
					setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
					return true;
				}

				if (event.key === "ArrowDown") {
					setSelectedIndex((prev) => (prev + 1) % items.length);
					return true;
				}

				if (event.key === "Enter") {
					selectItem(selectedIndex);
					return true;
				}

				return false;
			},
		}));

		if (items.length === 0) {
			return (
				<div className="p-2 text-sm text-muted-foreground">No results found</div>
			);
		}

		return (
			<div className="w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
				{items.map((item, index) => {
					const Icon = item.icon;
					return (
						<button
							key={item.title}
							type="button"
							onClick={() => selectItem(index)}
							className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
								index === selectedIndex
									? "bg-accent text-accent-foreground"
									: "hover:bg-accent/50"
							}`}
						>
							<div className="shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted">
								<Icon className="w-4 h-4" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium">{item.title}</div>
								<div className="text-xs text-muted-foreground truncate">
									{item.description}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		);
	}
);

CommandList.displayName = "CommandList";

const renderItems = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let component: ReactRenderer<CommandListRef, any> | null = null;
	let popup: TippyInstance[] | null = null;

	return {
		onStart: (props: {
			editor: AnyEditor;
			clientRect: (() => DOMRect | null) | null;
		}) => {
			component = new ReactRenderer(CommandList, {
				props,
				editor: props.editor,
			});

			if (!props.clientRect) {
				return;
			}

			popup = tippy("body", {
				getReferenceClientRect: props.clientRect as () => DOMRect,
				appendTo: () => document.body,
				content: component.element,
				showOnCreate: true,
				interactive: true,
				trigger: "manual",
				placement: "bottom-start",
			});
		},

		onUpdate(props: { clientRect: (() => DOMRect | null) | null }) {
			component?.updateProps(props);

			if (!props.clientRect) {
				return;
			}

			popup?.[0]?.setProps({
				getReferenceClientRect: props.clientRect as () => DOMRect,
			});
		},

		onKeyDown(props: { event: KeyboardEvent }) {
			if (props.event.key === "Escape") {
				popup?.[0]?.hide();
				return true;
			}

			return component?.ref?.onKeyDown(props) ?? false;
		},

		onExit() {
			// Check if popup exists and hasn't been destroyed
			if (popup?.[0] && !popup[0].state.isDestroyed) {
				popup[0].destroy();
			}
			popup = null;
			component?.destroy();
			component = null;
		},
	};
};

export const SlashCommands = Extension.create({
	name: "slashCommands",

	addOptions() {
		return {
			suggestion: {
				char: "/",
				command: ({
					editor,
					range,
					props,
				}: {
					editor: AnyEditor;
					range: { from: number; to: number };
					props: CommandItem;
				}) => {
					props.command({ editor, range });
				},
			} as Partial<SuggestionOptions>,
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion,
				items: ({ query }: { query: string }) => {
					return getSuggestionItems().filter((item) =>
						item.title.toLowerCase().includes(query.toLowerCase())
					);
				},
				render: renderItems,
			}),
		];
	},
});

export default SlashCommands;
