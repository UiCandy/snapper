import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import API from "kucoin-node-sdk";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { config, dbConfig } from "./api/config";
import { generateLink } from "./queues/chartQueue";

const app = express();
dotenv.config();
const fireBase: any = initializeApp(dbConfig);
API.init(config);
axios.interceptors.request.use(function (config) {
  const token = process.env.CMC_KEY;
  config.headers["X-CMC_PRO_API_KEY"] = token;

  return config;
});

const db = getFirestore(fireBase);

const chartHandler = handler({
  resolve: async (params: any) => {
    return generateLink({ chUrl: params.body.chart });
  },
});

const pairHandler = handler({
  resolve: async (params: any) => {
    try {
      const docRef = doc(db, "quotes", "cmcpairs");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error adding document: ", error);
    }
    return fireBase.database();
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

const tickerHandler = handler({
  resolve: async ({ query }: any) => {
    const getTickersList = await API.rest.Market.Symbols.getAllTickers();
    if (query.list) {
      const allTickers = getTickersList.data.ticker
        .filter(
          (x) =>
            x.symbolName.includes("USDT") &&
            !x.symbolName.includes("3L") &&
            !x.symbolName.includes("3S")
        )
        .map((x) => x.symbol.split("-")[0].toLowerCase());
      return allTickers;
    }
    return getTickersList;
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

const cmcHandler = handler({
  resolve: async (symbol) => {
    try {
      let results: any = [],
        start = 400;
      do {
        const response = await axios.get(
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=${start}&limit=100&market_cap_min=200000&market_cap_max=200000000&volume_24h_min=200000&sort=market_cap&sort_dir=desc&cryptocurrency_type=all&tag=all`
        );
        results = [...results, ...response.data.data];
        start += 100;
      } while (start < 800);

      const hashMap = results.reduce(
        (map, obj) => ((map[obj.symbol] = obj), map),
        {}
      );

      const quotesRef = await setDoc(doc(db, "quotes", "cmcpairs"), hashMap);
      console.log("done", quotesRef);
      return results;
    } catch (ex) {
      // error
      console.log(ex);
    }
  },
});

const routes = {
  chart: chartHandler,
  hook: hookHandler,
  orders: method({ GET: orderBookHandler }),
  symbols: method({ GET: symbolHandler }),
  tickers: method({ GET: tickerHandler }),
  volume: method({ GET: cmcHandler }),
  pairs: method({ GET: pairHandler }),
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
