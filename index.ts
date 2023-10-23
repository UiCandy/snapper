import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import axios from "axios";
import API from "kucoin-node-sdk";
import { schedule } from "node-cron";
import chalk from "chalk";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { config, dbConfig, cmcToken } from "./api/config";
import { generateLink } from "./queues/chartQueue";

const app = express();
const fireBase: any = initializeApp(dbConfig);
API.init(config);
axios.interceptors.request.use(function (config) {
  config.headers["X-CMC_PRO_API_KEY"] = cmcToken;
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

const coinalysisHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const data = await axios.get(
      "https://www.kucoin.com/_api/quicksilver/currency-detail/symbols/dataAnalysis/ELON?coin=ELON&dataAnalysisTimeDimensionEnum=TWENTY_FOUR_HOUR&dataAnalysisTypeEnum=SPOT_BUY_AMT_DIVIDE_SPOT_SELL_AMT&lang=en_US"
    );

    return data;
  },
});
const symbolHandler = handler({
  resolve: async () => {
    const getSymbolsList = await API.rest.Market.Symbols.getSymbolsList();
    return getSymbolsList;
  },
});

const orderBookHandler = handler({
  resolve: async ({ query }: any) => {
    const getOrderbook = await API.rest.Market.OrderBook.getLevel2_100(
      query.symbol
    );
    return getOrderbook;
  },
});

const chartDataHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const eightMonthsAgo =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 8,
        new Date().getDate()
      ).getTime() / 1000;
    const today = new Date().getTime();
    const getPriceData = await API.rest.Market.Histories.getMarketCandles(
      query.symbol,
      query.tf,
      {
        startAt: eightMonthsAgo,
      }
    );
    return getPriceData;
  },
});

const dexVolHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: dexVol } = await axios.get(
      "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume"
    );

    return dexVol;
  },
});

const dexHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: chains } = await axios.get("https://api.llama.fi/chains");

    return chains;
  },
});

const protocolHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: protocols } = await axios.get(
      `https://api.llama.fi/overview/dexs/${query.chain}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=totalVolume`
    );
    return protocols;
  },
});

const dexSummaryHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: protocols } = await axios.get(
      `https://api.llama.fi/summary/dexs/${query.protocol}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=totalVolume`
    );
    return protocols;
  },
});

const feesHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: fees } = await axios.get(
      `https://api.llama.fi/overview/fees/${query.chain}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees`
    );
    return fees;
  },
});

const summaryHandler = handler({
  resolve: async ({ query }: Record<string, any>) => {
    const { data: fees } = await axios.get(
      `https://api.llama.fi/summary/fees/${query.protocol}?dataType=dailyFees`
    );
    return fees;
  },
});

const healthHandler = handler({
  resolve: async () => {
    return "🌳It's running and it's running away ...🌳";
  },
});

const cmcHandler = handler({
  resolve: async ({ query }: any) => {
    try {
      let results: any = [],
        start = 1;

      const limit = 100,
        market_min = 200000,
        market_max = 20000000,
        vol24_min = 200000,
        sort = "market_cap";
      do {
        const response = await axios.get(
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=${start}&limit=${limit}&market_cap_min=${market_min}&market_cap_max=${market_max}&volume_24h_min=${vol24_min}&sort=${sort}&sort_dir=desc&cryptocurrency_type=all&tag=all`
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
      console.log("Running scheduled job from inside - without cron");
      return results;
    } catch (ex) {
      // error
      console.log(ex);
    }
  },
});

const job = schedule("* 15 * * * *", () => {
  console.log("Running scheduled job");
  cmcHandler.resolve("");
});

const routes = {
  chart: chartHandler,
  hook: hookHandler,
  health: method({ GET: healthHandler }),
  orders: method({ GET: orderBookHandler }),
  coinalysis: method({ GET: coinalysisHandler }),
  symbols: method({ GET: symbolHandler }),
  tickers: method({ GET: tickerHandler }),
  refresh: method({ GET: cmcHandler }),
  pairs: method({ GET: pairHandler }),
  feed: method({ GET: chartDataHandler }),
  dex: {
    volume: method({ GET: dexVolHandler }),
    vol: {
      summary: method({ GET: dexSummaryHandler }),
    },
    tvl: {
      chains: method({ GET: dexHandler }),
      protocol: method({ GET: protocolHandler }),
    },
    fees: {
      total: method({ GET: feesHandler }),
      summary: method({ GET: summaryHandler }),
    },
  },
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
