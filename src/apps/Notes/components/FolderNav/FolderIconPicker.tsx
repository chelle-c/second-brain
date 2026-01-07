import {
	Circle,
	Club,
	Diamond,
	Folder,
	Heart,
	Spade,
	Sparkles,
	Square,
	Star,
	Triangle,
	X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

export const AVAILABLE_ICONS: { icon: LucideIcon; name: string }[] = [
	{ icon: Folder, name: "Folder" },
	{ icon: Star, name: "Star" },
	{ icon: Heart, name: "Heart" },
	{ icon: Square, name: "Square" },
	{ icon: Triangle, name: "Triangle" },
	{ icon: Circle, name: "Circle" },
	{ icon: X, name: "Cross" },
	{ icon: Club, name: "Club" },
	{ icon: Spade, name: "Spade" },
	{ icon: Diamond, name: "Diamond" },
	{ icon: Sparkles, name: "Sparkle" },
];

interface FolderIconPickerProps {
	currentIcon?: LucideIcon;
	onSelect: (icon: LucideIcon) => void;
}

export const FolderIconPicker: React.FC<FolderIconPickerProps> = ({ currentIcon, onSelect }) => {
	const [selectedIcon, setSelectedIcon] = useState<LucideIcon | undefined>(currentIcon);

	const handleSelect = (icon: LucideIcon) => {
		setSelectedIcon(icon);
		onSelect(icon);
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-4 gap-2">
				{AVAILABLE_ICONS.map(({ icon: Icon, name }) => {
					const isSelected = selectedIcon === Icon || currentIcon === Icon;

					return (
						<button
							key={name}
							type="button"
							onClick={() => handleSelect(Icon)}
							className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent ${
								isSelected ? "border-primary bg-primary/10" : "border-border"
							}`}
							title={name}
						>
							<Icon size={24} />
							<span className="text-xs">{name}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
