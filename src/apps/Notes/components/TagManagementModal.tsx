import {
	CheckCircle,
	Lightbulb,
	BookOpen,
	Pencil,
	Plus,
	Trash2,
	Tag as TagIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Tag } from "@/types/notes";

interface TagManagementModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// Default tag definitions for creating new defaults
const DEFAULT_TAG_DEFINITIONS: Record<string, Omit<Tag, "id">> = {
	actions: {
		name: "Actions",
		icon: CheckCircle,
		color: "#3b82f6",
	},
	ideas: {
		name: "Ideas",
		icon: Lightbulb,
		color: "#eab308",
	},
	reference: {
		name: "Reference",
		icon: BookOpen,
		color: "#10b981",
	},
};

export const TagManagementModal: React.FC<TagManagementModalProps> = ({ isOpen, onClose }) => {
	const { tags, addTag, updateTag, deleteTag, notes } = useNotesStore();

	const [editingTagId, setEditingTagId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [newTagName, setNewTagName] = useState("");
	const [error, setError] = useState<string | null>(null);

	// Get all tags as array
	const tagList = Object.entries(tags).map(([tagId, tag]) => ({ tagId, ...tag }));

	// Count notes using each tag
	const getTagUsageCount = useCallback(
		(tagId: string) => {
			return notes.filter((note) => note.tags?.includes(tagId)).length;
		},
		[notes]
	);

	const handleStartEdit = (tagId: string, currentName: string) => {
		setEditingTagId(tagId);
		setEditingName(currentName);
		setError(null);
	};

	const handleCancelEdit = () => {
		setEditingTagId(null);
		setEditingName("");
		setError(null);
	};

	const handleSaveEdit = () => {
		if (!editingTagId) return;

		const trimmedName = editingName.trim();
		if (!trimmedName) {
			setError("Tag name cannot be empty");
			return;
		}

		// Check for duplicate names (excluding current tag)
		const isDuplicate = Object.entries(tags).some(
			([id, tag]) =>
				id !== editingTagId && tag.name.toLowerCase() === trimmedName.toLowerCase()
		);

		if (isDuplicate) {
			setError("A tag with this name already exists");
			return;
		}

		updateTag(editingTagId, { name: trimmedName });
		handleCancelEdit();
	};

	const handleDeleteTag = (tagId: string) => {
		deleteTag(tagId);
		if (editingTagId === tagId) {
			handleCancelEdit();
		}
	};

	const handleAddTag = () => {
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
			icon: TagIcon,
			color: "#6b7280",
		});

		setNewTagName("");
		setError(null);
	};

	const handleRestoreDefaults = () => {
		// Add any missing default tags
		Object.entries(DEFAULT_TAG_DEFINITIONS).forEach(([id, tagDef]) => {
			if (!tags[id]) {
				addTag({ id, ...tagDef });
			}
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent, action: "edit" | "add") => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (action === "edit") {
				handleSaveEdit();
			} else {
				handleAddTag();
			}
		} else if (e.key === "Escape") {
			if (action === "edit") {
				handleCancelEdit();
			} else {
				setNewTagName("");
			}
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Manage Tags"
			description="Create, edit, or delete tags for your notes"
			className="sm:max-w-md"
		>
			<div className="space-y-4">
				{/* Error message */}
				{error && (
					<div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
						<p className="text-xs text-destructive">{error}</p>
					</div>
				)}

				{/* Existing tags */}
				<div className="space-y-2">
					<Label className="text-sm font-medium">Tags</Label>
					{tagList.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4 text-center">
							No tags created yet
						</p>
					) : (
						<div className="space-y-2 max-h-[300px] overflow-y-auto">
							{tagList.map(({ id, name, icon: Icon }) => {
								const usageCount = getTagUsageCount(id);
								const isEditing = editingTagId === id;

								return (
									<div
										key={id}
										className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
									>
										{typeof Icon === "function" && (
											<Icon
												size={16}
												className="text-muted-foreground shrink-0"
											/>
										)}

										{isEditing ? (
											<Input
												value={editingName}
												onChange={(e) => setEditingName(e.target.value)}
												onKeyDown={(e) => handleKeyDown(e, "edit")}
												className="flex-1 h-8"
												autoFocus
											/>
										) : (
											<span className="flex-1 text-sm truncate">{name}</span>
										)}

										<span className="text-xs text-muted-foreground shrink-0">
											{usageCount} {usageCount === 1 ? "note" : "notes"}
										</span>

										{isEditing ? (
											<div className="flex gap-1">
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={handleSaveEdit}
													className="h-7 px-2"
												>
													Save
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={handleCancelEdit}
													className="h-7 px-2"
												>
													Cancel
												</Button>
											</div>
										) : (
											<div className="flex gap-1">
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={() => handleStartEdit(id, name)}
													className="h-7 w-7 p-0"
													title="Edit tag"
												>
													<Pencil size={14} />
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={() => handleDeleteTag(id)}
													className="h-7 w-7 p-0 text-destructive hover:text-destructive"
													title="Delete tag"
												>
													<Trash2 size={14} />
												</Button>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				<Separator />

				{/* Add new tag */}
				<div className="space-y-2">
					<Label className="text-sm font-medium">Add New Tag</Label>
					<div className="flex gap-2">
						<Input
							value={newTagName}
							onChange={(e) => {
								setNewTagName(e.target.value);
								setError(null);
							}}
							onKeyDown={(e) => handleKeyDown(e, "add")}
							placeholder="Enter tag name..."
							className="flex-1"
						/>
						<Button
							type="button"
							onClick={handleAddTag}
							disabled={!newTagName.trim()}
							size="sm"
							className="gap-1"
						>
							<Plus size={16} />
							Add
						</Button>
					</div>
				</div>

				<Separator />

				{/* Restore defaults */}
				<div className="flex justify-between items-center">
					<p className="text-xs text-muted-foreground">
						Missing default tags? Restore them here.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleRestoreDefaults}
					>
						Restore Defaults
					</Button>
				</div>
			</div>
		</Modal>
	);
};
