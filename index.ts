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
      const ticker = params.body.chart.split("%3A")[1].split("&")[0];
      await page.goto(params.body.chart);

      // check if page  has loaded
      await page.waitForSelector(".first-_hkHmHWX");
      await page.waitForSelector("#header-toolbar-screenshot");

      await page.screenshot({
        path: `./data/${ticker}_screenshot.jpg`,
      });

      return ticker;
    } catch (error) {
      console.error(error);
    } finally {
      await browser.close();
    }
  },
});

// const API_SECRET = "secret";

// app.use(
//   express.json({
//     verify: (req, res, buffer) => {
//       // @ts-ignore
//       req.rawBody = buffer;
//     },
//   })
// );

// app.post("/hook", (req, res) => {
//   const signature = _generateSignature(
//     req.method,
//     req.url,
//     req.headers["x-cs-timestamp"],
//     req.body
//   );

//   if (signature !== req.headers["x-cs-signature"]) {
//     return res.sendStatus(401);
//   }
//   // @ts-ignore
//   console.log("received webhook", req.rawBody);
//   res.sendStatus(200);
// });

// function _generateSignature(method, url, timestamp, body) {
//   const hmac = crypto.createHmac("SHA256", API_SECRET);

//   hmac.update(`${method.toUpperCase()}${url}${timestamp}`);

//   if (body) {
//     hmac.update(body);
//   }

//   return hmac.digest("hex");
// }

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
