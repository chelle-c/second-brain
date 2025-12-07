export type ThemeMode = "system" | "light" | "dark";

export type ThemePalette = "sky-cyan"; // Add more palettes here as needed

export interface ThemeSettings {
	mode: ThemeMode;
	palette: ThemePalette;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
	mode: "system",
	palette: "sky-cyan",
};

export const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
	{ value: "system", label: "System" },
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
];

export const THEME_PALETTE_OPTIONS: {
	value: ThemePalette;
	label: string;
	description: string;
}[] = [
	{
		value: "sky-cyan",
		label: "Sky & Cyan",
		description: "Default blue theme",
	},
	// Add more palettes here as needed
];
