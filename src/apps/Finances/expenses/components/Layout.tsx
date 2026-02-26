import { invoke } from "@tauri-apps/api/core";
import { useRef } from "react";
import { Plus, Redo2, Undo2 } from "lucide-react";
import { AnimatedToggle } from "@/components/AnimatedToggle";

interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all" | "upcoming";
	setCurrentView: (view: "monthly" | "all" | "upcoming") => void;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
	children,
	currentView,
	setCurrentView,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
}) => {
	const isOpening = useRef(false);

	const handleAddExpense = () => {
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
	const viewModeOptions = [
		{
			label: "Upcoming",
			value: "upcoming" as const,
			ariaLabel: "Upcoming expenses view",
		},
		{
			label: "Monthly",
			value: "monthly" as const,
			ariaLabel: "Monthly expenses view",
		},
		{
			label: "All",
			value: "all" as const,
			ariaLabel: "All expenses",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] rounded-lg p-2">
			<header className="animate-fadeIn mb-4">
				<h1 className="sr-only">Expense Tracker</h1>
				<div className="flex items-center justify-between mb-4">
					<div className="w-min">
						<AnimatedToggle
							options={viewModeOptions}
							value={currentView}
							onChange={(value) => setCurrentView(value)}
						/>
					</div>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onUndo}
							disabled={!canUndo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Undo (Ctrl+Z)"
						>
							<Undo2 size={18} />
						</button>
						<button
							type="button"
							onClick={onRedo}
							disabled={!canRedo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Redo (Ctrl+Y)"
						>
							<Redo2 size={18} />
						</button>
						<div className="w-px h-5 bg-border mx-1" />
						<button
							type="button"
							onClick={handleAddExpense}
							className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors cursor-pointer"
							title="Add Expense"
						>
							<Plus size={18} />
						</button>
					</div>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
};
