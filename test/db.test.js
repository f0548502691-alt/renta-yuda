const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { createApartment, createSearchRequest, getRelevantApartments } = require("../src/db");

test("returns relevant apartments by neighborhood and rooms", () => {
  const suffix = crypto.randomBytes(4).toString("hex");
  const neighborhood = `בדיקה-${suffix}`;

  createApartment({
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

  const request = createSearchRequest({
    full_name: "בודק",
    phone: "0501234567",
    email: `qa-${suffix}@example.com`,
    preferred_rooms: 3,
    preferred_neighborhood: neighborhood,
    access_token: crypto.randomBytes(16).toString("hex"),
  });

  const matches = getRelevantApartments(request);
  assert.ok(matches.some((apartment) => apartment.neighborhood === neighborhood));
});
