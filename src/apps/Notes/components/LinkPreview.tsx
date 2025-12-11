import { useState, useEffect } from "react";
import { PluginElementRenderProps, YooptaPlugin } from "@yoopta/editor";
import { invoke } from "@tauri-apps/api/core";
import { Loading } from "@/components/ui/loading";

interface LinkMetadata {
	title?: string | null;
	description?: string | null;
	image?: string | null;
	url: string;
}

const LinkPreview = new YooptaPlugin({
	type: "LinkPreview",
	elements: {
		"link-preview": {
			render: (props: PluginElementRenderProps) => {
				const { element, attributes, children } = props;
				const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
				const [loading, setLoading] = useState<boolean>(false);

				useEffect(() => {
					const fetchData = async () => {
						if (element.props?.url) {
							setLoading(true);
							try {
								const data = await invoke<LinkMetadata>("fetch_link_metadata", {
									url: element.props.url,
								});
								setMetadata(data);
							} catch (error) {
								console.error("Failed to fetch metadata:", error);
							} finally {
								setLoading(false);
							}
						}
					};

					fetchData();
				}, [element.props?.url]);

				return (
					<div {...attributes} className="link-preview-block">
						{loading && <Loading size="sm" className="py-4" />}
						{metadata && (
							<div className="preview-card">
								{metadata.image && (
									<img src={metadata.image} alt={metadata.title || "Link Preview"} />
								)}
								<div>
									<h4>{metadata.title}</h4>
									<p>{metadata.description}</p>
									<span>{metadata.url}</span>
								</div>
							</div>
						)}
						{children}
					</div>
				);
			},
		},
	},
	options: {
		display: {
			title: "Link Preview",
			description: "Embed a link with preview",
		},
	},
});

export default LinkPreview;
