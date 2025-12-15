import { useEffect, useCallback, useRef } from "react";
import { YooEditor, YooptaContentValue, generateId, Blocks } from "@yoopta/editor";
import { isValidUrl } from "../components/LinkPreview";

// Helper to check if a block contains only a URL
const isUrlOnlyBlock = (block: any): string | null => {
	if (!block?.value?.[0]?.children) return null;

	const children = block.value[0].children;
	if (children.length !== 1) return null;

	const textNode = children[0];
	if (typeof textNode.text !== "string") return null;

	const text = textNode.text.trim();
	if (isValidUrl(text)) {
		return text;
	}

	return null;
};

// Helper to check if a block contains a link element (from toolbar)
const getLinkFromBlock = (block: any): string | null => {
	if (!block?.value?.[0]?.children) return null;

	const children = block.value[0].children;

	// Check if there's a single link element that spans the entire content
	for (const child of children) {
		if (child.type === "link" && child.props?.url) {
			return child.props.url;
		}
	}

	return null;
};

// Hook to handle automatic URL to LinkPreview conversion
export const useLinkPreviewAutoConvert = (editor: YooEditor) => {
	const processedBlocks = useRef<Set<string>>(new Set());

	const convertBlockToLinkPreview = useCallback(
		(blockId: string, url: string) => {
			// Mark as processed to avoid loops
			processedBlocks.current.add(blockId);

			// Get the current block to find its position
			const block = editor.getBlock({ id: blockId });
			if (!block) return;

			const order = block.meta.order;

			// Delete the original block
			Blocks.deleteBlock(editor, { blockId });

			// Insert a new LinkPreview block at the same position
			Blocks.insertBlock(editor, "LinkPreview", {
				at: order,
				focus: false,
			});

			// Get the newly inserted block
			const blocks = editor.children;
			const newBlock = Object.values(blocks).find((b) => b.meta.order === order);

			if (newBlock) {
				// Update the block with the URL
				Blocks.updateBlock(editor, newBlock.id, {
					value: [
						{
							id: generateId(),
							type: "link-preview",
							children: [{ text: "" }],
							props: {
								url: url,
							},
						},
					],
				});
			}
		},
		[editor]
	);

	useEffect(() => {
		const handleChange = (payload: { value: YooptaContentValue }) => {
			const { value } = payload;

			// Check each block for URLs
			for (const [blockId, block] of Object.entries(value)) {
				// Skip if already processed or if it's already a LinkPreview
				if (processedBlocks.current.has(blockId)) continue;
				if (block.type === "LinkPreview") continue;

				// Only process Paragraph blocks
				if (block.type !== "Paragraph") continue;

				// Check for pasted URL (entire block is just a URL)
				const pastedUrl = isUrlOnlyBlock(block);
				if (pastedUrl) {
					// Use setTimeout to avoid modifying during render
					setTimeout(() => convertBlockToLinkPreview(blockId, pastedUrl), 0);
					continue;
				}

				// Check for link created via toolbar
				const linkUrl = getLinkFromBlock(block);
				if (linkUrl) {
					// Use setTimeout to avoid modifying during render
					setTimeout(() => convertBlockToLinkPreview(blockId, linkUrl), 0);
				}
			}
		};

		editor.on("change", handleChange);

		return () => {
			editor.off("change", handleChange);
		};
	}, [editor, convertBlockToLinkPreview]);

	// Clear processed blocks when editor value changes significantly (e.g., note switch)
	useEffect(() => {
		processedBlocks.current.clear();
	}, [editor.id]);
};
