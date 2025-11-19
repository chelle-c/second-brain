import { useState } from "react";
import { Plus, Edit2, Trash2, X, Save, Tag } from "lucide-react";
import { useExpenseStore } from "@/stores/useExpenseStore";

interface CategoryManagerProps {
	isOpen: boolean;
	onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose }) => {
	const { categories, categoryColors, addCategory, updateCategory, deleteCategory } =
		useExpenseStore();

	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editColor, setEditColor] = useState("");
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
	const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; category: string }>({
		isOpen: false,
		category: "",
	});

	if (!isOpen) return null;

	const handleAddCategory = () => {
		if (newCategoryName.trim()) {
			addCategory(newCategoryName.trim(), newCategoryColor);
			setNewCategoryName("");
			setNewCategoryColor("#3b82f6");
		}
	};

	const handleStartEdit = (category: string) => {
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
			<div
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn"
				style={{ margin: 0, padding: 0 }}
				onClick={onClose}
			>
				<div
					className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto animate-slideUp"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
							<Tag className="text-sky-500" size={24} />
							Manage Categories
						</h3>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
						>
							<X size={20} />
						</button>
					</div>

					{/* Add New Category */}
					<div className="bg-sky-50 rounded-lg p-4 mb-6">
						<h4 className="text-sm font-semibold text-gray-700 mb-3">
							Add New Category
						</h4>
						<div className="flex gap-3">
							<input
								id="categoryName"
								type="text"
								placeholder="Category name"
								value={newCategoryName}
								onChange={(e) => setNewCategoryName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
								className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg 
									focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder-shown:text-gray-400 placeholder-shown:dark:text-gray-400 placeholder-shown:font-medium"
							/>
							<input
								type="color"
								value={newCategoryColor}
								onChange={(e) => setNewCategoryColor(e.target.value)}
								className="w-12 h-10 border border-gray-300 rounded-sm cursor-pointer **:border-green-500"
								title="Choose category color"
							/>
							<button
								onClick={handleAddCategory}
								disabled={!newCategoryName.trim()}
								className="px-4 py-2 bg-sky-500 text-white rounded-lg 
									hover:bg-sky-600 transition-colors duration-200 
									disabled:bg-gray-300 disabled:cursor-not-allowed
									flex items-center gap-2"
							>
								<Plus size={18} />
								Add
							</button>
						</div>
					</div>

					{/* Categories List */}
					<div>
						<h4 className="text-sm font-semibold text-gray-700 mb-3">
							Existing Categories ({categories.length})
						</h4>
						<div className="space-y-2">
							{categories.map((category) => (
								<div
									key={category}
									className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 
										hover:bg-gray-100 transition-colors duration-200"
								>
									{editingCategory === category ? (
										<>
											<input
												type="color"
												value={editColor}
												onChange={(e) => setEditColor(e.target.value)}
												className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
											/>
											<input
												type="text"
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												onKeyDown={(e) =>
													e.key === "Enter" && handleSaveEdit()
												}
												className="flex-1 px-3 py-2 border border-gray-300 rounded-lg 
													focus:ring-2 focus:ring-sky-400 focus:border-transparent"
												autoFocus
											/>
											<button
												onClick={handleSaveEdit}
												className="p-2 text-green-600 hover:bg-green-100 rounded-lg 
													transition-colors duration-200"
												title="Save"
											>
												<Save size={18} />
											</button>
											<button
												onClick={handleCancelEdit}
												className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg 
													transition-colors duration-200"
												title="Cancel"
											>
												<X size={18} />
											</button>
										</>
									) : (
										<>
											<div
												className="w-8 h-8 rounded-lg border-2 border-gray-300"
												style={{
													backgroundColor: categoryColors[category],
												}}
											/>
											<span className="flex-1 font-medium text-gray-800">
												{category}
											</span>
											<button
												onClick={() => handleStartEdit(category)}
												className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg 
													transition-colors duration-200"
												title="Edit"
											>
												<Edit2 size={16} />
											</button>
											<button
												onClick={() => handleDeleteClick(category)}
												className="p-2 text-red-600 hover:bg-red-100 rounded-lg 
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
			</div>

			{/* Delete Confirmation Modal */}
			{deleteModal.isOpen && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 animate-fadeIn"
					style={{ margin: 0, padding: 0 }}
				>
					<div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-bold text-gray-800">Confirm Deletion</h3>
							<button
								onClick={handleDeleteCancel}
								className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
							>
								<X size={20} />
							</button>
						</div>

						<p className="text-gray-600 mb-6">
							Are you sure you want to delete the category{" "}
							<strong>"{deleteModal.category}"</strong>?
							<br />
							<br />
							<span className="text-sm text-orange-600">
								⚠️ Expenses in this category will be moved to "Other".
							</span>
						</p>

						<div className="flex gap-3">
							<button
								onClick={handleDeleteConfirm}
								className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg 
									hover:bg-red-600 transition-colors duration-200 font-medium
									hover:scale-105 active:scale-95 transform"
							>
								Delete
							</button>
							<button
								onClick={handleDeleteCancel}
								className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg 
									hover:bg-gray-300 transition-colors duration-200 font-medium
									hover:scale-105 active:scale-95 transform"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
