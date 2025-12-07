import { Tag } from "@/types/notes";
import { X } from "lucide-react";

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

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">Filter by tags:</span>
			<div className="flex flex-wrap gap-2">
				{Object.entries(tags).map(([tagId, tag]) => {
					const isActive = activeTags.includes(tagId);
					const Icon = tag.icon;

					return (
						<button
							key={tagId}
							onClick={() => toggleTag(tagId)}
							className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
								isActive
									? "bg-primary/10 text-primary border border-primary/30"
									: "bg-muted text-muted-foreground hover:bg-accent border border-border"
							}`}
						>
							<Icon size={12} />
							{tag.name}
							{isActive && <X size={12} className="ml-1" />}
						</button>
					);
				})}

				{activeTags.length > 0 && (
					<button
						onClick={() => setActiveTags([])}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						Clear all
					</button>
				)}
			</div>
		</div>
	);
};
