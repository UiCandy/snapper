import Queue from "bee-queue";
const chartQueue = new Queue("chart");

import snapper from "../lib/snapper";

const generateLink = (chUrl) => {
  const job = chartQueue.createJob(chUrl);

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

chartQueue.on("succeeded", function (job, result) {
  console.log("Ready to be served 😋 " + job.id, result);
  return result;
});

chartQueue.on("ready", function () {
  chartQueue.process(async (job) => {
    console.log(`🍳 Preparing ${job.data}`);
    return snapper(job.data);
  });
});

export { generateLink };
