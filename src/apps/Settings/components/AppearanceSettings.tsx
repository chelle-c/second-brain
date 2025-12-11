import { Palette, Monitor, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ThemeMode, THEME_MODE_OPTIONS } from "@/types/theme";
import { useThemeStore } from "@/stores/useThemeStore";

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
	const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

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
			</CardContent>
		</Card>
	);
};
