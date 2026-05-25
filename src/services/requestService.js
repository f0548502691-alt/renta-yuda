const crypto = require("crypto");
const searchRequestRepository = require("../repositories/searchRequestRepository");
const apartmentRepository = require("../repositories/apartmentRepository");
const { mapApartmentForViewer } = require("../utils/apartmentViewer");
const { parseNumber } = require("../utils/number");

function createGuestSearchRequest(input) {
  const rooms = parseNumber(input.preferred_rooms);
  if (
    !input.full_name ||
    !input.phone ||
    !input.email ||
    !input.preferred_neighborhood ||
    !rooms ||
    rooms < 1
  ) {
    return null;
  }

  return searchRequestRepository.createSearchRequest({
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    preferred_rooms: rooms,
    preferred_neighborhood: input.preferred_neighborhood.trim(),
    access_token: crypto.randomBytes(16).toString("hex"),
  });
}

function getAreaByToken(token) {
  const request = searchRequestRepository.getSearchRequestByToken(token);
  if (!request) {
    return null;
  }

  const hasFullAccess = Boolean(request.is_paid);
  const apartments = apartmentRepository
    .getRelevantApartments(request)
    .map((apartment) => mapApartmentForViewer(apartment, hasFullAccess));

  return { request, apartments, hasFullAccess };
}

module.exports = {
  createGuestSearchRequest,
  getAreaByToken,
};
