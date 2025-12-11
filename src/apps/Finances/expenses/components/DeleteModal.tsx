import { ConfirmationModal } from "@/components/ConfirmationModal";

interface DeleteModalProps {
	isOpen: boolean;
	expenseName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
	isOpen,
	expenseName,
	onConfirm,
	onCancel,
}) => {
	return (
		<ConfirmationModal
			isOpen={isOpen}
			title="Confirm Deletion"
			message={`Are you sure you want to delete "${expenseName}"? This action cannot be undone.`}
			confirmLabel="Delete"
			cancelLabel="Cancel"
			variant="danger"
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>
	);
};
