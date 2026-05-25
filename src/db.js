const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "renta-yuda.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS search_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    preferred_rooms INTEGER NOT NULL,
    preferred_neighborhood TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );

  CREATE TABLE IF NOT EXISTS apartments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    rooms INTEGER NOT NULL,
    price INTEGER NOT NULL,
    address TEXT,
    description TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    source TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS newsletter_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_request_id INTEGER NOT NULL,
    apartments_count INTEGER NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(search_request_id) REFERENCES search_requests(id)
  );
`);

const requestInsert = db.prepare(`
  INSERT INTO search_requests
  (full_name, phone, email, preferred_rooms, preferred_neighborhood, access_token)
  VALUES
  (@full_name, @phone, @email, @preferred_rooms, @preferred_neighborhood, @access_token)
`);

const apartmentInsert = db.prepare(`
  INSERT INTO apartments
  (title, neighborhood, rooms, price, address, description, contact_name, contact_phone, contact_email, source)
  VALUES
  (@title, @neighborhood, @rooms, @price, @address, @description, @contact_name, @contact_phone, @contact_email, @source)
`);

const apartmentListQuery = db.prepare(`
  SELECT *
  FROM apartments
  WHERE active = 1
  ORDER BY datetime(created_at) DESC
`);

const requestsListQuery = db.prepare(`
  SELECT *
  FROM search_requests
  ORDER BY datetime(created_at) DESC
`);

const getRequestByTokenQuery = db.prepare(`
  SELECT *
  FROM search_requests
  WHERE access_token = ?
`);

const markPaidQuery = db.prepare(`
  UPDATE search_requests
  SET is_paid = 1, paid_at = datetime('now')
  WHERE id = ?
`);

const apartmentsForRequestQuery = db.prepare(`
  SELECT *
  FROM apartments
  WHERE active = 1
    AND rooms >= ?
    AND lower(neighborhood) LIKE '%' || lower(?) || '%'
  ORDER BY price ASC, datetime(created_at) DESC
`);

const requestByIdQuery = db.prepare(`
  SELECT *
  FROM search_requests
  WHERE id = ?
`);

const newsletterLogInsert = db.prepare(`
  INSERT INTO newsletter_logs (search_request_id, apartments_count)
  VALUES (?, ?)
`);

function seedApartmentsIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM apartments").get();
  if (row.count > 0) {
    return;
  }

  const seedRows = [
    {
      title: "דירת 3 חדרים משופצת",
      neighborhood: "קטמון",
      rooms: 3,
      price: 6200,
      address: "רחוב הפלמ\"ח 12, ירושלים",
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

  const tx = db.transaction((rows) => {
    for (const row of rows) {
      apartmentInsert.run(row);
    }
  });

  tx(seedRows);
}

function createSearchRequest(payload) {
  const result = requestInsert.run(payload);
  return getSearchRequestById(result.lastInsertRowid);
}

function createApartment(payload) {
  const result = apartmentInsert.run(payload);
  return db.prepare("SELECT * FROM apartments WHERE id = ?").get(result.lastInsertRowid);
}

function importApartments(rows) {
  const tx = db.transaction((items) => {
    for (const row of items) {
      apartmentInsert.run(row);
    }
  });

  tx(rows);
}

function getSearchRequestById(id) {
  return requestByIdQuery.get(id);
}

function getSearchRequestByToken(token) {
  return getRequestByTokenQuery.get(token);
}

function listSearchRequests() {
  return requestsListQuery.all();
}

function markSearchRequestAsPaid(id) {
  markPaidQuery.run(id);
  return getSearchRequestById(id);
}

function getRelevantApartments(searchRequest) {
  return apartmentsForRequestQuery.all(
    searchRequest.preferred_rooms,
    searchRequest.preferred_neighborhood
  );
}

function listApartments() {
  return apartmentListQuery.all();
}

function createNewsletterLog(searchRequestId, apartmentsCount) {
  newsletterLogInsert.run(searchRequestId, apartmentsCount);
}

function listNewsletterLogs(limit = 25) {
  return db
    .prepare(
      `
      SELECT nl.*, sr.email, sr.full_name
      FROM newsletter_logs nl
      INNER JOIN search_requests sr ON sr.id = nl.search_request_id
      ORDER BY datetime(nl.sent_at) DESC
      LIMIT ?
    `
    )
    .all(limit);
}

seedApartmentsIfEmpty();

module.exports = {
  createApartment,
  createNewsletterLog,
  createSearchRequest,
  getRelevantApartments,
  getSearchRequestById,
  getSearchRequestByToken,
  importApartments,
  listApartments,
  listNewsletterLogs,
  listSearchRequests,
  markSearchRequestAsPaid,
};
