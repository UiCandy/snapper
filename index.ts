import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { generateLink } from "./queues/chartQueue";

const app = express();
dotenv.config();

const chartHandler = handler({
  resolve: async (params: any) => {
    return generateLink(params.body.chart);
  },
});

const hookHandler = handler({
  resolve: async (data: any) => {
    try {
      await generateLink({
        chUrl: data.body.chart,
        content: data.body.content,
      });
    } catch (e) {
      console.error(e);
    }
  },
});

const routes = {
  chart: chartHandler,
  hook: hookHandler,
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
