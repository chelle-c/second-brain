import type { JSONContent } from "@tiptap/react";

// Yoopta block structure (simplified)
interface YooptaBlock {
	id: string;
	type: string;
	meta: {
		order: number;
		depth: number;
	};
	value: YooptaNode[];
}

interface YooptaNode {
	id: string;
	type: string;
	children: YooptaChild[];
	props?: Record<string, unknown>;
}

interface YooptaChild {
	text?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	code?: boolean;
	highlight?: boolean;
	type?: string;
	props?: Record<string, unknown>;
	children?: YooptaChild[];
}

type YooptaContent = Record<string, YooptaBlock>;

// Convert Yoopta marks to Tiptap marks
const convertMarks = (child: YooptaChild): JSONContent["marks"] => {
	const marks: JSONContent["marks"] = [];

	if (child.bold) marks.push({ type: "bold" });
	if (child.italic) marks.push({ type: "italic" });
	if (child.underline) marks.push({ type: "underline" });
	if (child.strike) marks.push({ type: "strike" });
	if (child.code) marks.push({ type: "code" });
	if (child.highlight) marks.push({ type: "highlight" });

	return marks.length > 0 ? marks : undefined;
};

// Convert Yoopta children to Tiptap content
const convertChildren = (children: YooptaChild[]): JSONContent[] => {
	const result: JSONContent[] = [];

	for (const child of children) {
		// Handle link elements
		if (child.type === "link" && child.props?.url) {
			const linkContent: JSONContent = {
				type: "text",
				text: child.children?.[0]?.text || (child.props.url as string),
				marks: [
					{
						type: "link",
						attrs: {
							href: child.props.url,
							target: "_blank",
						},
					},
				],
			};
			result.push(linkContent);
			continue;
		}

		// Handle regular text - skip empty text nodes as Tiptap doesn't allow them
		if (child.text !== undefined && child.text !== "") {
			const textNode: JSONContent = {
				type: "text",
				text: child.text,
			};

			const marks = convertMarks(child);
			if (marks) {
				textNode.marks = marks;
			}

			result.push(textNode);
		}
	}

	// Return empty array if no content - Tiptap doesn't allow empty text nodes
	return result;
};

// Convert Yoopta block type to Tiptap node type
const convertBlockType = (block: YooptaBlock): JSONContent | null => {
	const type = block.type;
	const node = block.value?.[0];

	if (!node) return null;

	switch (type) {
		case "Paragraph": {
			const paragraphContent = convertChildren(node.children || []);
			return {
				type: "paragraph",
				...(paragraphContent.length > 0 && { content: paragraphContent }),
			};
		}

		case "HeadingOne": {
			const h1Content = convertChildren(node.children || []);
			return {
				type: "heading",
				attrs: { level: 1 },
				...(h1Content.length > 0 && { content: h1Content }),
			};
		}

		case "HeadingTwo": {
			const h2Content = convertChildren(node.children || []);
			return {
				type: "heading",
				attrs: { level: 2 },
				...(h2Content.length > 0 && { content: h2Content }),
			};
		}

		case "HeadingThree": {
			const h3Content = convertChildren(node.children || []);
			return {
				type: "heading",
				attrs: { level: 3 },
				...(h3Content.length > 0 && { content: h3Content }),
			};
		}

		case "Blockquote": {
			const bqContent = convertChildren(node.children || []);
			return {
				type: "blockquote",
				content: [
					{
						type: "paragraph",
						...(bqContent.length > 0 && { content: bqContent }),
					},
				],
			};
		}

		case "BulletedList":
			return {
				type: "bulletList",
				content: block.value.map((item) => {
					const itemContent = convertChildren(item.children || []);
					return {
						type: "listItem",
						content: [
							{
								type: "paragraph",
								...(itemContent.length > 0 && { content: itemContent }),
							},
						],
					};
				}),
			};

		case "NumberedList":
			return {
				type: "orderedList",
				content: block.value.map((item) => {
					const itemContent = convertChildren(item.children || []);
					return {
						type: "listItem",
						content: [
							{
								type: "paragraph",
								...(itemContent.length > 0 && { content: itemContent }),
							},
						],
					};
				}),
			};

		case "TodoList":
			return {
				type: "taskList",
				content: block.value.map((item) => {
					const itemContent = convertChildren(item.children || []);
					return {
						type: "taskItem",
						attrs: { checked: item.props?.checked || false },
						content: [
							{
								type: "paragraph",
								...(itemContent.length > 0 && { content: itemContent }),
							},
						],
					};
				}),
			};

		case "Code": {
			const codeText = node.children?.map((c) => c.text || "").join("\n") || "";
			return {
				type: "codeBlock",
				attrs: { language: (node.props?.language as string) || null },
				...(codeText && { content: [{ type: "text", text: codeText }] }),
			};
		}

		case "Callout": {
			const calloutContent = convertChildren(node.children || []);
			return {
				type: "callout",
				attrs: { type: (node.props?.type as string) || "info" },
				content: [
					{
						type: "paragraph",
						...(calloutContent.length > 0 && { content: calloutContent }),
					},
				],
			};
		}

		case "Divider":
			return {
				type: "horizontalRule",
			};

		case "Image":
			return {
				type: "image",
				attrs: {
					src: node.props?.src || "",
					alt: node.props?.alt || "",
				},
			};

		case "Table": {
			// Tables are complex, convert as best we can
			const rows = block.value || [];
			return {
				type: "table",
				content: rows.map((row, rowIndex) => ({
					type: "tableRow",
					content: (row.children || []).map((cell) => {
						const cellContent = convertChildren(cell.children || []);
						return {
							type: rowIndex === 0 ? "tableHeader" : "tableCell",
							content: [
								{
									type: "paragraph",
									...(cellContent.length > 0 && { content: cellContent }),
								},
							],
						};
					}),
				})),
			};
		}

		case "LinkPreview":
			return {
				type: "linkPreview",
				attrs: {
					url: node.props?.url || "",
					title: node.props?.title || null,
					description: node.props?.description || null,
					image: node.props?.image || null,
				},
			};

		case "Embed":
			// Convert embeds to link previews or paragraphs with links
			const embedUrl = node.props?.url || node.props?.src || "";
			if (embedUrl) {
				return {
					type: "linkPreview",
					attrs: { url: embedUrl },
				};
			}
			return null;

		default: {
			// Unknown type, try to convert as paragraph
			console.warn(`Unknown Yoopta block type: ${type}`);
			if (node.children) {
				const defaultContent = convertChildren(node.children);
				return {
					type: "paragraph",
					...(defaultContent.length > 0 && { content: defaultContent }),
				};
			}
			return null;
		}
	}
};

// Main conversion function
export const convertYooptaToTiptap = (yooptaContent: string | YooptaContent): JSONContent => {
	let content: YooptaContent;

	// Parse if string
	if (typeof yooptaContent === "string") {
		try {
			content = JSON.parse(yooptaContent);
		} catch {
			// If parsing fails, return empty document
			return {
				type: "doc",
				content: [{ type: "paragraph" }],
			};
		}
	} else {
		content = yooptaContent;
	}

	// Handle empty content
	if (!content || Object.keys(content).length === 0) {
		return {
			type: "doc",
			content: [{ type: "paragraph" }],
		};
	}

	// Sort blocks by order
	const sortedBlocks = Object.values(content).sort(
		(a, b) => (a.meta?.order || 0) - (b.meta?.order || 0)
	);

	// Convert each block
	const tiptapContent: JSONContent[] = [];

	for (const block of sortedBlocks) {
		const converted = convertBlockType(block);
		if (converted) {
			tiptapContent.push(converted);
		}
	}

	// Ensure at least one paragraph
	if (tiptapContent.length === 0) {
		tiptapContent.push({ type: "paragraph" });
	}

	return {
		type: "doc",
		content: tiptapContent,
	};
};

// Check if content is Yoopta format
export const isYooptaFormat = (content: unknown): boolean => {
	if (!content || typeof content !== "object") return false;

	// Yoopta format has block IDs as keys with type, meta, value properties
	const firstKey = Object.keys(content)[0];
	if (!firstKey) return false;

	const firstBlock = (content as Record<string, unknown>)[firstKey];
	if (!firstBlock || typeof firstBlock !== "object") return false;

	const block = firstBlock as Record<string, unknown>;
	return "type" in block && "meta" in block && "value" in block;
};

// Check if content is Tiptap format
export const isTiptapFormat = (content: unknown): boolean => {
	if (!content || typeof content !== "object") return false;

	const doc = content as Record<string, unknown>;
	return doc.type === "doc" && Array.isArray(doc.content);
};

export default convertYooptaToTiptap;
