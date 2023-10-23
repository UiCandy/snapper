import { chromium } from "playwright";

const snapper = async (chUrl) => {
  const chart = new URL(chUrl);
  const browser = await chromium.launchPersistentContext("./data/udd", {
    headless: false,
    viewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=960,600",
      "--use-gl=egl",
      "--ignore-gpu-blocklist",
    ],
  });

  try {
    // const context = await browser.new
    // await context.grantPermissions(["notifications"]);
    const page = await browser.newPage();
    const ticker = chart.search.split("=")[1].split("&")[0];

    if (!page.waitForSelector(".is-authenticated")) {
      const user: any = process.env.USERNAME;
      const pass: any = process.env.PASSWORD;
      const code: any = process.env.BCODE;

      await page.goto(chart.origin, { waitUntil: "load" });
      await page.click(".tv-header__user-menu-button--anonymous");
      await page.click("button[data-name='header-user-menu-sign-in']");
      await page.click("button[name='Email']");
      await page.click("span.label-vyj6oJxw");
      await page.locator("input[name=id_username]").fill(user);
      await page.locator("input[name=id_password]").fill(pass);

      await page.locator('button:has-text("Sign in")').click();
      await page.waitForSelector("#id_code");
      await page.locator("input[name=id_code]").fill(code);

      await page.waitForSelector(".is-authenticated");
    }

    await page.goto(chart.href, { waitUntil: "load" });
    await page.click("#header-toolbar-screenshot");
    // click screenshot icon

    const newPagePromise = page.waitForEvent("popup");
    await page.click(
      'div[data-name="open-image-in-new-tab"] .labelRow-jFqVJoPk'
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
