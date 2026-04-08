import { Check, ChevronDown, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getIconNameFromComponent, renderFolderOrTagIcon } from "@/lib/icons";
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

	const displayTags = Object.entries(tags).filter(([tagId]) => tagId !== "uncategorized");
	const isUncategorizedActive = activeTags.includes("uncategorized");
	const activeCount = activeTags.length;

	const getActiveTagNames = () => {
		return activeTags
			.filter((id) => id !== "uncategorized")
			.map((id) => tags[id]?.name)
			.filter(Boolean);
	};

	const activeTagNames = getActiveTagNames();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
						activeCount > 0 ?
							"bg-primary/10 text-primary border-primary/30"
						:	"bg-muted text-muted-foreground hover:bg-accent border-border"
					}`}
				>
					<Filter size={14} />
					{activeCount > 0 ?
						<>
							<span className="max-w-[150px] truncate">
								{isUncategorizedActive && activeTagNames.length === 0 ?
									"No category"
								: activeTagNames.length <= 2 ?
									activeTagNames.join(", ")
								:	`${activeTagNames.slice(0, 2).join(", ")} +${activeTagNames.length - 2}`
								}
								{isUncategorizedActive && activeTagNames.length > 0 && " +1"}
							</span>
							<span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
								{activeCount}
							</span>
						</>
					:	<span>Filter by tag</span>}
					<ChevronDown size={14} />
				</button>
			</PopoverTrigger>
			<PopoverContent className="min-w-[152px] w-auto p-2" align="start">
				<div className="space-y-1">
					{activeCount > 0 && (
						<>
							<button
								type="button"
								onClick={() => setActiveTags([])}
								className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer"
							>
								<X size={14} />
								Clear all filters
							</button>
							<div className="border-t border-border my-1" />
						</>
					)}

					{displayTags.map(([tagId, tag]) => {
						const isActive = activeTags.includes(tagId);
						const iconKey = getIconNameFromComponent(tag.icon) || "default";

						return (
							<button
								type="button"
								key={`${tagId}-${iconKey}`}
								onClick={() => toggleTag(tagId)}
								className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer text-left ${
									isActive ?
										"bg-primary/10 text-primary"
									:	"text-foreground hover:bg-accent"
								}`}
							>
								{renderFolderOrTagIcon(
									tag.emoji ? undefined : tag.icon,
									tag.emoji,
									14,
								)}
								<span className="flex-1">{tag.name}</span>
								{isActive && <Check size={14} />}
							</button>
						);
					})}

					<div className="border-t border-border my-1" />

					<button
						type="button"
						onClick={() => toggleTag("uncategorized")}
						className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer text-left ${
							isUncategorizedActive ?
								"bg-primary/10 text-primary"
							:	"text-muted-foreground hover:bg-accent hover:text-foreground"
						}`}
					>
						<span className="flex-1 italic">No category</span>
						{isUncategorizedActive && <Check size={14} />}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
};
