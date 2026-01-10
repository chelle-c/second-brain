import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Link } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loading } from "@/components/ui/loading";

interface LinkMetadata {
	title?: string | null;
	description?: string | null;
	image?: string | null;
	site_name?: string | null;
	url: string;
}

interface LinkPreviewAttributes {
	url: string;
	title?: string;
	description?: string;
	image?: string;
}

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
			finalUrl = `https://${trimmedUrl}`;
		}

		if (!isValidUrl(finalUrl)) {
			setError("Please enter a valid URL");
			return;
		}

		onSubmit(finalUrl);
	};

	return createPortal(
		<div
			className="fixed inset-0 z-9999 flex items-center justify-center"
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
				onKeyDown={(e) => e.stopPropagation()}
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
								className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/80"
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

// The render component for displaying the preview
const LinkPreviewComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
	const props = node.attrs as LinkPreviewAttributes;
	const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [showModal, setShowModal] = useState(!props.url);

	const currentUrl = props.url;

	useEffect(() => {
		let cancelled = false;

		const fetchMetadata = async () => {
			if (!currentUrl) return;

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
				const data = await invoke<LinkMetadata>("fetch_link_metadata", {
					url: currentUrl,
				});
				if (!cancelled) {
					setMetadata(data);
					// Cache the metadata in attributes
					if (data.title) {
						updateAttributes({
							title: data.title || undefined,
							description: data.description || undefined,
							image: data.image || undefined,
						});
					}
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
	}, [currentUrl, props.title, props.description, props.image, updateAttributes]);

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
				deleteNode();
			}
		},
		[deleteNode]
	);

	const handleUrlSubmit = useCallback(
		(url: string) => {
			updateAttributes({ url });
			setShowModal(false);
		},
		[updateAttributes]
	);

	const handleCancel = useCallback(() => {
		setShowModal(false);
		if (!currentUrl) {
			deleteNode();
		}
	}, [currentUrl, deleteNode]);

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
			<NodeViewWrapper>
				<div className="my-2 py-4 border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
					Adding link preview...
				</div>
				<UrlInputModal onSubmit={handleUrlSubmit} onCancel={handleCancel} />
			</NodeViewWrapper>
		);
	}

	// Placeholder if no URL and modal closed
	if (!currentUrl) {
		return (
			<NodeViewWrapper>
				<div className="my-2 py-4 border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
					No URL provided
				</div>
			</NodeViewWrapper>
		);
	}

	return (
		<NodeViewWrapper>
			<div
				contentEditable={false}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
			>
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

				{/* Discord-style embed card */}
				<div
					className="link-preview-card rounded-r bg-muted/50 overflow-hidden max-w-lg"
					style={{ borderLeft: "4px solid var(--color-ring, hsl(var(--ring)))" }}
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
											const parent = (e.target as HTMLImageElement).parentElement;
											if (parent) {
												parent.style.display = "none";
											}
										}}
									/>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</NodeViewWrapper>
	);
};

export interface LinkPreviewOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		linkPreview: {
			setLinkPreview: (attributes?: { url?: string }) => ReturnType;
		};
	}
}

export const LinkPreview = Node.create<LinkPreviewOptions>({
	name: "linkPreview",
	group: "block",
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			url: {
				default: "",
			},
			title: {
				default: null,
			},
			description: {
				default: null,
			},
			image: {
				default: null,
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="link-preview"]',
			},
		];
	},

	renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
		return [
			"div",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				"data-type": "link-preview",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(LinkPreviewComponent);
	},

	addCommands() {
		return {
			setLinkPreview:
				(attributes) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: attributes,
					});
				},
		};
	},
});

export default LinkPreview;
