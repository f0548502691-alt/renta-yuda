const { connectToDatabase } = require("../db");
const Apartment = require("../models/Apartment");

function normalizeNeighborhood(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toApartmentRecord(doc) {
  if (!doc) {
    return null;
  }

  const record = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(record._id),
    title: record.title,
    neighborhood: record.neighborhood,
    rooms: record.rooms,
    price: record.price,
    address: record.address,
    description: record.description,
    contact_name: record.contact_name,
    contact_phone: record.contact_phone,
    contact_email: record.contact_email,
    source: record.source,
    created_at: record.created_at,
    active: record.active ? 1 : 0,
  };
}

async function createApartment(payload) {
  await connectToDatabase();
  const created = await Apartment.create({
    ...payload,
    neighborhood_normalized: normalizeNeighborhood(payload.neighborhood),
    active: true,
  });

  return toApartmentRecord(created);
}

async function getRelevantApartments(searchRequest) {
  await connectToDatabase();
  const normalizedNeighborhood = normalizeNeighborhood(searchRequest.preferred_neighborhood);
  const minRooms = Number(searchRequest.preferred_rooms) || 1;

  const baseFilter = {
    active: true,
    rooms: { $gte: minRooms },
  };

  let apartments = await Apartment.find({
    ...baseFilter,
    neighborhood_normalized: normalizedNeighborhood,
  })
    .sort({ price: 1, created_at: -1 })
    .lean();

  if (!apartments.length && normalizedNeighborhood) {
    apartments = await Apartment.find({
      ...baseFilter,
      neighborhood_normalized: { $regex: escapeRegex(normalizedNeighborhood), $options: "i" },
    })
      .sort({ price: 1, created_at: -1 })
      .lean();
  }

  return apartments.map(toApartmentRecord);
}

async function importApartments(rows) {
  await connectToDatabase();
  const docs = rows.map((row) => ({
    ...row,
    neighborhood_normalized: normalizeNeighborhood(row.neighborhood),
    active: true,
  }));

  if (!docs.length) {
    return;
  }

  await Apartment.insertMany(docs, { ordered: false });
}

async function listApartments() {
  await connectToDatabase();
  const apartments = await Apartment.find({ active: true }).sort({ created_at: -1 }).lean();
  return apartments.map(toApartmentRecord);
}

module.exports = {
  createApartment,
  getRelevantApartments,
  importApartments,
  listApartments,
};
