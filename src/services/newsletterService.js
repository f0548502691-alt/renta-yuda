const searchRequestRepository = require("../repositories/searchRequestRepository");
const apartmentRepository = require("../repositories/apartmentRepository");
const newsletterRepository = require("../repositories/newsletterRepository");
const { sendBiWeeklyDigest } = require("../emailService");

async function runNewsletterJob() {
  const requests = searchRequestRepository.listSearchRequests();

  for (const request of requests) {
    const apartments = apartmentRepository.getRelevantApartments(request);
    const includeContacts = Boolean(request.is_paid);
    await sendBiWeeklyDigest(request, apartments, includeContacts);
    newsletterRepository.createNewsletterLog(request.id, apartments.length);
  }
}

module.exports = {
  runNewsletterJob,
};
