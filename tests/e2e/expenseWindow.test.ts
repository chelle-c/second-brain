import { Builder, By, until, WebDriver } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";

// Path to your debug build
const APP_BINARY = path.resolve(__dirname, "../../src-tauri/target/debug/second-brain");

describe("Expense form window (E2E)", () => {
	let driver: WebDriver;

	beforeAll(async () => {
		driver = await new Builder()
			.usingServer("http://127.0.0.1:4444")
			.withCapabilities({
				"tauri:options": { application: APP_BINARY },
				browserName: "wry",
			})
			.build();
	});

	afterAll(async () => {
		await driver?.quit();
	});

	it("opens a second window when the + button is clicked", async () => {
		// Wait for main window to render the expenses module
		// (assumes you navigate to /expenses or similar)
		await driver.wait(until.elementLocated(By.xpath("//*[text()='Add Expense']")), 10_000);

		// One window to start
		let handles = await driver.getAllWindowHandles();
		expect(handles).toHaveLength(1);
		const mainHandle = handles[0];

		// Click the + button
		const addBtn = await driver.findElement(
			By.xpath("//span[text()='Add Expense']/parent::button"),
		);
		await addBtn.click();

		// Wait for second window
		await driver.wait(async () => {
			handles = await driver.getAllWindowHandles();
			return handles.length === 2;
		}, 5_000);

		// Switch into the form window
		const formHandle = handles.find((h) => h !== mainHandle)!;
		await driver.switchTo().window(formHandle);

		// Assert form rendered
		await driver.wait(until.elementLocated(By.xpath("//*[text()='Add New Expense']")), 5_000);

		// Fill and submit
		const nameInput = await driver.findElement(
			By.css("input[placeholder='Enter expense name']"),
		);
		await nameInput.sendKeys("E2E Test Expense");

		const amountInput = await driver.findElement(By.css("input[placeholder='0.00']"));
		await amountInput.clear();
		await amountInput.sendKeys("42.00");

		const submit = await driver.findElement(By.xpath("//button[contains(., 'Add Expense')]"));
		await submit.click();

		// Window should close; wait for handle count to drop
		await driver.wait(async () => {
			const h = await driver.getAllWindowHandles();
			return h.length === 1;
		}, 5_000);

		// Switch back to main and verify the expense appeared
		await driver.switchTo().window(mainHandle);
		await driver.wait(until.elementLocated(By.xpath("//*[text()='E2E Test Expense']")), 5_000);
	});
});
