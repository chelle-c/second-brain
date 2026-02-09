import { Monitor, Moon, Palette, Sun } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import {
	THEME_FAMILY_OPTIONS,
	THEME_MODE_OPTIONS,
	THEME_PALETTE_OPTIONS,
	type ThemeFamily,
	type ThemeMode,
	type ThemePalette,
} from "@/types/theme";

const getThemeModeIcon = (mode: ThemeMode) => {
	switch (mode) {
		case "system":
			return <Monitor className="w-4 h-4" />;
		case "light":
			return <Sun className="w-4 h-4" />;
		case "dark":
			return <Moon className="w-4 h-4" />;
	}
};

export const AppearanceSettings = () => {
	const {
		mode: themeMode,
		setMode: setThemeMode,
		palette,
		setPalette,
	} = useThemeStore();

	const currentFamily = useMemo(
		() =>
			THEME_PALETTE_OPTIONS.find((o) => o.value === palette)?.family ??
			"tailwind",
		[palette],
	);

	const filteredPalettes = useMemo(
		() => THEME_PALETTE_OPTIONS.filter((o) => o.family === currentFamily),
		[currentFamily],
	);

	const handleFamilyChange = (family: ThemeFamily) => {
		if (family === currentFamily) return;
		const firstPalette = THEME_PALETTE_OPTIONS.find(
			(o) => o.family === family,
		);
		if (firstPalette) {
			setPalette(firstPalette.value);
		}
	};

	return (
		<Card id="appearance" className="scroll-mt-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Palette className="w-5 h-5" />
					Appearance
				</CardTitle>
				<CardDescription>
					Customize the look and feel of the app
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Theme</Label>
						<p className="text-sm text-muted-foreground">
							Choose between light and dark mode
						</p>
					</div>
					<Select
						value={themeMode}
						onValueChange={(value) => setThemeMode(value as ThemeMode)}
					>
						<SelectTrigger className="w-[200px]">
							<div className="flex items-center gap-2">
								<SelectValue placeholder="Select theme" />
							</div>
						</SelectTrigger>
						<SelectContent>
							{THEME_MODE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex items-center gap-2">
										{getThemeModeIcon(option.value)}
										{option.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Theme Name</Label>
						<p className="text-sm text-muted-foreground">
							Select a theme family
						</p>
					</div>
					<Select
						value={currentFamily}
						onValueChange={(value) =>
							handleFamilyChange(value as ThemeFamily)
						}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select theme name" />
						</SelectTrigger>
						<SelectContent>
							{THEME_FAMILY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Color Scheme</Label>
						<p className="text-sm text-muted-foreground">
							Select your preferred color palette
						</p>
					</div>
					<Select
						value={palette}
						onValueChange={(value) => setPalette(value as ThemePalette)}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select color scheme" />
						</SelectTrigger>
						<SelectContent>
							{filteredPalettes.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex items-center gap-2">
										<span
											className="w-3 h-3 rounded-full shrink-0"
											style={{ backgroundColor: option.color }}
										/>
										<span>{option.label}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	);
};
