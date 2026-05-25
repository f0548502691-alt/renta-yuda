const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

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

const isPostgres = Boolean(process.env.DATABASE_URL);
let pool;
let sqliteDb;
let initPromise;

let sqliteStatements = {};

function normalizeRequestRow(row) {
  if (!row) {
    return row;
  }

  if (row.is_paid === true) {
    return { ...row, is_paid: 1 };
  }

  if (row.is_paid === false) {
    return { ...row, is_paid: 0 };
  }

  return row;
}

async function initPostgres() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_requests (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      preferred_rooms INTEGER NOT NULL,
      preferred_neighborhood TEXT NOT NULL,
      access_token TEXT NOT NULL UNIQUE,
      is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS apartments (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS newsletter_logs (
      id SERIAL PRIMARY KEY,
      search_request_id INTEGER NOT NULL REFERENCES search_requests(id),
      apartments_count INTEGER NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM apartments");
  if (countResult.rows[0].count > 0) {
    return;
  }

  for (const row of seedRows) {
    await pool.query(
      `
      INSERT INTO apartments
      (title, neighborhood, rooms, price, address, description, contact_name, contact_phone, contact_email, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        row.title,
        row.neighborhood,
        row.rooms,
        row.price,
        row.address,
        row.description,
        row.contact_name,
        row.contact_phone,
        row.contact_email,
        row.source,
      ]
    );
  }
}

function initSqlite() {
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "renta-yuda.db");
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  sqliteDb.exec(`
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

  sqliteStatements = {
    requestInsert: sqliteDb.prepare(`
      INSERT INTO search_requests
      (full_name, phone, email, preferred_rooms, preferred_neighborhood, access_token)
      VALUES
      (@full_name, @phone, @email, @preferred_rooms, @preferred_neighborhood, @access_token)
    `),
    apartmentInsert: sqliteDb.prepare(`
      INSERT INTO apartments
      (title, neighborhood, rooms, price, address, description, contact_name, contact_phone, contact_email, source)
      VALUES
      (@title, @neighborhood, @rooms, @price, @address, @description, @contact_name, @contact_phone, @contact_email, @source)
    `),
    apartmentById: sqliteDb.prepare("SELECT * FROM apartments WHERE id = ?"),
    requestById: sqliteDb.prepare("SELECT * FROM search_requests WHERE id = ?"),
    requestByToken: sqliteDb.prepare("SELECT * FROM search_requests WHERE access_token = ?"),
    requestsList: sqliteDb.prepare(
      "SELECT * FROM search_requests ORDER BY datetime(created_at) DESC"
    ),
    apartmentsList: sqliteDb.prepare(
      "SELECT * FROM apartments WHERE active = 1 ORDER BY datetime(created_at) DESC"
    ),
    relevantApartments: sqliteDb.prepare(`
      SELECT *
      FROM apartments
      WHERE active = 1
        AND rooms >= ?
        AND lower(neighborhood) LIKE '%' || lower(?) || '%'
      ORDER BY price ASC, datetime(created_at) DESC
    `),
    markPaid: sqliteDb.prepare(`
      UPDATE search_requests
      SET is_paid = 1, paid_at = datetime('now')
      WHERE id = ?
    `),
    newsletterInsert: sqliteDb.prepare(
      "INSERT INTO newsletter_logs (search_request_id, apartments_count) VALUES (?, ?)"
    ),
    newsletterLogs: sqliteDb.prepare(`
      SELECT nl.*, sr.email, sr.full_name
      FROM newsletter_logs nl
      INNER JOIN search_requests sr ON sr.id = nl.search_request_id
      ORDER BY datetime(nl.sent_at) DESC
      LIMIT ?
    `),
  };

  const count = sqliteDb.prepare("SELECT COUNT(*) AS count FROM apartments").get().count;
  if (count > 0) {
    return;
  }

  const tx = sqliteDb.transaction((rows) => {
    for (const row of rows) {
      sqliteStatements.apartmentInsert.run(row);
    }
  });
  tx(seedRows);
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      if (isPostgres) {
        await initPostgres();
      } else {
        initSqlite();
      }
    })();
  }

  await initPromise;
}

async function createSearchRequest(payload) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      `
      INSERT INTO search_requests
      (full_name, phone, email, preferred_rooms, preferred_neighborhood, access_token)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        payload.full_name,
        payload.phone,
        payload.email,
        payload.preferred_rooms,
        payload.preferred_neighborhood,
        payload.access_token,
      ]
    );
    return normalizeRequestRow(result.rows[0]);
  }

  const insertResult = sqliteStatements.requestInsert.run(payload);
  return sqliteStatements.requestById.get(insertResult.lastInsertRowid);
}

async function createApartment(payload) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      `
      INSERT INTO apartments
      (title, neighborhood, rooms, price, address, description, contact_name, contact_phone, contact_email, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        payload.title,
        payload.neighborhood,
        payload.rooms,
        payload.price,
        payload.address,
        payload.description,
        payload.contact_name,
        payload.contact_phone,
        payload.contact_email,
        payload.source,
      ]
    );
    return result.rows[0];
  }

  const insertResult = sqliteStatements.apartmentInsert.run(payload);
  return sqliteStatements.apartmentById.get(insertResult.lastInsertRowid);
}

async function importApartments(rows) {
  await ensureInitialized();
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const row of rows) {
        await client.query(
          `
          INSERT INTO apartments
          (title, neighborhood, rooms, price, address, description, contact_name, contact_phone, contact_email, source)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          `,
          [
            row.title,
            row.neighborhood,
            row.rooms,
            row.price,
            row.address,
            row.description,
            row.contact_name,
            row.contact_phone,
            row.contact_email,
            row.source,
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  const tx = sqliteDb.transaction((items) => {
    for (const row of items) {
      sqliteStatements.apartmentInsert.run(row);
    }
  });
  tx(rows);
}

async function getSearchRequestById(id) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query("SELECT * FROM search_requests WHERE id = $1", [id]);
    return normalizeRequestRow(result.rows[0] || null);
  }

  return sqliteStatements.requestById.get(id) || null;
}

async function getSearchRequestByToken(token) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query("SELECT * FROM search_requests WHERE access_token = $1", [
      token,
    ]);
    return normalizeRequestRow(result.rows[0] || null);
  }

  return sqliteStatements.requestByToken.get(token) || null;
}

async function listSearchRequests() {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query("SELECT * FROM search_requests ORDER BY created_at DESC");
    return result.rows.map(normalizeRequestRow);
  }

  return sqliteStatements.requestsList.all();
}

async function markSearchRequestAsPaid(id) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      `
      UPDATE search_requests
      SET is_paid = TRUE, paid_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );
    return normalizeRequestRow(result.rows[0] || null);
  }

  sqliteStatements.markPaid.run(id);
  return sqliteStatements.requestById.get(id) || null;
}

async function getRelevantApartments(searchRequest) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      `
      SELECT *
      FROM apartments
      WHERE active = TRUE
        AND rooms >= $1
        AND neighborhood ILIKE '%' || $2 || '%'
      ORDER BY price ASC, created_at DESC
      `,
      [searchRequest.preferred_rooms, searchRequest.preferred_neighborhood]
    );
    return result.rows;
  }

  return sqliteStatements.relevantApartments.all(
    searchRequest.preferred_rooms,
    searchRequest.preferred_neighborhood
  );
}

async function listApartments() {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      "SELECT * FROM apartments WHERE active = TRUE ORDER BY created_at DESC"
    );
    return result.rows;
  }

  return sqliteStatements.apartmentsList.all();
}

async function createNewsletterLog(searchRequestId, apartmentsCount) {
  await ensureInitialized();
  if (isPostgres) {
    await pool.query(
      "INSERT INTO newsletter_logs (search_request_id, apartments_count) VALUES ($1,$2)",
      [searchRequestId, apartmentsCount]
    );
    return;
  }

  sqliteStatements.newsletterInsert.run(searchRequestId, apartmentsCount);
}

async function listNewsletterLogs(limit = 25) {
  await ensureInitialized();
  if (isPostgres) {
    const result = await pool.query(
      `
      SELECT nl.*, sr.email, sr.full_name
      FROM newsletter_logs nl
      INNER JOIN search_requests sr ON sr.id = nl.search_request_id
      ORDER BY nl.sent_at DESC
      LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  }

  return sqliteStatements.newsletterLogs.all(limit);
}

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
