import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
	icon: LucideIcon;
	onClick: () => void;
	disabled?: boolean;
	title: string;
	ariaLabel: string;
	variant?: "default" | "primary" | "danger" | "active";
	className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
	icon: Icon,
	onClick,
	disabled = false,
	title,
	ariaLabel,
	variant = "default",
	className = "",
}) => {
	const variantClasses = {
		default: "bg-card border border-border hover:bg-accent",
		primary: "bg-primary text-primary-foreground hover:bg-primary/90",
		danger: "bg-red-500 text-white hover:bg-red-600",
		active: "bg-orange-500/10 border-orange-500/30 text-orange-600",
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${className}`}
			title={title}
			aria-label={ariaLabel}
		>
			<Icon size={16} />
		</button>
	);
};
