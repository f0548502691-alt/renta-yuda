const { connectToDatabase } = require("../db");
const User = require("../models/User");

function toSearchRequestRecord(doc) {
  if (!doc) {
    return null;
  }

  const record = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(record._id),
    full_name: record.full_name,
    phone: record.phone,
    email: record.email,
    preferred_rooms: record.search_criteria.preferred_rooms,
    preferred_neighborhood: record.search_criteria.preferred_neighborhood,
    access_token: record.access_token,
    is_paid: record.is_paid ? 1 : 0,
    created_at: record.created_at,
    paid_at: record.paid_at,
  };
}

async function createSearchRequest(payload) {
  await connectToDatabase();
  const created = await User.create({
    full_name: payload.full_name,
    phone: payload.phone,
    email: payload.email,
    search_criteria: {
      preferred_rooms: payload.preferred_rooms,
      preferred_neighborhood: payload.preferred_neighborhood,
    },
    access_token: payload.access_token,
  });

  return toSearchRequestRecord(created);
}

async function getSearchRequestById(id) {
  await connectToDatabase();
  const user = await User.findById(id).lean();
  return toSearchRequestRecord(user);
}

async function getSearchRequestByToken(token) {
  await connectToDatabase();
  const user = await User.findOne({ access_token: token }).lean();
  return toSearchRequestRecord(user);
}

async function listSearchRequests() {
  await connectToDatabase();
  const users = await User.find({}).sort({ created_at: -1 }).lean();
  return users.map(toSearchRequestRecord);
}

async function markSearchRequestAsPaid(id) {
  await connectToDatabase();
  const updated = await User.findByIdAndUpdate(
    id,
    {
      is_paid: true,
      paid_at: new Date(),
    },
    { new: true }
  ).lean();

  return toSearchRequestRecord(updated);
}

module.exports = {
  createSearchRequest,
  getSearchRequestById,
  getSearchRequestByToken,
  listSearchRequests,
  markSearchRequestAsPaid,
};
