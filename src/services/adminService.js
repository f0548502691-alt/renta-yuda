const searchRequestRepository = require("../repositories/searchRequestRepository");
const newsletterRepository = require("../repositories/newsletterRepository");
const { sendPaymentApprovedEmail } = require("../emailService");
const apartmentService = require("./apartmentService");
const { runNewsletterJob } = require("./newsletterService");
const { parseNumber } = require("../utils/number");

function authenticateAdmin(username, password) {
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  return username === adminUser && password === adminPass;
}

function getDashboardData() {
  return {
    apartments: apartmentService.listAllApartments(),
    logs: newsletterRepository.listNewsletterLogs(20),
    requests: searchRequestRepository.listSearchRequests(),
  };
}

async function approvePayment(searchRequestIdRaw) {
  const searchRequestId = parseNumber(searchRequestIdRaw);
  if (!searchRequestId) {
    return { status: "invalid_request" };
  }

  const existing = searchRequestRepository.getSearchRequestById(searchRequestId);
  if (!existing) {
    return { status: "request_not_found" };
  }

  const updated = existing.is_paid
    ? existing
    : searchRequestRepository.markSearchRequestAsPaid(searchRequestId);

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
