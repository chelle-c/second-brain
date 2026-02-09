export type ThemeMode = "system" | "light" | "dark";

export type ThemeFamily = "tailwind" | "catppuccin";

export type ThemePalette =
	| "sky-cyan"
	| "rose-red"
	| "amber-orange"
	| "lime-green"
	| "teal-emerald"
	| "indigo-violet"
	| "fuchsia-pink"
	| "catppuccin-latte"
	| "catppuccin-frappe"
	| "catppuccin-macchiato"
	| "catppuccin-mocha";

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

export const THEME_FAMILY_OPTIONS: { value: ThemeFamily; label: string }[] = [
	{ value: "tailwind", label: "Tailwind" },
	{ value: "catppuccin", label: "Catppuccin" },
];

export const THEME_PALETTE_OPTIONS: {
	value: ThemePalette;
	label: string;
	color: string;
	family: ThemeFamily;
}[] = [
	{
		value: "sky-cyan",
		label: "Sky",
		color: "#0284C7",
		family: "tailwind",
	},
	{
		value: "rose-red",
		label: "Rose",
		color: "#E11D48",
		family: "tailwind",
	},
	{
		value: "amber-orange",
		label: "Amber",
		color: "#D97706",
		family: "tailwind",
	},
	{
		value: "lime-green",
		label: "Lime",
		color: "#65A30D",
		family: "tailwind",
	},
	{
		value: "teal-emerald",
		label: "Teal",
		color: "#0D9488",
		family: "tailwind",
	},
	{
		value: "indigo-violet",
		label: "Indigo",
		color: "#4F46E5",
		family: "tailwind",
	},
	{
		value: "fuchsia-pink",
		label: "Fuchsia",
		color: "#C026D3",
		family: "tailwind",
	},
	{
		value: "catppuccin-latte",
		label: "Latte",
		color: "#7287fd",
		family: "catppuccin",
	},
	{
		value: "catppuccin-frappe",
		label: "Frappé",
		color: "#8caaee",
		family: "catppuccin",
	},
	{
		value: "catppuccin-macchiato",
		label: "Macchiato",
		color: "#7dc4e4",
		family: "catppuccin",
	},
	{
		value: "catppuccin-mocha",
		label: "Mocha",
		color: "#cba6f7",
		family: "catppuccin",
	},
];
