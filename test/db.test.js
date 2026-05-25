const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { connectToDatabase } = require("../src/db");
const apartmentRepository = require("../src/repositories/apartmentRepository");
const searchRequestRepository = require("../src/repositories/searchRequestRepository");

const dbTest = process.env.MONGODB_URI ? test : test.skip;

dbTest("returns relevant apartments by neighborhood and rooms", async () => {
  await connectToDatabase();

  const suffix = crypto.randomBytes(4).toString("hex");
  const neighborhood = `בדיקה-${suffix}`;

  await apartmentRepository.createApartment({
    title: "דירת בדיקה",
    neighborhood,
    rooms: 4,
    price: 5000,
    address: "רחוב בדיקה 1",
    description: "לבדיקות",
    contact_name: "טסט",
    contact_phone: "0500000000",
    contact_email: "test@example.com",
    source: "admin",
  });

  const request = await searchRequestRepository.createSearchRequest({
    full_name: "בודק",
    phone: "0501234567",
    email: `qa-${suffix}@example.com`,
    preferred_rooms: 3,
    preferred_neighborhood: neighborhood,
    access_token: crypto.randomBytes(16).toString("hex"),
  });

  const matches = await apartmentRepository.getRelevantApartments(request);
  assert.ok(matches.some((apartment) => apartment.neighborhood === neighborhood));
});
