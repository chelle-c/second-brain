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
			<span className="text-sm text-gray-600">Filter by tags:</span>
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
									? "bg-sky-100 text-sky-700 border border-sky-300"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
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
						className="text-xs text-gray-500 hover:text-gray-700"
					>
						Clear all
					</button>
				)}
			</div>
		</div>
	);
};
