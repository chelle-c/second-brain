import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [react(), tailwindcss(), tsconfigPaths()],

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
		rollupOptions: {
			output: {
				manualChunks: {
					// Core React vendor chunk
					"vendor-react": ["react", "react-dom", "react-router"],
					// UI framework chunk
					"vendor-radix": [
						"@radix-ui/react-dialog",
						"@radix-ui/react-dropdown-menu",
						"@radix-ui/react-tabs",
						"@radix-ui/react-tooltip",
						"@radix-ui/react-scroll-area",
						"@radix-ui/react-select",
						"@radix-ui/react-slot",
					],
					// State management
					"vendor-zustand": ["zustand"],
				},
			},
		},
	},
}));
