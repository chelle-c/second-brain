import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { chunkSplitPlugin } from "vite-plugin-chunk-split";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [
		react(),
		tailwindcss(),
		tsconfigPaths(),
		chunkSplitPlugin({
			strategy: "default",
			customSplitting: {
				// App folders
				"apps": [/src\/apps/],
				"hooks": [/src\/hooks/],
				"lib": [/src\/lib/],
				"stores": [/src\/stores/],
				"components": [/src\/components/],

				// Vendors
				"lucide-vendor": [/node_modules\/lucide-react/],
				"react-vendor": [/node_modules\/react/, /node_modules\/react-dom/],
				"tailwind-vendor": [/node_modules\/tailwindcss/],

				// Yoopta
				"yoopta-action-menu-list": [/node_modules\/@yoopta\/action-menu-list/],
				"yoopta-blockquote": [/node_modules\/@yoopta\/blockquote/],
				"yoopta-callout": [/node_modules\/@yoopta\/callout/],
				"yoopta-code": [/node_modules\/@yoopta\/code/],
				"yoopta-editor": [/node_modules\/@yoopta\/editor/],
				"yoopta-embed": [/node_modules\/@yoopta\/embed/],
				"yoopta-file": [/node_modules\/@yoopta\/file/],
				"yoopta-headings": [/node_modules\/@yoopta\/headings/],
				"yoopta-image": [/node_modules\/@yoopta\/image/],
				"yoopta-link": [/node_modules\/@yoopta\/link/],
				"yoopta-link-tool": [/node_modules\/@yoopta\/link-tool/],
				"yoopta-lists": [/node_modules\/@yoopta\/lists/],
				"yoopta-marks": [/node_modules\/@yoopta\/marks/],
				"yoopta-paragraph": [/node_modules\/@yoopta\/paragraph/],
				"yoopta-toolbar": [/node_modules\/@yoopta\/toolbar/],
				"yoopta-video": [/node_modules\/@yoopta\/video/],
			},
		}),
	],

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent Vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
			  }
			: undefined,
		watch: {
			// 3. tell Vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
	},
	build: {
		chunkSizeWarningLimit: 2000,
	}
}));
