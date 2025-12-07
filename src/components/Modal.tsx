import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	description,
	children,
	className,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className={cn("sm:max-w-md", className)}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="mt-2">{children}</div>
			</DialogContent>
		</Dialog>
	);
};
