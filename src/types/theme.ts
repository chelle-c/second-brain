export type ThemeMode = "system" | "light" | "dark";

export type ThemePalette =
	| "sky-cyan"
	| "rose-red"
	| "amber-orange"
	| "lime-green"
	| "teal-emerald"
	| "indigo-violet"
	| "fuchsia-pink";

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
	color: string;
}[] = [
	{
		value: "sky-cyan",
		label: "Sky",
		color: "#0284C7",
	},
	{
		value: "rose-red",
		label: "Rose",
		color: "#E11D48",
	},
	{
		value: "amber-orange",
		label: "Amber",
		color: "#D97706",
	},
	{
		value: "lime-green",
		label: "Lime",
		color: "#65A30D",
	},
	{
		value: "teal-emerald",
		label: "Teal",
		color: "#0D9488",
	},
	{
		value: "indigo-violet",
		label: "Indigo",
		color: "#4F46E5",
	},
	{
		value: "fuchsia-pink",
		label: "Fuchsia",
		color: "#C026D3",
	},
];
