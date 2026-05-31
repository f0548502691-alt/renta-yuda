const searchRequestRepository = require("../repositories/searchRequestRepository");
const newsletterRepository = require("../repositories/newsletterRepository");
const { sendPaymentApprovedEmail } = require("../emailService");
const apartmentService = require("./apartmentService");
const { runNewsletterJob } = require("./newsletterService");

function authenticateAdmin(username, password) {
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  return username === adminUser && password === adminPass;
}

async function getDashboardData() {
  const [apartments, logs, requests] = await Promise.all([
    apartmentService.listAllApartments(),
    newsletterRepository.listNewsletterLogs(20),
    searchRequestRepository.listSearchRequests(),
  ]);

  return {
    apartments,
    logs,
    requests,
  };
}

async function approvePayment(searchRequestIdRaw) {
  const searchRequestId = String(searchRequestIdRaw || "").trim();
  if (!searchRequestId) {
    return { status: "invalid_request" };
  }

  const existing = await searchRequestRepository.getSearchRequestById(searchRequestId);
  if (!existing) {
    return { status: "request_not_found" };
  }

  const updated = existing.is_paid
    ? existing
    : await searchRequestRepository.markSearchRequestAsPaid(searchRequestId);

  try {
    await sendPaymentApprovedEmail(updated);
    return { status: "paid_ok" };
  } catch (error) {
    console.error("Failed sending approval email:", error);
    return { status: "paid_no_email" };
  }
}

async function triggerNewsletter() {
  try {
    await runNewsletterJob();
    return { status: "newsletter_sent" };
  } catch (error) {
    console.error(error);
    return { status: "newsletter_failed" };
  }
}

module.exports = {
  approvePayment,
  authenticateAdmin,
  getDashboardData,
  triggerNewsletter,
};
