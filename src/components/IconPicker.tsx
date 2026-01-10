import {
	AlertCircle,
	Banknote,
	Bookmark,
	BookOpen,
	Calendar,
	CheckCircle,
	Circle,
	Clock,
	Club,
	Code,
	Coffee,
	Coins,
	Diamond,
	Edit3,
	FileText,
	Flag,
	Flame,
	Folder,
	Gift,
	Glasses,
	Globe,
	Heart,
	Home,
	Key,
	Landmark,
	Lightbulb,
	Link,
	List,
	Mail,
	MapPin,
	MessageCircle,
	Moon,
	Music,
	Palette,
	Paintbrush,
	Paperclip,
	Phone,
	Play,
	Settings,
	Spade,
	Sparkles,
	Square,
	Star,
	Sun,
	Tag as TagIcon,
	Target,
	Triangle,
	Truck,
	User,
	Users,
	WalletCards,
	Zap,
	type LucideIcon,
} from "lucide-react";

export interface IconOption {
	icon: LucideIcon;
	name: string;
}

// Comprehensive list of available icons for tags and folders
// IMPORTANT: The "name" must match the Lucide icon name exactly for serialization to work
export const AVAILABLE_ICONS: IconOption[] = [
	{ icon: TagIcon, name: "Tag" },
	{ icon: Folder, name: "Folder" },
	{ icon: Star, name: "Star" },
	{ icon: Bookmark, name: "Bookmark" },
	{ icon: Flag, name: "Flag" },
	{ icon: CheckCircle, name: "CheckCircle" },
	{ icon: AlertCircle, name: "AlertCircle" },
	{ icon: Lightbulb, name: "Lightbulb" },
	{ icon: Zap, name: "Zap" },
	{ icon: Flame, name: "Flame" },
	{ icon: Target, name: "Target" },
	{ icon: Circle, name: "Circle" },
	{ icon: Square, name: "Square" },
	{ icon: Triangle, name: "Triangle" },
	{ icon: BookOpen, name: "BookOpen" },
	{ icon: FileText, name: "FileText" },
	{ icon: Edit3, name: "Edit3" },
	{ icon: Code, name: "Code" },
	{ icon: Link, name: "Link" },
	{ icon: Paperclip, name: "Paperclip" },
	{ icon: List, name: "List" },
	{ icon: Calendar, name: "Calendar" },
	{ icon: Clock, name: "Clock" },
	{ icon: User, name: "User" },
	{ icon: Users, name: "Users" },
	{ icon: Home, name: "Home" },
	{ icon: MapPin, name: "MapPin" },
	{ icon: Globe, name: "Globe" },
	{ icon: Truck, name: "Truck" },
	{ icon: Mail, name: "Mail" },
	{ icon: Phone, name: "Phone" },
	{ icon: MessageCircle, name: "MessageCircle" },
	{ icon: Music, name: "Music" },
	{ icon: Play, name: "Play" },
	{ icon: Coffee, name: "Coffee" },
	{ icon: Gift, name: "Gift" },
	{ icon: Palette, name: "Palette" },
	{ icon: Settings, name: "Settings" },
	{ icon: Sparkles, name: "Sparkles" },
	{ icon: Club, name: "Club" },
	{ icon: Spade, name: "Spade" },
	{ icon: Heart, name: "Heart" },
	{ icon: Diamond, name: "Diamond" },
	{ icon: Moon, name: "Moon" },
	{ icon: Sun, name: "Sun" },
	{ icon: Paintbrush, name: "Paintbrush" },
	{ icon: Coins, name: "Coins" },
	{ icon: Banknote, name: "Banknote" },
	{ icon: Glasses, name: "Glasses" },
	{ icon: Landmark, name: "Landmark" },
	{ icon: Key, name: "Key" },
	{ icon: WalletCards, name: "WalletCards" },
];

// Default icons for different contexts
export const DEFAULT_TAG_ICON = TagIcon;
export const DEFAULT_FOLDER_ICON = Folder;

// Create a WeakMap for O(1) icon-to-name lookup without relying on displayName
const ICON_TO_NAME = new WeakMap<LucideIcon, string>();
for (const opt of AVAILABLE_ICONS) {
	ICON_TO_NAME.set(opt.icon, opt.name);
}

// Also create a displayName map as fallback for icons from other modules
const DISPLAY_NAME_TO_ICON_NAME: Record<string, string> = {};
for (const opt of AVAILABLE_ICONS) {
	// Use the name we assigned, which matches the Lucide icon name
	DISPLAY_NAME_TO_ICON_NAME[opt.name] = opt.name;
}

// Get icon name from an icon component (for serialization)
export const getIconNameFromComponent = (icon: LucideIcon | undefined): string | null => {
	if (!icon) return null;

	// First try WeakMap lookup (works for icons from this module)
	const fromWeakMap = ICON_TO_NAME.get(icon);
	if (fromWeakMap) return fromWeakMap;

	// Try displayName property (works for icons from other modules)
	const iconComponent = icon as unknown as { displayName?: string };
	if (iconComponent.displayName && DISPLAY_NAME_TO_ICON_NAME[iconComponent.displayName]) {
		return DISPLAY_NAME_TO_ICON_NAME[iconComponent.displayName];
	}

	// Return displayName directly if it exists
	if (iconComponent.displayName) {
		return iconComponent.displayName;
	}

	return null;
};

// Helper to get a valid icon component with fallback
// Note: Lucide icons using forwardRef are objects, not functions
export const getValidIcon = (
	icon: LucideIcon | undefined,
	fallback: LucideIcon = TagIcon
): LucideIcon => {
	// Check if icon is a valid React component (function or forwardRef object)
	if (icon && (typeof icon === "function" || typeof icon === "object")) {
		return icon;
	}
	return fallback;
};

// Find an icon by name
export const findIconByName = (name: string): LucideIcon | undefined => {
	return AVAILABLE_ICONS.find(
		(opt) => opt.name.toLowerCase() === name.toLowerCase()
	)?.icon;
};

type IconPickerVariant = "compact" | "default" | "large";

interface IconPickerProps {
	currentIcon?: LucideIcon;
	onSelect: (icon: LucideIcon) => void;
	variant?: IconPickerVariant;
	showLabels?: boolean;
	columns?: number;
}

export const IconPicker: React.FC<IconPickerProps> = ({
	currentIcon,
	onSelect,
	variant = "default",
	showLabels = false,
	columns,
}) => {
	const getGridCols = () => {
		if (columns) return columns;
		switch (variant) {
			case "compact":
				return 6;
			case "large":
				return 4;
			default:
				return 6;
		}
	};

	const getButtonStyles = () => {
		switch (variant) {
			case "compact":
				return "p-1.5";
			case "large":
				return "p-4";
			default:
				return "p-2";
		}
	};

	const getIconSize = () => {
		switch (variant) {
			case "compact":
				return 14;
			case "large":
				return 24;
			default:
				return 18;
		}
	};

	const gridCols = getGridCols();

	return (
		<div
			className={`grid gap-${variant === "compact" ? "1" : "2"}`}
			style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
		>
			{AVAILABLE_ICONS.map(({ icon: IconComponent, name }) => {
				const isSelected = currentIcon === IconComponent;
				return (
					<button
						key={name}
						type="button"
						onClick={() => onSelect(IconComponent)}
						className={`${getButtonStyles()} rounded-lg border transition-all cursor-pointer ${
							showLabels ? "flex flex-col items-center justify-center gap-2" : ""
						} ${
							isSelected
								? "border-primary bg-primary/10 text-primary"
								: "border-border hover:border-primary/50 hover:bg-accent text-muted-foreground hover:text-foreground"
						}`}
						title={name}
					>
						<IconComponent size={getIconSize()} />
						{showLabels && <span className="text-xs">{name}</span>}
					</button>
				);
			})}
		</div>
	);
};
