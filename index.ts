import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();

const pupeteerHandler = handler({
	resolve: async (params: any) => {
		const browser = await puppeteer.launch({
			headless: false, //  debug mode
			defaultViewport: null, //Defaults to an 800x600 viewport
			userDataDir: "./user_data",
		});
		try {
			const context = browser.defaultBrowserContext();
			const page = await browser.newPage();

			await context.overridePermissions("https://tradingview.com", [
				"clipboard-read",
				"clipboard-write",
			]);

			await page.goto(params.body.chart);

			// check if page  has loaded
			await page.waitForSelector(".first-_hkHmHWX");
			await page.waitForSelector("#header-toolbar-screenshot");

			// click screenshot icon
			await page.click("#header-toolbar-screenshot");
			await page.click(
				'div[data-name="copy-link-to-the-chart-image"] .labelRow-RhC5uhZw'
			);

			await page.waitForSelector(".container-success-Layw3R3g");

			const copiedText = await page.evaluate(() =>
				navigator.clipboard.readText()
			);

			return copiedText;
		} catch (error) {
			console.error(error);
		} finally {
			await browser.close();
		}
	},
});

const routes = {
	chart: pupeteerHandler,
};
app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
	console.log(`Listening on port 8081`);
});
