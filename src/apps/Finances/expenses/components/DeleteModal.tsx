import { X } from "lucide-react";

interface DeleteModalProps {
	isOpen: boolean;
	expenseName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, expenseName, onConfirm, onCancel }) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn"
			style={{ margin: 0, padding: 0 }}
		>
			<div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-bold text-gray-800">Confirm Deletion</h3>
					<button
						onClick={onCancel}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
					>
						<X size={20} />
					</button>
				</div>

				<p className="text-gray-600 mb-6">
					Are you sure you want to delete <strong>"{expenseName}"</strong>? This action
					cannot be undone.
				</p>

				<div className="flex gap-3">
					<button
						onClick={onConfirm}
						className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg 
					 hover:bg-red-600 transition-colors duration-200 font-medium
					 hover:scale-105 active:scale-95 transform"
					>
						Delete
					</button>
					<button
						onClick={onCancel}
						className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg 
					 hover:bg-gray-300 transition-colors duration-200 font-medium
					 hover:scale-105 active:scale-95 transform"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};
