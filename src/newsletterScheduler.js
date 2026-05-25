const cron = require("node-cron");
const { runNewsletterJob } = require("./services/newsletterService");

function scheduleNewsletter() {
  // Every Monday and Thursday at 09:00.
  cron.schedule("0 9 * * 1,4", () => {
    runNewsletterJob().catch((err) => {
      console.error("Failed to run newsletter job:", err);
    });
  });
}

module.exports = {
  runNewsletterJob,
  scheduleNewsletter,
};
