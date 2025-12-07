import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteModalProps {
	isOpen: boolean;
	expenseName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, expenseName, onConfirm, onCancel }) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Confirm Deletion</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete <strong>"{expenseName}"</strong>? This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-3 mt-4">
					<Button
						variant="destructive"
						onClick={onConfirm}
						className="flex-1"
					>
						Delete
					</Button>
					<Button
						variant="secondary"
						onClick={onCancel}
						className="flex-1"
					>
						Cancel
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
