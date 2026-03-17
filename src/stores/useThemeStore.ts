import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { AppToSave } from "@/types";
import {
	DEFAULT_THEME_SETTINGS,
	type ThemeMode,
	type ThemePalette,
	type ThemeSettings,
} from "@/types/theme";
import useAppStore from "./useAppStore";

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

// localStorage key for theme cache (same as used in localStorageCache)
const THEME_CACHE_KEY = "sb_cache_theme";

// Get the OS preferred color scheme
const getSystemTheme = (): "light" | "dark" => {
	if (typeof window !== "undefined" && window.matchMedia) {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

/**
 * Cache theme to localStorage for early application on next startup.
 * This prevents the white flash when using dark mode.
 * Uses the same key structure as localStorageCache for consistency.
 */
const cacheThemeToLocalStorage = (mode: ThemeMode, palette: ThemePalette) => {
	if (typeof localStorage !== "undefined") {
		try {
			localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ mode, palette }));
		} catch {
			// Ignore localStorage errors
		}
	}
};

/**
 * Read cached theme from localStorage.
 * Called very early to prevent flash of wrong theme.
 */
const readCachedTheme = (): { mode: ThemeMode; palette: ThemePalette } | null => {
	if (typeof localStorage !== "undefined") {
		try {
			const cached = localStorage.getItem(THEME_CACHE_KEY);
			if (cached) {
				const parsed = JSON.parse(cached);
				if (
					parsed &&
					typeof parsed.mode === "string" &&
					typeof parsed.palette === "string"
				) {
					return parsed as { mode: ThemeMode; palette: ThemePalette };
				}
			}
		} catch {
			// Ignore errors
		}
	}
	return null;
};

/**
 * Apply theme immediately on module load to prevent flash.
 * This runs before React hydrates.
 */
const applyEarlyTheme = () => {
	const cached = readCachedTheme();
	if (cached) {
		const resolved = resolveTheme(cached.mode);
		applyTheme(resolved);
		applyPalette(cached.palette);
	}
};

// Apply theme immediately when this module loads
applyEarlyTheme();

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

			// Cache for early application on next startup
			cacheThemeToLocalStorage(newMode, newPalette);

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setMode: (mode) => {
			const palette = get().palette;
			const resolvedTheme = resolveTheme(mode);
			set({ mode, resolvedTheme });

			// Apply the theme to DOM
			applyTheme(resolvedTheme);

			// Cache for early application on next startup
			cacheThemeToLocalStorage(mode, palette);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},

		setPalette: (palette) => {
			const mode = get().mode;
			set({ palette });

			// Apply the palette to DOM
			applyPalette(palette);

			// Cache for early application on next startup
			cacheThemeToLocalStorage(mode, palette);

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

			// Cache for early application on next startup
			cacheThemeToLocalStorage(mode, palette);

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

			// Cache for early application on next startup
			cacheThemeToLocalStorage(DEFAULT_THEME_SETTINGS.mode, DEFAULT_THEME_SETTINGS.palette);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.All);
			}
		},
	})),
);
