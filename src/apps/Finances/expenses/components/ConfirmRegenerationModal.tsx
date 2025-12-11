import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

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
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
							<AlertTriangle className="text-orange-600 dark:text-orange-400" size={24} />
						</div>
						<DialogTitle>Confirm Changes</DialogTitle>
					</div>
					<DialogDescription className="pt-2">
						The changes you're making will regenerate all expense occurrences.
					</DialogDescription>
				</DialogHeader>

				<div className="py-2">
					{modifiedCount > 0 && (
						<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-3">
							<p className="text-orange-800 dark:text-orange-300 text-sm font-medium">
								Warning: {modifiedCount} occurrence
								{modifiedCount !== 1 ? "s have" : " has"} been manually edited
							</p>
							<p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
								Occurrences that match by date will keep their modifications. Others
								will be lost.
							</p>
						</div>
					)}

					<p className="text-muted-foreground text-sm">
						You can always reset individual occurrences to their original values later if needed.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Go Back
					</Button>
					<Button
						className="bg-orange-500 hover:bg-orange-600 text-white"
						onClick={onConfirm}
					>
						Confirm Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
