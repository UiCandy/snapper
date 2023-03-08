import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import API from "kucoin-node-sdk";

import { config } from "./api/config";
import { generateLink } from "./queues/chartQueue";

const app = express();
dotenv.config();
API.init(config);

const chartHandler = handler({
  resolve: async (params: any) => {
    return generateLink({ chUrl: params.body.chart });
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

const symbolHandler = handler({
  resolve: async () => {
    const getSymbolsList = await API.rest.Market.Symbols.getSymbolsList();
    return getSymbolsList;
  },
});

const orderBookHandler = handler({
  resolve: async (symbol) => {
    const getOrderbook = await API.rest.Market.OrderBook.getLevel2_100(symbol);
    return getOrderbook;
  },
});

const routes = {
  chart: chartHandler,
  hook: hookHandler,
  orders: method({ GET: orderBookHandler }),
  symbols: method({ GET: symbolHandler }),
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
