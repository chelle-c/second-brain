import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import {
	ThemeMode,
	ThemePalette,
	ThemeSettings,
	DEFAULT_THEME_SETTINGS,
} from "@/types/theme";
import { AppToSave } from "@/types";

interface ThemeStore extends ThemeSettings {
	// Computed - the actual theme being displayed (resolved from system)
	resolvedTheme: "light" | "dark";

	// Actions
	setThemeSettings: (settings: Partial<ThemeSettings>, skipSave?: boolean) => void;
	setMode: (mode: ThemeMode) => void;
	setPalette: (palette: ThemePalette) => void;
	initializeTheme: () => void;
	resetToDefaults: () => void;
}

// Get the OS preferred color scheme
const getSystemTheme = (): "light" | "dark" => {
	if (typeof window !== "undefined" && window.matchMedia) {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}
	return "light";
};

// Apply theme class to document
const applyTheme = (theme: "light" | "dark") => {
	if (typeof document !== "undefined") {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}
};

// Apply palette to document
const applyPalette = (palette: ThemePalette) => {
	if (typeof document !== "undefined") {
		document.documentElement.setAttribute("data-palette", palette);
	}
};

// Resolve the actual theme from mode
const resolveTheme = (mode: ThemeMode): "light" | "dark" => {
	if (mode === "system") {
		return getSystemTheme();
	}
	return mode;
};

export const useThemeStore = create<ThemeStore>()(
	subscribeWithSelector((set, get) => ({
		...DEFAULT_THEME_SETTINGS,
		resolvedTheme: resolveTheme(DEFAULT_THEME_SETTINGS.mode),

		setThemeSettings: (settings, skipSave = false) => {
			const currentMode = get().mode;
			const currentPalette = get().palette;
			const newMode = settings.mode ?? currentMode;
			const newPalette = settings.palette ?? currentPalette;
			const newResolvedTheme = resolveTheme(newMode);

			set({
				...settings,
				resolvedTheme: newResolvedTheme,
			});

			// Apply the theme and palette to DOM
			applyTheme(newResolvedTheme);
			applyPalette(newPalette);

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setMode: (mode) => {
			const resolvedTheme = resolveTheme(mode);
			set({ mode, resolvedTheme });

			// Apply the theme to DOM
			applyTheme(resolvedTheme);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setPalette: (palette) => {
			set({ palette });

			// Apply the palette to DOM
			applyPalette(palette);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		initializeTheme: () => {
			const { mode, palette } = get();
			const resolvedTheme = resolveTheme(mode);
			set({ resolvedTheme });
			applyTheme(resolvedTheme);
			applyPalette(palette);

			// Listen for system theme changes
			if (typeof window !== "undefined" && window.matchMedia) {
				const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
				const handleChange = () => {
					const currentMode = get().mode;
					if (currentMode === "system") {
						const newResolvedTheme = getSystemTheme();
						set({ resolvedTheme: newResolvedTheme });
						applyTheme(newResolvedTheme);
					}
				};

				// Use addEventListener for modern browsers
				mediaQuery.addEventListener("change", handleChange);
			}
		},

		resetToDefaults: () => {
			const resolvedTheme = resolveTheme(DEFAULT_THEME_SETTINGS.mode);
			set({
				...DEFAULT_THEME_SETTINGS,
				resolvedTheme,
			});
			applyTheme(resolvedTheme);
			applyPalette(DEFAULT_THEME_SETTINGS.palette);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},
	}))
);
