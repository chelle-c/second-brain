import { useState, useRef, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, CreditCard } from "lucide-react";
import { useExpenseStore } from "@/stores/useExpenseStore";

interface PaymentMethodManagerProps {
	isOpen: boolean;
	onClose: () => void;
}

export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({ isOpen, onClose }) => {
	const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } =
		useExpenseStore();

	const [editingMethod, setEditingMethod] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [newMethodName, setNewMethodName] = useState("");
	const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; method: string }>({
		isOpen: false,
		method: "",
	});

	const addInputRef = useRef<HTMLInputElement>(null);
	const editInputRef = useRef<HTMLInputElement>(null);

	// Focus input when adding new method
	useEffect(() => {
		if (isAddingNew && addInputRef.current) {
			addInputRef.current.focus();
		}
	}, [isAddingNew]);

	// Focus input when editing method
	useEffect(() => {
		if (editingMethod && editInputRef.current) {
			editInputRef.current.focus();
		}
	}, [editingMethod]);

	if (!isOpen) return null;

	// Sort methods alphabetically
	const sortedMethods = [...paymentMethods].sort((a, b) =>
		a.toLowerCase().localeCompare(b.toLowerCase())
	);

	const handleStartAddNew = () => {
		// Cancel any editing in progress
		if (editingMethod) {
			handleCancelEdit();
		}
		setIsAddingNew(true);
		setNewMethodName("");
	};

	const handleAddMethod = () => {
		if (newMethodName.trim()) {
			addPaymentMethod(newMethodName.trim());
			setNewMethodName("");
			setIsAddingNew(false);
		}
	};

	const handleCancelAdd = () => {
		setIsAddingNew(false);
		setNewMethodName("");
	};

	const handleAddInputBlur = (e: React.FocusEvent) => {
		// Check if the blur is going to another element within the add section
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (relatedTarget?.closest(".add-method-section")) {
			return;
		}
		handleCancelAdd();
	};

	const handleStartEdit = (method: string) => {
		// Cancel adding if in progress
		if (isAddingNew) {
			handleCancelAdd();
		}
		setEditingMethod(method);
		setEditName(method);
	};

	const handleSaveEdit = () => {
		if (editingMethod && editName.trim()) {
			updatePaymentMethod(editingMethod, editName.trim());
			setEditingMethod(null);
			setEditName("");
		}
	};

	const handleCancelEdit = () => {
		setEditingMethod(null);
		setEditName("");
	};

	const handleEditInputBlur = (e: React.FocusEvent) => {
		// Check if the blur is going to another element within the edit row
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (relatedTarget?.closest(".edit-method-row")) {
			return;
		}
		handleCancelEdit();
	};

	const handleDeleteClick = (method: string) => {
		setDeleteModal({ isOpen: true, method });
	};

	const handleDeleteConfirm = () => {
		deletePaymentMethod(deleteModal.method);
		setDeleteModal({ isOpen: false, method: "" });
	};

	const handleDeleteCancel = () => {
		setDeleteModal({ isOpen: false, method: "" });
	};

	return (
		<>
			<div
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn"
				style={{ margin: 0, padding: 0 }}
				onClick={onClose}
			>
				<div
					className="bg-card rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 animate-slideUp"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
							<CreditCard className="text-primary" size={24} />
							Manage Payment Methods
						</h3>
						<button
							onClick={onClose}
							className="p-2 hover:bg-accent rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
						>
							<X size={20} />
						</button>
					</div>
					<div className="flex flex-col h-full">
						{/* Add New Payment Method */}
						<div className="bg-primary/10 rounded-lg p-4 mb-6 add-method-section">
							<h4 className="text-sm font-semibold text-foreground mb-3">
								Add New Payment Method
							</h4>
							{isAddingNew ? (
								<div className="flex gap-3">
									<input
										ref={addInputRef}
										id="methodName"
										type="text"
										placeholder="Payment method name (e.g., Credit Card, PayPal)"
										value={newMethodName}
										onChange={(e) => setNewMethodName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleAddMethod();
											if (e.key === "Escape") handleCancelAdd();
										}}
										onBlur={handleAddInputBlur}
										className="flex-1 px-3 py-2 bg-background border border-border rounded-lg
										focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground text-foreground"
									/>
									<button
										onClick={handleAddMethod}
										onBlur={handleAddInputBlur}
										disabled={!newMethodName.trim()}
										className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
										hover:bg-primary/90 transition-colors duration-200
										disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
										flex items-center gap-2"
									>
										<Plus size={18} />
										Add
									</button>
									<button
										onClick={handleCancelAdd}
										className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg
										hover:bg-secondary/80 transition-colors duration-200"
									>
										Cancel
									</button>
								</div>
							) : (
								<button
									onClick={handleStartAddNew}
									className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
									hover:bg-primary/90 transition-colors duration-200
									flex items-center gap-2"
								>
									<Plus size={18} />
									Add New Payment Method
								</button>
							)}
						</div>

						{/* Payment Methods List */}
						<div className="overflow-y-auto max-h-[60vh]">
							<h4 className="text-sm font-semibold text-foreground mb-3">
								Existing Payment Methods ({paymentMethods.length})
							</h4>
							<div className="space-y-2">
								{sortedMethods.map((method) => (
									<div
										key={method}
										className={`bg-muted rounded-lg p-3 flex items-center gap-3
										hover:bg-accent transition-colors duration-200 ${
											editingMethod === method ? "edit-method-row" : ""
										}`}
									>
										{editingMethod === method ? (
											<>
												<CreditCard className="w-8 h-8 text-primary" />
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
													onClick={handleSaveEdit}
													onBlur={handleEditInputBlur}
													className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg
													transition-colors duration-200"
													title="Save"
												>
													<Save size={18} />
												</button>
												<button
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
												<CreditCard className="w-8 h-8 text-muted-foreground" />
												<span className="flex-1 font-medium text-foreground">
													{method}
												</span>
												<button
													onClick={() => handleStartEdit(method)}
													className="p-2 text-primary hover:bg-primary/10 rounded-lg
													transition-colors duration-200"
													title="Edit"
												>
													<Edit2 size={16} />
												</button>
												<button
													onClick={() => handleDeleteClick(method)}
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
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{deleteModal.isOpen && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 animate-fadeIn"
					style={{ margin: 0, padding: 0 }}
				>
					<div className="bg-card rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-bold text-card-foreground">
								Confirm Deletion
							</h3>
							<button
								onClick={handleDeleteCancel}
								className="p-1 hover:bg-accent rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
							>
								<X size={20} />
							</button>
						</div>

						<p className="text-muted-foreground mb-6">
							Are you sure you want to delete the payment method{" "}
							<strong className="text-foreground">"{deleteModal.method}"</strong>?
							<br />
							<br />
							<span className="text-sm text-orange-500">
								⚠️ Expenses using this method will be set to "None".
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
								className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg
									hover:bg-secondary/80 transition-colors duration-200 font-medium
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
