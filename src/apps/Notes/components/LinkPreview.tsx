import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
	PluginElementRenderProps,
	YooptaPlugin,
	SlateElement,
	useYooptaEditor,
	Blocks,
	generateId,
} from "@yoopta/editor";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Loading } from "@/components/ui/loading";
import { Link } from "lucide-react";

interface LinkMetadata {
	title?: string | null;
	description?: string | null;
	image?: string | null;
	site_name?: string | null;
	url: string;
}

interface LinkPreviewProps {
	url: string;
	title?: string;
	description?: string;
	image?: string;
}

type LinkPreviewElement = SlateElement<"link-preview", LinkPreviewProps>;

type LinkPreviewElementMap = {
	"link-preview": LinkPreviewElement;
};

// Helper to check if a string is a valid URL
export const isValidUrl = (str: string): boolean => {
	try {
		const url = new URL(str);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

// URL Input Modal Component
const UrlInputModal = ({
	onSubmit,
	onCancel,
}: {
	onSubmit: (url: string) => void;
	onCancel: () => void;
}) => {
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const timer = setTimeout(() => inputRef.current?.focus(), 50);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onCancel();
			}
		};
		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [onCancel]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const trimmedUrl = url.trim();
		if (!trimmedUrl) {
			setError("Please enter a URL");
			return;
		}

		let finalUrl = trimmedUrl;
		if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
			finalUrl = "https://" + trimmedUrl;
		}

		if (!isValidUrl(finalUrl)) {
			setError("Please enter a valid URL");
			return;
		}

		onSubmit(finalUrl);
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center"
			onMouseDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onCancel();
			}}
			onKeyDown={(e) => e.stopPropagation()}
		>
			<div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
			<div
				className="relative z-10 w-full max-w-md mx-4"
				onMouseDown={(e) => e.stopPropagation()}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border border-border rounded-lg bg-card p-5 shadow-lg">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="flex items-center gap-2 text-base font-medium text-foreground">
							<Link className="w-5 h-5" />
							<span>Add Link Preview</span>
						</div>
						<div className="space-y-2">
							<input
								ref={inputRef}
								type="text"
								value={url}
								onChange={(e) => {
									setUrl(e.target.value);
									setError(null);
								}}
								placeholder="https://example.com"
								className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
								autoComplete="off"
								onKeyDown={(e) => e.stopPropagation()}
							/>
							{error && <p className="text-xs text-destructive">{error}</p>}
						</div>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onCancel();
								}}
								className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary rounded-md hover:bg-secondary/80"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={!url.trim()}
								className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Embed Link
							</button>
						</div>
						<p className="text-xs text-muted-foreground text-center">
							Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Esc</kbd> to cancel
						</p>
					</form>
				</div>
			</div>
		</div>,
		document.body
	);
};

// The actual render component for displaying the preview
const LinkPreviewRender = ({ element, attributes, children, blockId }: PluginElementRenderProps) => {
	const editor = useYooptaEditor();
	const props = element.props as LinkPreviewProps;
	const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(!props.url);

	// Use submitted URL as fallback until props update
	const currentUrl = props.url || submittedUrl;

	useEffect(() => {
		let cancelled = false;

		const fetchMetadata = async () => {
			if (!currentUrl) {
				return;
			}

			if (props.title) {
				setMetadata({
					url: currentUrl,
					title: props.title,
					description: props.description,
					image: props.image,
				});
				return;
			}

			try {
				setLoading(true);
				const data = await invoke<LinkMetadata>("fetch_link_metadata", { url: currentUrl });
				if (!cancelled) {
					setMetadata(data);
				}
			} catch (err) {
				console.error("Failed to fetch link metadata:", err);
				if (!cancelled) {
					setError(true);
					setMetadata({ url: currentUrl });
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};

		fetchMetadata();

		return () => {
			cancelled = true;
		};
	}, [currentUrl, props.title, props.description, props.image]);

	const handleOpenUrl = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (currentUrl) {
				open(currentUrl);
			}
		},
		[currentUrl]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Backspace" || e.key === "Delete") {
				e.preventDefault();
				Blocks.deleteBlock(editor, { blockId });
			}
		},
		[editor, blockId]
	);

	const handleUrlSubmit = useCallback(
		(url: string) => {
			// Set local state first for immediate UI update
			setSubmittedUrl(url);
			setShowModal(false);

			const newValue = [
				{
					id: generateId(),
					type: "link-preview",
					children: [{ text: "" }],
					props: {
						url: url,
					},
				},
			];

			Blocks.updateBlock(editor, blockId, {
				value: newValue,
			});
		},
		[editor, blockId]
	);

	const handleCancel = useCallback(() => {
		setShowModal(false);
		// Delete the block if it has no URL
		if (!currentUrl) {
			Blocks.deleteBlock(editor, { blockId });
		}
	}, [editor, blockId, currentUrl]);

	const hostname = (() => {
		try {
			return currentUrl ? new URL(currentUrl).hostname : "";
		} catch {
			return currentUrl || "";
		}
	})();

	// Show modal for URL input if no URL yet
	if (showModal && !currentUrl) {
		return (
			<div {...attributes}>
				<div className="my-2 py-4 border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
					Adding link preview...
				</div>
				<UrlInputModal onSubmit={handleUrlSubmit} onCancel={handleCancel} />
				{children}
			</div>
		);
	}

	// Placeholder if no URL and modal closed (shouldn't happen normally)
	if (!currentUrl) {
		return (
			<div {...attributes}>
				<div className="my-2 py-4 border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
					No URL provided
				</div>
				{children}
			</div>
		);
	}

	return (
		<div {...attributes} contentEditable={false} tabIndex={0} onKeyDown={handleKeyDown}>
			{/* URL displayed above the embed */}
			<div className="my-2">
				<a
					href={currentUrl}
					onClick={handleOpenUrl}
					className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
				>
					{currentUrl}
				</a>
			</div>

			{/* Discord-style embed card - using inline borderLeft to override Yoopta's reset */}
			<div
				className="link-preview-card rounded-r bg-muted/50 overflow-hidden max-w-lg"
				style={{ borderLeft: "4px solid var(--color-ring)" }}
			>
				{loading && (
					<div className="flex items-center justify-center py-6 px-4">
						<Loading size="sm" text="Loading preview..." />
					</div>
				)}

				{!loading && (error || !metadata?.title) && (
					<div className="p-3">
						<span className="text-sm text-muted-foreground">{hostname}</span>
					</div>
				)}

				{!loading && metadata?.title && (
					<div className="p-3">
						{/* Site name */}
						{(metadata.site_name || hostname) && (
							<div className="text-xs text-muted-foreground mb-1">
								{metadata.site_name || hostname}
							</div>
						)}

						{/* Title as clickable link */}
						<a
							href={currentUrl}
							onClick={handleOpenUrl}
							className="text-sm font-semibold text-primary hover:underline cursor-pointer line-clamp-2"
						>
							{metadata.title}
						</a>

						{/* Description */}
						{metadata.description && (
							<p className="text-sm text-foreground/80 mt-1 line-clamp-3">
								{metadata.description}
							</p>
						)}

						{/* Image */}
						{metadata.image && (
							<div className="mt-3 rounded overflow-hidden max-w-[400px]">
								<img
									src={metadata.image}
									alt={metadata.title || "Link Preview"}
									className="w-full h-auto max-h-[200px] object-cover"
									onError={(e) => {
										(e.target as HTMLImageElement).parentElement!.style.display = "none";
									}}
								/>
							</div>
						)}
					</div>
				)}
			</div>
			{/* Hidden children to satisfy Slate's requirements */}
			<span style={{ display: "none" }}>{children}</span>
		</div>
	);
};

const LinkPreviewPlugin = new YooptaPlugin<LinkPreviewElementMap>({
	type: "LinkPreview",
	elements: {
		"link-preview": {
			render: LinkPreviewRender,
			props: {
				url: "",
			},
		},
	},
	options: {
		display: {
			title: "Link Preview",
			description: "Embed a link with rich preview",
		},
		shortcuts: ["bookmark", "preview"],
	},
	parsers: {
		html: {
			deserialize: {
				nodeNames: ["A"],
				parse: (el) => {
					const href = el.getAttribute("href");
					if (href && el.textContent === href) {
						return {
							id: "",
							type: "link-preview",
							children: [{ text: "" }],
							props: {
								url: href,
							},
						};
					}
					return undefined;
				},
			},
			serialize: (element, _content) => {
				const props = element.props as LinkPreviewProps;
				return `<a href="${props.url}" target="_blank" rel="noopener noreferrer">${props.title || props.url}</a>`;
			},
		},
	},
});

export default LinkPreviewPlugin;
