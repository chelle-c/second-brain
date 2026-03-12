import { spawn, ChildProcess } from "node:child_process";

let tauriDriver: ChildProcess;

export async function setup() {
	// Build the app first (must be a debug build for tauri-driver)
	// Assumes you've run: cargo tauri build --debug
	tauriDriver = spawn("tauri-driver", [], {
		stdio: [null, process.stdout, process.stderr],
	});

	// Give it a moment to bind to :4444
	await new Promise((r) => setTimeout(r, 2000));
}

export async function teardown() {
	tauriDriver?.kill();
}
