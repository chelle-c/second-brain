import { Check, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconPicker, type IconPickerSelection } from "@/components/IconPicker";
import { DEFAULT_TAG_ICON, renderFolderOrTagIcon } from "@/lib/icons";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Tag } from "@/types/notes";

interface TagSelectorProps {
	tags: Record<string, Tag>;
	selectedTags: string[];
	onTagToggle: (tagId: string) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ tags, selectedTags, onTagToggle }) => {
	const { addTag } = useNotesStore();
	const [isOpen, setIsOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [selectedIcon, setSelectedIcon] = useState<LucideIcon>(DEFAULT_TAG_ICON);
	const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(undefined);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleCreateTag = useCallback(() => {
		const trimmedName = newTagName.trim();
		if (!trimmedName) {
			setError("Tag name cannot be empty");
			return;
		}
		const isDuplicate = Object.values(tags).some(
			(tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
		);
		if (isDuplicate) {
			setError("A tag with this name already exists");
			return;
		}
		const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
		addTag({
			id: tagId,
			name: trimmedName,
			icon: selectedEmoji ? DEFAULT_TAG_ICON : selectedIcon,
			emoji: selectedEmoji,
			color: "#6b7280",
		});
		onTagToggle(tagId);
		setNewTagName("");
		setSelectedIcon(DEFAULT_TAG_ICON);
		setSelectedEmoji(undefined);
		setShowIconPicker(false);
		setError(null);
	}, [newTagName, selectedIcon, selectedEmoji, tags, addTag, onTagToggle]);

	const handlePickerSelect = useCallback((selection: IconPickerSelection) => {
		if (selection.type === "icon") {
			setSelectedIcon(selection.icon);
			setSelectedEmoji(undefined);
		} else {
			setSelectedEmoji(selection.emoji);
			setSelectedIcon(DEFAULT_TAG_ICON);
		}
		setShowIconPicker(false);
	}, []);

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

	const selectedTagObjects = selectedTags
		.map((tagId) => ({ ...tags[tagId], id: tagId }))
		.filter((tag) => tag.name);

	const availableTags = Object.entries(tags)
		.filter(([tagId]) => !selectedTags.includes(tagId))
		.map(([tagId, tag]) => ({ ...tag, id: tagId }));

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{selectedTagObjects.map((tag) => (
				<span
					key={tag.id}
					className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-primary/10 text-primary border border-primary/30 rounded-full text-xs font-medium group"
				>
					{renderFolderOrTagIcon(tag.emoji ? undefined : tag.icon, tag.emoji, 12)}
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
			))}

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
						<div className="space-y-2">
							<div className="flex gap-1">
								<Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
									<PopoverTrigger asChild>
										<button
											type="button"
											className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-accent transition-colors"
											title="Choose icon"
										>
											{renderFolderOrTagIcon(
												selectedEmoji ? undefined : selectedIcon,
												selectedEmoji,
												14,
											)}
										</button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-2"
										align="start"
										side="bottom"
										onWheel={(e) => e.stopPropagation()}
									>
										<IconPicker
											currentIcon={selectedEmoji ? undefined : selectedIcon}
											currentEmoji={selectedEmoji}
											onSelect={handlePickerSelect}
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
							{error && <p className="text-xs text-destructive px-1">{error}</p>}
						</div>

						{availableTags.length > 0 && (
							<>
								<div className="border-t border-border my-2" />
								<div className="space-y-1 max-h-[200px] overflow-y-auto">
									{availableTags.map((tag) => (
										<button
											key={tag.id}
											type="button"
											onClick={() => onTagToggle(tag.id)}
											className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors cursor-pointer text-left"
										>
											{renderFolderOrTagIcon(
												tag.emoji ? undefined : tag.icon,
												tag.emoji,
												14,
												"text-muted-foreground",
											)}
											<span className="flex-1">{tag.name}</span>
										</button>
									))}
								</div>
							</>
						)}

						{selectedTagObjects.length > 0 && (
							<>
								<div className="border-t border-border my-2" />
								<p className="text-xs text-muted-foreground px-1 mb-1">Selected</p>
								<div className="space-y-1 max-h-[150px] overflow-y-auto">
									{selectedTagObjects.map((tag) => (
										<button
											key={tag.id}
											type="button"
											onClick={() => onTagToggle(tag.id)}
											className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors cursor-pointer text-left bg-primary/5"
										>
											{renderFolderOrTagIcon(
												tag.emoji ? undefined : tag.icon,
												tag.emoji,
												14,
												"text-primary",
											)}
											<span className="flex-1 text-primary">{tag.name}</span>
											<Check size={14} className="text-primary" />
										</button>
									))}
								</div>
							</>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};
