import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import axios from "axios";

const app = express();

const pupeteerHandler = handler({
  resolve: async (params: any) => {
    const browser = await puppeteer.launch({
      headless: true, //  debug mode
      defaultViewport: null, //Defaults to an 800x600 viewport
      userDataDir: "./user_data",
    });

    try {
      const page = await browser.newPage();
      const pageTarget = page.target();

      const ticker = params.body.chart.split("%3A")[1].split("&")[0];
      await page.goto(params.body.chart, { waitUntil: "load" });

      // check if page  has loaded
      await page.waitForSelector(".first-_hkHmHWX");
      await page.waitForSelector("#header-toolbar-screenshot");

      // click screenshot icon
      await page.click("#header-toolbar-screenshot");
      await page.click(
        'div[data-name="open-image-in-new-tab"] .labelRow-RhC5uhZw'
      );

      const newTarget = await browser.waitForTarget(
        (target) => target.opener() === pageTarget
      );

      const tvSnap: any = await newTarget.page();
      await tvSnap.waitForSelector(".tv-snapshot-image", {
        visible: true,
        timeout: 0,
      });

      const chartLink = tvSnap.url();

      return [chartLink, ticker];
    } catch (error) {
      console.error(error);
    } finally {
      await browser.close();
    }
  },
});

const repoHandler = handler({
  resolve: async (data: any) => {
    const username = data.body.username || "uicandy2";
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

const helloHandler = handler({
  resolve: async () => {
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto("https://example.com");

    try {
      const element = await page.waitForSelector("div > p"); // select the element
      if (element) {
        const text: any = await element.evaluate((el) => el.textContent); // grab
        return text;
      }
    } catch (e) {
      console.error(e);
    }
  },
});

const routes = {
  chart: pupeteerHandler,
  hello: method({ GET: helloHandler }),
  repos: method({ GET: repoHandler }),
};
app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
