import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Modal } from "@/components/Modal";
import { useExpenseStore } from "@/stores/useExpenseStore";

interface CategoryManagerProps {
	isOpen: boolean;
	onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
	isOpen,
	onClose,
}) => {
	const {
		categories,
		categoryColors,
		addCategory,
		updateCategory,
		deleteCategory,
	} = useExpenseStore();

	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState("");
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean;
		category: string;
	}>({
		isOpen: false,
		category: "",
	});

	const addInputRef = useRef<HTMLInputElement>(null);
	const editInputRef = useRef<HTMLInputElement>(null);

	// Focus input when adding new category
	useEffect(() => {
		if (isAddingNew && addInputRef.current) {
			addInputRef.current.focus();
		}
	}, [isAddingNew]);

	// Focus input when editing category
	useEffect(() => {
		if (editingCategory && editInputRef.current) {
			editInputRef.current.focus();
		}
	}, [editingCategory]);

	// Sort categories alphabetically
	const sortedCategories = [...categories].sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase()),
	);

	const handleStartAddNew = () => {
		// Cancel any editing in progress
		if (editingCategory) {
			handleCancelEdit();
		}
		setIsAddingNew(true);
		setNewCategoryName("");
		setNewCategoryColor("#3b82f6");
	};

	const handleAddCategory = () => {
		if (newCategoryName.trim()) {
			addCategory(newCategoryName.trim(), newCategoryColor);
			setNewCategoryName("");
			setNewCategoryColor("#3b82f6");
			setIsAddingNew(false);
		}
	};

	const handleCancelAdd = () => {
		setIsAddingNew(false);
		setNewCategoryName("");
		setNewCategoryColor("#3b82f6");
	};

	const handleAddInputBlur = (e: React.FocusEvent) => {
		// Check if the blur is going to another element within the add section
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (relatedTarget?.closest(".add-category-section")) {
			return;
		}
		handleCancelAdd();
	};

	const handleStartEdit = (category: string) => {
		// Cancel adding if in progress
		if (isAddingNew) {
			handleCancelAdd();
		}
		setEditingCategory(category);
		setEditName(category);
		setEditColor(categoryColors[category] || "#3b82f6");
	};

	const handleSaveEdit = () => {
		if (editingCategory && editName.trim()) {
			updateCategory(editingCategory, editName.trim(), editColor);
			setEditingCategory(null);
			setEditName("");
			setEditColor("");
		}
	};

	const handleCancelEdit = () => {
		setEditingCategory(null);
		setEditName("");
		setEditColor("");
	};

	const handleEditInputBlur = (e: React.FocusEvent) => {
		// Check if the blur is going to another element within the edit row
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (relatedTarget?.closest(".edit-category-row")) {
			return;
		}
		handleCancelEdit();
	};

	const handleDeleteClick = (category: string) => {
		setDeleteModal({ isOpen: true, category });
	};

	const handleDeleteConfirm = () => {
		deleteCategory(deleteModal.category);
		setDeleteModal({ isOpen: false, category: "" });
	};

	const handleDeleteCancel = () => {
		setDeleteModal({ isOpen: false, category: "" });
	};

	return (
		<>
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title="Manage Categories"
				className="max-w-2xl"
			>
				<div className="flex flex-col h-full">
					{/* Add New Category */}
					<div className="bg-primary/10 rounded-lg p-4 mb-6 add-category-section">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							Add New Category
						</h4>
						{isAddingNew ? (
							<div className="flex gap-3">
								<input
									ref={addInputRef}
									id="categoryName"
									type="text"
									placeholder="Category name"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleAddCategory();
										if (e.key === "Escape") handleCancelAdd();
									}}
									onBlur={handleAddInputBlur}
									className="flex-1 px-3 py-2 bg-background border border-border rounded-lg
									focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground text-foreground"
								/>
								<input
									type="color"
									value={newCategoryColor}
									onChange={(e) => setNewCategoryColor(e.target.value)}
									onBlur={handleAddInputBlur}
									className="w-12 h-10 border border-border rounded-sm cursor-pointer"
									title="Choose category color"
								/>
								<button
									type="button"
									onClick={handleAddCategory}
									onBlur={handleAddInputBlur}
									disabled={!newCategoryName.trim()}
									className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
									hover:bg-primary/90 transition-colors duration-200
									disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
									flex items-center gap-2"
								>
									<Plus size={18} />
									Add
								</button>
								<button
									type="button"
									onClick={handleCancelAdd}
									className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg
									hover:bg-secondary/80 transition-colors duration-200"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={handleStartAddNew}
								className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
								hover:bg-primary/90 transition-colors duration-200
								flex items-center gap-2"
							>
								<Plus size={18} />
								Add New Category
							</button>
						)}
					</div>

					{/* Categories List */}
					<div className="overflow-y-auto max-h-[60vh]">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							Existing Categories ({categories.length})
						</h4>
						<div className="space-y-2">
							{sortedCategories.map((category) => (
								<div
									key={category}
									className={`bg-muted rounded-lg p-3 flex items-center gap-3
									hover:bg-accent transition-colors duration-200 ${
										editingCategory === category ? "edit-category-row" : ""
									}`}
								>
									{editingCategory === category ? (
										<>
											<input
												type="color"
												value={editColor}
												onChange={(e) => setEditColor(e.target.value)}
												onBlur={handleEditInputBlur}
												className="w-12 h-10 border border-border rounded-lg cursor-pointer"
											/>
											<input
												ref={editInputRef}
												type="text"
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") handleSaveEdit();
													if (e.key === "Escape") handleCancelEdit();
												}}
												onBlur={handleEditInputBlur}
												className="flex-1 px-3 py-2 border border-border rounded-lg
												focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
											/>
											<button
												type="button"
												onClick={handleSaveEdit}
												onBlur={handleEditInputBlur}
												className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg
												transition-colors duration-200"
												title="Save"
											>
												<Save size={18} />
											</button>
											<button
												type="button"
												onClick={handleCancelEdit}
												className="p-2 text-muted-foreground hover:bg-accent rounded-lg
												transition-colors duration-200"
												title="Cancel"
											>
												<X size={18} />
											</button>
										</>
									) : (
										<>
											<div
												className="w-8 h-8 rounded-lg border-2 border-border"
												style={{
													backgroundColor: categoryColors[category],
												}}
											/>
											<span className="flex-1 font-medium text-foreground">
												{category}
											</span>
											<button
												type="button"
												onClick={() => handleStartEdit(category)}
												className="p-2 text-primary hover:bg-primary/10 rounded-lg
												transition-colors duration-200"
												title="Edit"
											>
												<Edit2 size={16} />
											</button>
											<button
												type="button"
												onClick={() => handleDeleteClick(category)}
												className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg
												transition-colors duration-200"
												title="Delete"
											>
												<Trash2 size={16} />
											</button>
										</>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			</Modal>

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Confirm Deletion"
				message={`Are you sure you want to delete the category "${deleteModal.category}"? Expenses in this category will be moved to "Other".`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
