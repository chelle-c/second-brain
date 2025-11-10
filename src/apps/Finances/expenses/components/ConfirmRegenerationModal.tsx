import { AlertTriangle, X } from "lucide-react";

interface ConfirmRegenerationModalProps {
	isOpen: boolean;
	modifiedCount: number;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmRegenerationModal: React.FC<ConfirmRegenerationModalProps> = ({
	isOpen,
	modifiedCount,
	onConfirm,
	onCancel,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 animate-fadeIn"
			style={{ margin: 0, padding: 0 }}
		>
			<div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slideUp">
				<div className="flex justify-between items-start mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-orange-100 rounded-lg">
							<AlertTriangle className="text-orange-600" size={24} />
						</div>
						<h3 className="text-lg font-bold text-gray-800">Confirm Changes</h3>
					</div>
					<button
						onClick={onCancel}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
					>
						<X size={20} />
					</button>
				</div>

				<div className="mb-6">
					<p className="text-gray-700 mb-3">
						The changes you're making will regenerate all expense occurrences.
					</p>

					{modifiedCount > 0 && (
						<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
							<p className="text-orange-800 text-sm font-medium">
								⚠️ Warning: {modifiedCount} occurrence
								{modifiedCount !== 1 ? "s have" : " has"} been manually edited
							</p>
							<p className="text-orange-700 text-sm mt-1">
								Occurrences that match by date will keep their modifications. Others
								will be lost.
							</p>
						</div>
					)}

					<p className="text-gray-600 text-sm">
						You can always reset individual occurrences to their original values later if needed.
					</p>
				</div>

				<div className="flex gap-3">
					<button
						onClick={onConfirm}
						className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg 
							hover:bg-orange-600 transition-colors duration-200 font-medium
							hover:scale-105 active:scale-95 transform"
					>
						Confirm Changes
					</button>
					<button
						onClick={onCancel}
						className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg 
							hover:bg-gray-300 transition-colors duration-200 font-medium
							hover:scale-105 active:scale-95 transform"
					>
						Go Back
					</button>
				</div>
			</div>
		</div>
	);
};
