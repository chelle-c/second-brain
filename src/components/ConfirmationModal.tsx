import { useEffect, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "danger" | "warning" | "default";
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmationModal({
	isOpen,
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	variant = "default",
	onConfirm,
	onCancel,
}: ConfirmationModalProps) {
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen) {
			// Focus the cancel button when modal opens
			setTimeout(() => cancelButtonRef.current?.focus(), 0);
		}
	}, [isOpen]);

	const variantConfig = {
		danger: {
			icon: AlertTriangle,
			iconClass: "text-red-500",
			buttonVariant: "destructive" as const,
		},
		warning: {
			icon: AlertTriangle,
			iconClass: "text-amber-500",
			buttonVariant: "default" as const,
			buttonClass: "bg-amber-500 hover:bg-amber-600 text-white",
		},
		default: {
			icon: Info,
			iconClass: "text-sky-500",
			buttonVariant: "default" as const,
			buttonClass: "bg-sky-500 hover:bg-sky-600 text-white",
		},
	};

	const config = variantConfig[variant];
	const Icon = config.icon;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<Icon className={config.iconClass} size={24} />
						<DialogTitle>{title}</DialogTitle>
					</div>
					<DialogDescription className="pt-2">{message}</DialogDescription>
				</DialogHeader>

				<DialogFooter className="mt-4">
					<Button
						ref={cancelButtonRef}
						variant="outline"
						onClick={onCancel}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={config.buttonVariant}
						className={cn("buttonClass" in config && config.buttonClass)}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
