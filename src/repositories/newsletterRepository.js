const { connectToDatabase } = require("../db");
const NewsletterLog = require("../models/NewsletterLog");

async function createNewsletterLog(searchRequestId, apartmentsCount) {
  await connectToDatabase();
  await NewsletterLog.create({
    search_request_id: searchRequestId,
    apartments_count: apartmentsCount,
    sent_at: new Date(),
  });
}

async function listNewsletterLogs(limit = 25) {
  await connectToDatabase();

  const logs = await NewsletterLog.find({})
    .sort({ sent_at: -1 })
    .limit(limit)
    .populate({ path: "search_request_id", select: "email full_name" })
    .lean();

  return logs.map((log) => ({
    id: String(log._id),
    search_request_id: log.search_request_id ? String(log.search_request_id._id) : null,
    apartments_count: log.apartments_count,
    sent_at: log.sent_at,
    email: log.search_request_id?.email || null,
    full_name: log.search_request_id?.full_name || null,
  }));
}

module.exports = {
  createNewsletterLog,
  listNewsletterLogs,
};
