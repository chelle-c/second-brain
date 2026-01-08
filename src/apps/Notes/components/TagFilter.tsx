import { FileQuestion, X } from "lucide-react";
import type { Tag } from "@/types/notes";

interface TagFilterProps {
	tags: Record<string, Tag>;
	activeTags: string[];
	setActiveTags: React.Dispatch<React.SetStateAction<string[]>>;
}

export const TagFilter = ({ tags, activeTags, setActiveTags }: TagFilterProps) => {
	const toggleTag = (tagId: string) => {
		if (activeTags.includes(tagId)) {
			setActiveTags(activeTags.filter((t) => t !== tagId));
		} else {
			setActiveTags([...activeTags, tagId]);
		}
	};

	// Filter out "uncategorized" from displayed tags since it's a special filter
	const displayTags = Object.entries(tags).filter(([tagId]) => tagId !== "uncategorized");
	const isUncategorizedActive = activeTags.includes("uncategorized");

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">Filter:</span>
			<div className="flex flex-wrap gap-2">
				{displayTags.map(([tagId, tag]) => {
					const isActive = activeTags.includes(tagId);
					const Icon = tag.icon;

					return (
						<button
							type="button"
							key={tagId}
							onClick={() => toggleTag(tagId)}
							className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
								isActive
									? "bg-primary/10 text-primary border border-primary/30"
									: "bg-muted text-muted-foreground hover:bg-accent border border-border"
							}`}
						>
							{typeof Icon === "function" && <Icon size={12} />}
							{tag.name}
							{isActive && <X size={12} className="ml-1" />}
						</button>
					);
				})}

				{/* Uncategorized filter - always shown as a special option */}
				<button
					type="button"
					onClick={() => toggleTag("uncategorized")}
					className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
						isUncategorizedActive
							? "bg-primary/10 text-primary border border-primary/30"
							: "bg-muted text-muted-foreground hover:bg-accent border border-border"
					}`}
				>
					<FileQuestion size={12} />
					Uncategorized
					{isUncategorizedActive && <X size={12} className="ml-1" />}
				</button>

				{activeTags.length > 0 && (
					<button
						type="button"
						onClick={() => setActiveTags([])}
						className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
					>
						Clear all
					</button>
				)}
			</div>
		</div>
	);
};
