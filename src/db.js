const mongoose = require("mongoose");
const Apartment = require("./models/Apartment");

const mongoGlobal = globalThis;

if (!mongoGlobal.__rentaMongoCache) {
  mongoGlobal.__rentaMongoCache = {
    connection: null,
    connectionPromise: null,
    seedInitialized: false,
  };
}

const cache = mongoGlobal.__rentaMongoCache;

const seedRows = [
  {
    title: "דירת 3 חדרים משופצת",
    neighborhood: "קטמון",
    rooms: 3,
    price: 6200,
    address: 'רחוב הפלמ"ח 12, ירושלים',
    description: "דירה מוארת עם מרפסת וסלון גדול.",
    contact_name: "רותי",
    contact_phone: "050-1112233",
    contact_email: "ruti@example.com",
    source: "admin",
  },
  {
    title: "דירת 4 חדרים למשפחה",
    neighborhood: "ארנונה",
    rooms: 4,
    price: 7600,
    address: "דרך חברון 90, ירושלים",
    description: "קרובה לבתי ספר ופארקים.",
    contact_name: "אייל",
    contact_phone: "052-9988776",
    contact_email: "eyal@example.com",
    source: "admin",
  },
  {
    title: "דירת 2 חדרים לסטודנטים",
    neighborhood: "קריית יובל",
    rooms: 2,
    price: 4300,
    address: "שדרות הרצל 50, ירושלים",
    description: "סמוך לרכבת הקלה.",
    contact_name: "מיכל",
    contact_phone: "054-2244668",
    contact_email: "michal@example.com",
    source: "admin",
  },
];

function normalizeNeighborhood(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function seedApartmentsIfEmpty() {
  if (cache.seedInitialized) {
    return;
  }

  const count = await Apartment.estimatedDocumentCount();
  if (count === 0) {
    await Apartment.insertMany(
      seedRows.map((row) => ({
        ...row,
        neighborhood_normalized: normalizeNeighborhood(row.neighborhood),
      }))
    );
  }

  cache.seedInitialized = true;
}

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.connectionPromise) {
    mongoose.set("strictQuery", true);
    cache.connectionPromise = mongoose
      .connect(mongoUri, {
        autoIndex: true,
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 50),
        minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((instance) => instance.connection)
      .catch((error) => {
        cache.connectionPromise = null;
        throw error;
      });
  }

  cache.connection = await cache.connectionPromise;
  await seedApartmentsIfEmpty();
  return cache.connection;
}

module.exports = {
  connectToDatabase,
};
