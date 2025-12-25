import { useNotesStore } from "@/stores/useNotesStore";
import type { Note } from "@/types/notes";
import { useLinkPreviewAutoConvert } from "../hooks/useLinkPreviewAutoConvert";
import LinkPreviewPlugin from "./LinkPreview";
import Accordion from "@yoopta/accordion";
import ActionMenuList, {
	DefaultActionMenuRender,
} from "@yoopta/action-menu-list";
import Blockquote from "@yoopta/blockquote";
import Callout from "@yoopta/callout";
import Code from "@yoopta/code";
import Divider, { type DividerElementProps } from "@yoopta/divider";
import YooptaEditor, { createYooptaEditor } from "@yoopta/editor";
import Embed from "@yoopta/embed";
import File from "@yoopta/file";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Image from "@yoopta/image";
import Link, { type LinkElementProps } from "@yoopta/link";
import LinkTool, { DefaultLinkToolRender } from "@yoopta/link-tool";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import {
	Bold,
	CodeMark,
	Highlight,
	Italic,
	Strike,
	Underline,
} from "@yoopta/marks";
import Paragraph from "@yoopta/paragraph";
import Table from "@yoopta/table";
import Toolbar, { DefaultToolbarRender } from "@yoopta/toolbar";
import Video from "@yoopta/video";
import { useMemo, useRef, useState } from "react";

const fileToBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
};

// Helper function to get image dimensions
const getImageDimensions = (
	file: File,
): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const img = document.createElement("img");
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.width, height: img.height });
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
};

// Helper function to get video dimensions
const getVideoDimensions = (
	file: File,
): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		const url = URL.createObjectURL(file);

		video.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve({ width: video.videoWidth, height: video.videoHeight });
		};

		video.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load video"));
		};

		video.src = url;
	});
};

const plugins = [
	Paragraph,
	// biome-ignore lint/suspicious/noExplicitAny: Table plugin types are incompatible with Yoopta's type system
	Table as any,
	Divider.extend({
		elementProps: {
			divider: (props: DividerElementProps) => ({
				...props,
				color: "#007aff",
			}),
		},
	}),
	Accordion,
	HeadingOne,
	HeadingTwo,
	HeadingThree,
	Blockquote,
	Callout,
	NumberedList,
	BulletedList,
	TodoList,
	Code,
	Link.extend({
		elementProps: {
			link: (props: LinkElementProps) => ({
				...props,
				target: "_blank",
			}),
		},
	}),
	Embed,
	Image.extend({
		options: {
			onUpload: async (file: File) => {
				try {
					const base64 = await fileToBase64(file);
					const dimensions = await getImageDimensions(file);

					return {
						src: base64,
						alt: file.name,
						sizes: {
							width: dimensions.width,
							height: dimensions.height,
						},
					};
				} catch (error) {
					console.error("Error uploading image:", error);
					throw error;
				}
			},
		},
	}),
	Video.extend({
		options: {
			onUpload: async (file: File) => {
				try {
					const base64 = await fileToBase64(file);
					const dimensions = await getVideoDimensions(file);

					return {
						src: base64,
						alt: file.name,
						sizes: {
							width: dimensions.width,
							height: dimensions.height,
						},
					};
				} catch (error) {
					console.error("Error uploading video:", error);
					throw error;
				}
			},
		},
	}),
	File.extend({
		options: {
			onUpload: async (file: File) => {
				try {
					const base64 = await fileToBase64(file);

					return {
						src: base64,
						format: file.type,
						name: file.name,
						size: file.size,
					};
				} catch (error) {
					console.error("Error uploading file:", error);
					throw error;
				}
			},
		},
	}),
	LinkPreviewPlugin,
];

const TOOLS = {
	ActionMenu: {
		render: DefaultActionMenuRender,
		tool: ActionMenuList,
	},
	Toolbar: {
		render: DefaultToolbarRender,
		tool: Toolbar,
	},
	LinkTool: {
		render: DefaultLinkToolRender,
		tool: LinkTool,
	},
};

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

interface EditorSetupProps {
	note: Note;
}

export const EditorSetup = ({ note }: EditorSetupProps) => {
	const { updateNote } = useNotesStore();
	const [value, setValue] = useState(() => {
		try {
			return note.content ? JSON.parse(note.content) : {};
		} catch {
			return {};
		}
	});
	const editor = useMemo(() => createYooptaEditor(), []);
	const selectionRef = useRef(null);

	// Enable automatic URL to LinkPreview conversion
	useLinkPreviewAutoConvert(editor);

	const onChange = async (value: Record<string, unknown>) => {
		setValue(value);

		const content = JSON.stringify(value);
		if (content !== note.content) {
			updateNote(note.id, { content });
		}
	};

	return (
		<div className="w-full yoopta-editor-wrapper" ref={selectionRef}>
			<YooptaEditor
				editor={editor}
				plugins={plugins}
				tools={TOOLS}
				marks={MARKS}
				selectionBoxRoot={selectionRef}
				value={value}
				onChange={onChange}
				autoFocus
				width="100%"
			/>
		</div>
	);
};
