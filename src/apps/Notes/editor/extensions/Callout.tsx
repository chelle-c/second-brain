import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb } from "lucide-react";

export type CalloutType = "info" | "warning" | "success" | "error" | "tip";

interface CalloutOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		callout: {
			setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
			toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
		};
	}
}

const CalloutComponent = ({ node, updateAttributes }: NodeViewProps) => {
	const type = (node.attrs.type as CalloutType) || "info";

	const icons: Record<CalloutType, React.ReactNode> = {
		info: <Info className="w-5 h-5" />,
		warning: <AlertTriangle className="w-5 h-5" />,
		success: <CheckCircle className="w-5 h-5" />,
		error: <AlertCircle className="w-5 h-5" />,
		tip: <Lightbulb className="w-5 h-5" />,
	};

	const styles: Record<CalloutType, string> = {
		info: "bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400",
		warning: "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400",
		success: "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400",
		error: "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400",
		tip: "bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400",
	};

	const types: CalloutType[] = ["info", "warning", "success", "error", "tip"];

	return (
		<NodeViewWrapper>
			<div className={`callout flex gap-3 p-4 my-2 rounded-lg border-l-4 ${styles[type]}`}>
				<div className="flex items-center shrink-0 pt-0.5">
					<button
						type="button"
						onClick={() => {
							const currentIndex = types.indexOf(type);
							const nextIndex = (currentIndex + 1) % types.length;
							updateAttributes({ type: types[nextIndex] });
						}}
						className="hover:opacity-70 transition-opacity"
						contentEditable={false}
					>
						{icons[type]}
					</button>
				</div>
				<NodeViewContent className="callout-content flex-1 min-w-0" />
			</div>
		</NodeViewWrapper>
	);
};

export const Callout = Node.create<CalloutOptions>({
	name: "callout",
	group: "block",
	content: "block+",
	defining: true,

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			type: {
				default: "info",
				parseHTML: (element: HTMLElement) => element.getAttribute("data-callout-type") || "info",
				renderHTML: (attributes: Record<string, unknown>) => ({
					"data-callout-type": attributes.type,
				}),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="callout"]',
			},
		];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
		return ["div", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-type": "callout" }), 0];
	},

	addNodeView() {
		return ReactNodeViewRenderer(CalloutComponent);
	},

	addCommands() {
		return {
			setCallout:
				(attributes) =>
				({ commands }) => {
					return commands.wrapIn(this.name, attributes);
				},
			toggleCallout:
				(attributes) =>
				({ commands }) => {
					return commands.toggleWrap(this.name, attributes);
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			"Mod-Shift-c": () => this.editor.commands.toggleCallout(),
		};
	},
});

export default Callout;
