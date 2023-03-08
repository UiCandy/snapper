import Queue from "bee-queue";
import axios from "axios";

const chartQueue = new Queue("chart");

import snapper from "../lib/snapper";

const generateLink = ({ chUrl, content = "" }) => {
  const job = chartQueue.createJob({ chUrl, content });

  job.save((err) => {
    if (err) {
      console.log("job failed to save");
      return "job failed to save";
    }
    console.log(
      "Order Saved - Getting the ingredients ready 🥬 🌶 🍄 " + job.id
    );
  });
};

chartQueue.on("succeeded", function (job, [chUrl, content]) {
  console.log("Ready to be served 😋 " + job.id + content);
  axios
    .post(
      `https://api.telegram.org/bot${process.env.TL_TOKEN}/sendPhoto?chat_id=${
        process.env.TL_BOT
      }&photo=${chUrl}&caption=${encodeURIComponent(content)}`,
      {}
    )
    .then(function (res) {
      console.log(res);
      return [chUrl, content];
    })
    .catch(function (error) {
      console.log(error);
      throw new Error(error);
    });
});

chartQueue.on("ready", function () {
  chartQueue.process(async (job) => {
    console.log(`🍳 Preparing ${job.data.chUrl}, ${job.data.content}`);
    const chartUrl = await snapper(job.data.chUrl);
    return [chartUrl, job.data.content];
  });
});

export { generateLink };
