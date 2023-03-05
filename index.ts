import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import axios from "axios";
import dotenv from "dotenv";

const app = express();
dotenv.config();

const snapper = async (chUrl) => {
  const chart = new URL(chUrl);
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext();
    await context.grantPermissions(["notifications"]);
    const page = await browser.newPage({ deviceScaleFactor: 2 });
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

    await tvSnap.title();
    await tvSnap.waitForSelector(".tv-snapshot-image");
    const chartLink = await tvSnap.url();

    return chartLink;
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
};

const chartHandler = handler({
  resolve: async (params: any) => {
    return snapper(params.body.chart);
  },
});

const repoHandler = handler({
  resolve: async (data: any) => {
    const username = data.body.username || "uicandy";
    try {
      const result = await axios.get(
        `https://api.github.com/users/${username}/repos`
      );
      const repos = result.data
        .map((repo) => ({
          name: repo.name,
          url: repo.html_url,
          description: repo.description,
          stars: repo.stargazers_count,
        }))
        .sort((a, b) => b.stars - a.stars);

      return repos;
    } catch (error) {
      return "Error while getting list of repositories";
    }
  },
});

const hookHandler = handler({
  resolve: async (data: any) => {
    try {
      console.log(data.body);
      const charty = await snapper(data.body.chart);

      console.log(data.body.content, charty);

      axios
        .post(
          `https://api.telegram.org/bot5710062036:AAHcIOPgFQzUOplGiOZ_PNR_kUrRz6wxjak/sendMessage?chat_id=@FlipSignal&text=${encodeURIComponent(
            data.body.content + charty
          )}`,
          {}
        )
        .then(function () {
          console.log(encodeURIComponent(data.body.content + charty));
        })
        .catch(function (error) {
          console.log(error);
        });
    } catch (e) {
      console.error(e);
    }
  },
});

const routes = {
  chart: chartHandler,
  hook: hookHandler,
  repos: method({ GET: repoHandler }),
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
