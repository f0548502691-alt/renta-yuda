const cron = require("node-cron");
const {
  createNewsletterLog,
  getRelevantApartments,
  listSearchRequests,
} = require("./db");
const { sendBiWeeklyDigest } = require("./emailService");

async function runNewsletterJob() {
  const requests = listSearchRequests();

  for (const request of requests) {
    const apartments = getRelevantApartments(request);
    const includeContacts = Boolean(request.is_paid);
    await sendBiWeeklyDigest(request, apartments, includeContacts);
    createNewsletterLog(request.id, apartments.length);
  }
}

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
