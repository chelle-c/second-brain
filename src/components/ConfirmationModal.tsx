import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/Portal";

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
	const confirmButtonRef = useRef<HTMLButtonElement>(null);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen) {
			cancelButtonRef.current?.focus();
		}
	}, [isOpen]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return;

			if (e.key === "Escape") {
				onCancel();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const variantStyles = {
		danger: {
			icon: "text-red-500",
			button: "bg-red-500 hover:bg-red-600 text-white",
		},
		warning: {
			icon: "text-amber-500",
			button: "bg-amber-500 hover:bg-amber-600 text-white",
		},
		default: {
			icon: "text-sky-500",
			button: "bg-sky-500 hover:bg-sky-600 text-white",
		},
	};

	const styles = variantStyles[variant];

	return (
		<Portal>
			{/* Overlay */}
			<div className="fixed inset-0 bg-black/50 z-100" onClick={onCancel} />

			{/* Modal */}
			<div className="fixed inset-0 z-101 flex items-center justify-center p-4">
				<div
					className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn"
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-title"
				>
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<div className="flex items-center gap-3">
							<AlertTriangle className={styles.icon} size={24} />
							<h2 id="modal-title" className="text-lg font-semibold">
								{title}
							</h2>
						</div>
						<button
							onClick={onCancel}
							className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
						>
							<X size={20} />
						</button>
					</div>

					{/* Content */}
					<div className="p-4">
						<p className="text-gray-600">{message}</p>
					</div>

					{/* Footer */}
					<div className="flex justify-end gap-3 p-4 border-t">
						<Button
							ref={cancelButtonRef}
							variant="outline"
							onClick={onCancel}
							className="cursor-pointer"
						>
							{cancelLabel}
						</Button>
						<Button
							ref={confirmButtonRef}
							className={`${styles.button} cursor-pointer`}
							onClick={onConfirm}
						>
							{confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</Portal>
	);
}
