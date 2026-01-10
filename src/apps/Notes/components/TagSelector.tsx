import { Check, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { IconPicker, DEFAULT_TAG_ICON, getValidIcon } from "@/components/IconPicker";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Tag } from "@/types/notes";

interface TagSelectorProps {
	tags: Record<string, Tag>;
	selectedTags: string[];
	onTagToggle: (tagId: string) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
	tags,
	selectedTags,
	onTagToggle,
}) => {
	const { addTag } = useNotesStore();
	const [isOpen, setIsOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<LucideIcon>(DEFAULT_TAG_ICON);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleCreateTag = useCallback(() => {
		const trimmedName = newTagName.trim();
		if (!trimmedName) {
			setError("Tag name cannot be empty");
			return;
		}

		// Check for duplicate names
		const isDuplicate = Object.values(tags).some(
			(tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()
		);

		if (isDuplicate) {
			setError("A tag with this name already exists");
			return;
		}

		// Generate a unique ID
		const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		addTag({
			id: tagId,
			name: trimmedName,
			icon: selectedIcon,
			color: "#6b7280",
		});

		// Auto-select the new tag
		onTagToggle(tagId);

		setNewTagName("");
		setSelectedIcon(DEFAULT_TAG_ICON);
		setShowIconPicker(false);
		setError(null);
	}, [newTagName, selectedIcon, tags, addTag, onTagToggle]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleCreateTag();
		} else if (e.key === "Escape") {
			setNewTagName("");
			setError(null);
		}
	};

	const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		onTagToggle(tagId);
	};

	// Get selected tag objects
	const selectedTagObjects = selectedTags
		.map((tagId) => ({ ...tags[tagId], id: tagId }))
		.filter((tag) => tag.name); // Filter out any missing tags

	// Get available tags (not currently selected)
	const availableTags = Object.entries(tags)
		.filter(([tagId]) => !selectedTags.includes(tagId))
		.map(([tagId, tag]) => ({ ...tag, id: tagId }));

	// Get display icon - either custom or default, with function check
	const getDisplayIcon = (icon: LucideIcon | undefined): LucideIcon => {
		return getValidIcon(icon, DEFAULT_TAG_ICON);
	};

	const SelectedIconComponent = selectedIcon;

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Selected tags with remove button */}
			{selectedTagObjects.map((tag) => {
				const Icon = getDisplayIcon(tag.icon);
				return (
					<span
						key={tag.id}
						className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-primary/10 text-primary border border-primary/30 rounded-full text-xs font-medium group"
					>
						<Icon size={12} />
						{tag.name}
						<button
							type="button"
							onClick={(e) => handleRemoveTag(tag.id, e)}
							className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
							aria-label={`Remove ${tag.name} tag`}
						>
							<X size={12} />
						</button>
					</span>
				);
			})}

			{/* Add tag button with popover */}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-accent border border-border rounded-full text-xs font-medium transition-colors cursor-pointer"
						aria-label="Add tag"
					>
						<Plus size={12} />
						Add tag
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-72 p-2" align="start">
					<div className="space-y-2">
						{/* Create new tag */}
						<div className="space-y-2">
							<div className="flex gap-1">
								{/* Icon picker toggle */}
								<Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
									<PopoverTrigger asChild>
										<button
											type="button"
											className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-accent transition-colors"
											title="Choose icon"
										>
											<SelectedIconComponent size={14} />
										</button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-2" align="start" side="bottom">
										<IconPicker
											currentIcon={selectedIcon}
											onSelect={(icon) => {
												setSelectedIcon(icon);
												setShowIconPicker(false);
											}}
											variant="compact"
										/>
									</PopoverContent>
								</Popover>
								<Input
									ref={inputRef}
									value={newTagName}
									onChange={(e) => {
										setNewTagName(e.target.value);
										setError(null);
									}}
									onKeyDown={handleKeyDown}
									placeholder="New tag name..."
									className="h-8 text-sm flex-1"
								/>
								<Button
									type="button"
									size="sm"
									onClick={handleCreateTag}
									disabled={!newTagName.trim()}
									className="h-8 px-2"
								>
									<Plus size={14} />
								</Button>
							</div>
							{error && (
								<p className="text-xs text-destructive px-1">{error}</p>
							)}
						</div>

						{/* Available tags to select */}
						{availableTags.length > 0 && (
							<>
								<div className="border-t border-border my-2" />
								<div className="space-y-1 max-h-[200px] overflow-y-auto">
									{availableTags.map((tag) => {
										const Icon = getDisplayIcon(tag.icon);
										return (
											<button
												key={tag.id}
												type="button"
												onClick={() => {
													onTagToggle(tag.id);
												}}
												className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors cursor-pointer text-left"
											>
												<Icon size={14} className="text-muted-foreground" />
												<span className="flex-1">{tag.name}</span>
											</button>
										);
									})}
								</div>
							</>
						)}

						{/* Already selected tags section */}
						{selectedTagObjects.length > 0 && (
							<>
								<div className="border-t border-border my-2" />
								<p className="text-xs text-muted-foreground px-1 mb-1">Selected</p>
								<div className="space-y-1 max-h-[150px] overflow-y-auto">
									{selectedTagObjects.map((tag) => {
										const Icon = getDisplayIcon(tag.icon);
										return (
											<button
												key={tag.id}
												type="button"
												onClick={() => onTagToggle(tag.id)}
												className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors cursor-pointer text-left bg-primary/5"
											>
												<Icon size={14} className="text-primary" />
												<span className="flex-1 text-primary">{tag.name}</span>
												<Check size={14} className="text-primary" />
											</button>
										);
									})}
								</div>
							</>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};
