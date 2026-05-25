const apartmentRepository = require("../repositories/apartmentRepository");
const { parseApartmentsFromExcelBuffer } = require("../utils/excelApartmentParser");
const { parseNumber } = require("../utils/number");

function normalizeApartmentInput(input) {
  const rooms = parseNumber(input.rooms);
  const price = parseNumber(input.price);

  if (!input.title || !input.neighborhood || !rooms || !price) {
    return null;
  }

  return {
    title: input.title.trim(),
    neighborhood: input.neighborhood.trim(),
    rooms,
    price,
    address: input.address ? input.address.trim() : "",
    description: input.description ? input.description.trim() : "",
    contact_name: input.contact_name ? input.contact_name.trim() : "",
    contact_phone: input.contact_phone ? input.contact_phone.trim() : "",
    contact_email: input.contact_email ? input.contact_email.trim().toLowerCase() : "",
  };
}

function createGuestApartment(input) {
  const normalized = normalizeApartmentInput(input);
  if (!normalized) {
    return null;
  }

  return apartmentRepository.createApartment({
    ...normalized,
    source: "guest",
  });
}

function createAdminApartment(input) {
  const normalized = normalizeApartmentInput(input);
  if (!normalized) {
    return null;
  }

  return apartmentRepository.createApartment({
    ...normalized,
    source: "admin",
  });
}

function importApartmentsFromExcel(fileBuffer) {
  const apartments = parseApartmentsFromExcelBuffer(fileBuffer);
  if (!apartments.length) {
    return 0;
  }

  apartmentRepository.importApartments(apartments);
  return apartments.length;
}

function listAllApartments() {
  return apartmentRepository.listApartments();
}

module.exports = {
  createAdminApartment,
  createGuestApartment,
  importApartmentsFromExcel,
  listAllApartments,
};
