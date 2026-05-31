const { connectToDatabase } = require("../db");
const AuthUser = require("../models/AuthUser");

function toAuthUserRecord(doc) {
  if (!doc) {
    return null;
  }

  const record = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(record._id),
    full_name: record.full_name,
    email: record.email,
    password_hash: record.password_hash,
    password_salt: record.password_salt,
    google_id: record.google_id,
    providers: record.providers || [],
    created_at: record.created_at,
    last_login_at: record.last_login_at,
  };
}

async function findByEmail(email) {
  await connectToDatabase();
  const user = await AuthUser.findOne({ email }).lean();
  return toAuthUserRecord(user);
}

async function createEmailUser(payload) {
  await connectToDatabase();
  const created = await AuthUser.create({
    full_name: payload.full_name,
    email: payload.email,
    password_hash: payload.password_hash,
    password_salt: payload.password_salt,
    providers: ["email"],
    last_login_at: new Date(),
  });

  return toAuthUserRecord(created);
}

async function markLogin(userId) {
  await connectToDatabase();
  const updated = await AuthUser.findByIdAndUpdate(
    userId,
    { last_login_at: new Date() },
    { new: true }
  ).lean();
  return toAuthUserRecord(updated);
}

async function upsertGoogleUser(profile) {
  await connectToDatabase();
  const email = profile.email.toLowerCase();
  const existing = await AuthUser.findOne({ email });

  if (existing) {
    existing.full_name = existing.full_name || profile.full_name;
    existing.google_id = existing.google_id || profile.google_id;
    existing.providers = Array.from(new Set([...(existing.providers || []), "google"]));
    existing.last_login_at = new Date();
    await existing.save();
    return toAuthUserRecord(existing);
  }

  const created = await AuthUser.create({
    full_name: profile.full_name,
    email,
    google_id: profile.google_id,
    providers: ["google"],
    last_login_at: new Date(),
  });

  return toAuthUserRecord(created);
}

module.exports = {
  createEmailUser,
  findByEmail,
  markLogin,
  upsertGoogleUser,
};
