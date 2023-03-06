import { handler, initBridge, method } from "bridge";
import express from "express";
import cors from "cors";
import axios from "axios";
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
      console.log(data.body);
      const charty = await generateLink(data.body.chart);

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
};

app.use(cors());
app.use("", initBridge({ routes }).expressMiddleware());
app.listen(8081, () => {
  console.log(`Listening on port 8081`);
});
