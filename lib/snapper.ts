import { chromium } from "playwright";

const snapper = async (chUrl) => {
  const chart = new URL(chUrl);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext();
    await context.grantPermissions(["notifications"]);
    const page = await browser.newPage({
      viewport: null,
    });
    const user: any = process.env.username;
    const pass: any = process.env.password;
    const ticker = chart.search.split("=")[1].split("&")[0];
    await page.goto(chart.origin, { waitUntil: "load" });
    await page.click(".tv-header__user-menu-button--anonymous");
    await page.click("button[data-name='header-user-menu-sign-in']");
    await page.click(".tv-signin-dialog__toggle-email");
    await page.locator("input[name=username]").fill(user);
    await page.locator("input[name=password]").fill(pass);
    await page.click("button[type=submit]");
    await page.waitForSelector(".is-authenticated");

    await page.goto(chart.href, { waitUntil: "load" });
    await page.click("#header-toolbar-screenshot");
    // click screenshot icon

    const newPagePromise = page.waitForEvent("popup");
    await page.click(
      'div[data-name="open-image-in-new-tab"] .labelRow-RhC5uhZw'
    );

    await page.screenshot({
      path: `./dist/data/${ticker + Date.now()}_screenshot.jpg`,
    });

    const tvSnap = await newPagePromise;
    await tvSnap.waitForLoadState();

    await tvSnap.waitForSelector(".tv-snapshot-image");
    const chartImg = tvSnap.locator(".tv-snapshot-image");

    const chartLink = await tvSnap.url();
    const chartSrc = await chartImg.getAttribute("src");

    return chartSrc;
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
};

export default snapper;
