import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { EXPENSE_FORM_CLOSED_EVENT } from "@/hooks/useExpenseFormBridge";
import type { Expense } from "@/types/expense";

interface ExpenseFormProps {
	editingExpense?: Expense | null;
	onClose?: () => void;
	isGlobalEdit?: boolean;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
	editingExpense,
	isGlobalEdit = false,
}) => {
	const lastOpenedId = useRef<string | null>(null);
	const isOpening = useRef(false);

	// Listen for the OS X button close so we reset state and allow re-edit
	useEffect(() => {
		let unlisten: (() => void) | undefined;

		listen(EXPENSE_FORM_CLOSED_EVENT, () => {
			lastOpenedId.current = null;
			isOpening.current = false;
		}).then((fn) => {
			unlisten = fn;
		});

		return () => {
			unlisten?.();
		};
	}, []);

	useEffect(() => {
		if (!editingExpense) {
			lastOpenedId.current = null;
			isOpening.current = false;
			return;
		}

		if (lastOpenedId.current === editingExpense.id) return;
		if (isOpening.current) return;

		lastOpenedId.current = editingExpense.id;
		isOpening.current = true;

		invoke("open_expense_form_window", {
			args: {
				expense_id: editingExpense.id,
				is_global_edit: isGlobalEdit,
			},
		})
			.catch((err: unknown) => {
				console.error("Failed to open expense form window:", err);
				lastOpenedId.current = null;
			})
			.finally(() => {
				isOpening.current = false;
			});
	}, [editingExpense?.id, isGlobalEdit]);

	if (editingExpense) {
		return null;
	}

	const handleOpenNew = () => {
		if (isOpening.current) return;
		isOpening.current = true;

		invoke("open_expense_form_window", {
			args: {
				expense_id: null,
				is_global_edit: false,
			},
		})
			.catch((err: unknown) => {
				console.error("Failed to open expense form window:", err);
			})
			.finally(() => {
				isOpening.current = false;
			});
	};

	return (
		<button
			type="button"
			onClick={handleOpenNew}
			className="fixed bottom-8 right-12 bg-primary text-primary-foreground p-4 rounded-full
				shadow-xl hover:bg-primary/90 hover:scale-110 transition-all duration-200
				active:scale-95 z-40 group"
		>
			<Plus size={24} />
			<span
				className="absolute right-full mr-3 top-1/2 -translate-y-1/2
					bg-popover text-popover-foreground px-3 py-1 rounded-lg text-sm
					opacity-0 group-hover:opacity-100 transition-opacity duration-200
					whitespace-nowrap shadow-lg border border-border"
			>
				Add Expense
			</span>
		</button>
	);
};
