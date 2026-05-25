const crypto = require("crypto");
const path = require("path");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const xlsx = require("xlsx");
const {
  createApartment,
  createSearchRequest,
  getRelevantApartments,
  getSearchRequestById,
  getSearchRequestByToken,
  importApartments,
  listApartments,
  listNewsletterLogs,
  listSearchRequests,
  markSearchRequestAsPaid,
} = require("./db");
const { sendPaymentApprovedEmail } = require("./emailService");
const { runNewsletterJob, scheduleNewsletter } = require("./newsletterScheduler");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: false,
    saveUninitialized: false,
  })
);

app.locals.formatDate = (dateText) =>
  new Date(dateText).toLocaleString("he-IL", { hour12: false });

app.locals.formatCurrency = (value) =>
  Number(value).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

function parseNumber(raw) {
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.redirect("/admin/login");
  }
  return next();
}

function mapApartmentForViewer(apartment, hasFullAccess) {
  if (hasFullAccess) {
    return apartment;
  }

  return {
    ...apartment,
    contact_name: null,
    contact_phone: null,
    contact_email: null,
  };
}

function readCell(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}

app.get("/", (req, res) => {
  res.render("index", {
    success: req.query.success || null,
    error: req.query.error || null,
  });
});

app.post("/requests", (req, res) => {
  const { full_name, phone, email, preferred_rooms, preferred_neighborhood } = req.body;
  const rooms = parseNumber(preferred_rooms);

  if (!full_name || !phone || !email || !preferred_neighborhood || !rooms || rooms < 1) {
    return res.redirect("/?error=missing_request_fields");
  }

  const request = createSearchRequest({
    full_name: full_name.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    preferred_rooms: rooms,
    preferred_neighborhood: preferred_neighborhood.trim(),
    access_token: crypto.randomBytes(16).toString("hex"),
  });

  return res.redirect(`/my-area/${request.access_token}?success=request_saved`);
});

app.get("/my-area", (_req, res) => {
  res.render("my-area-login", {
    error: null,
  });
});

app.post("/my-area", (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.render("my-area-login", {
      error: "יש להזין קוד גישה.",
    });
  }
  return res.redirect(`/my-area/${access_token.trim()}`);
});

app.get("/my-area/:token", (req, res) => {
  const request = getSearchRequestByToken(req.params.token);
  if (!request) {
    return res.status(404).render("not-found", { message: "קוד הגישה לא נמצא במערכת." });
  }

  const hasFullAccess = Boolean(request.is_paid);
  const apartments = getRelevantApartments(request).map((apt) =>
    mapApartmentForViewer(apt, hasFullAccess)
  );

  return res.render("my-area", {
    apartments,
    hasFullAccess,
    request,
    success: req.query.success || null,
  });
});

app.get("/guest-apartment/new", (_req, res) => {
  res.render("guest-apartment-form");
});

app.post("/guest-apartment", (req, res) => {
  const {
    title,
    neighborhood,
    rooms,
    price,
    address,
    description,
    contact_name,
    contact_phone,
    contact_email,
  } = req.body;

  const roomsNum = parseNumber(rooms);
  const priceNum = parseNumber(price);
  if (!title || !neighborhood || !roomsNum || !priceNum) {
    return res.redirect("/?error=missing_apartment_fields");
  }

  createApartment({
    title: title.trim(),
    neighborhood: neighborhood.trim(),
    rooms: roomsNum,
    price: priceNum,
    address: address ? address.trim() : "",
    description: description ? description.trim() : "",
    contact_name: contact_name ? contact_name.trim() : "",
    contact_phone: contact_phone ? contact_phone.trim() : "",
    contact_email: contact_email ? contact_email.trim().toLowerCase() : "",
    source: "guest",
  });

  return res.redirect("/?success=guest_apartment_created");
});

app.get("/admin/login", (_req, res) => {
  res.render("admin-login", { error: null });
});

app.post("/admin/login", (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  if (req.body.username === adminUser && req.body.password === adminPass) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  return res.status(401).render("admin-login", { error: "פרטי ההתחברות שגויים." });
});

app.post("/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

app.get("/admin", requireAdmin, (_req, res) => {
  res.render("admin-dashboard", {
    apartments: listApartments(),
    logs: listNewsletterLogs(20),
    requests: listSearchRequests(),
    status: _req.query.status || null,
  });
});

app.post("/admin/requests/:id/pay", requireAdmin, async (req, res) => {
  const searchRequestId = parseNumber(req.params.id);
  if (!searchRequestId) {
    return res.redirect("/admin?status=invalid_request");
  }

  const existing = getSearchRequestById(searchRequestId);
  if (!existing) {
    return res.redirect("/admin?status=request_not_found");
  }

  const updated = existing.is_paid ? existing : markSearchRequestAsPaid(searchRequestId);

  try {
    await sendPaymentApprovedEmail(updated);
  } catch (error) {
    console.error("Failed sending approval email:", error);
    return res.redirect("/admin?status=paid_no_email");
  }

  return res.redirect("/admin?status=paid_ok");
});

app.post("/admin/apartments", requireAdmin, (req, res) => {
  const {
    title,
    neighborhood,
    rooms,
    price,
    address,
    description,
    contact_name,
    contact_phone,
    contact_email,
  } = req.body;

  const roomsNum = parseNumber(rooms);
  const priceNum = parseNumber(price);
  if (!title || !neighborhood || !roomsNum || !priceNum) {
    return res.redirect("/admin?status=missing_apartment_fields");
  }

  createApartment({
    title: title.trim(),
    neighborhood: neighborhood.trim(),
    rooms: roomsNum,
    price: priceNum,
    address: address ? address.trim() : "",
    description: description ? description.trim() : "",
    contact_name: contact_name ? contact_name.trim() : "",
    contact_phone: contact_phone ? contact_phone.trim() : "",
    contact_email: contact_email ? contact_email.trim().toLowerCase() : "",
    source: "admin",
  });

  return res.redirect("/admin?status=apartment_added");
});

app.post("/admin/apartments/upload", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.redirect("/admin?status=file_missing");
  }

  const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return res.redirect("/admin?status=empty_sheet");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const apartments = rows
    .map((row) => {
      const title = readCell(row, ["title", "כותרת", "שם דירה"]);
      const neighborhood = readCell(row, ["neighborhood", "שכונה"]);
      const roomsRaw = readCell(row, ["rooms", "חדרים"]);
      const priceRaw = readCell(row, ["price", "מחיר"]);

      const rooms = parseNumber(roomsRaw);
      const price = parseNumber(priceRaw);
      if (!title || !neighborhood || !rooms || !price) {
        return null;
      }

      return {
        title: String(title).trim(),
        neighborhood: String(neighborhood).trim(),
        rooms,
        price,
        address: String(readCell(row, ["address", "כתובת"]) || "").trim(),
        description: String(readCell(row, ["description", "תיאור"]) || "").trim(),
        contact_name: String(readCell(row, ["contact_name", "איש קשר"]) || "").trim(),
        contact_phone: String(readCell(row, ["contact_phone", "טלפון"]) || "").trim(),
        contact_email: String(readCell(row, ["contact_email", "אימייל"]) || "")
          .trim()
          .toLowerCase(),
        source: "admin",
      };
    })
    .filter(Boolean);

  if (!apartments.length) {
    return res.redirect("/admin?status=no_valid_rows");
  }

  importApartments(apartments);
  return res.redirect(`/admin?status=excel_imported_${apartments.length}`);
});

app.post("/admin/newsletter/run", requireAdmin, async (_req, res) => {
  try {
    await runNewsletterJob();
    return res.redirect("/admin?status=newsletter_sent");
  } catch (error) {
    console.error(error);
    return res.redirect("/admin?status=newsletter_failed");
  }
});

app.use((_req, res) => {
  res.status(404).render("not-found", { message: "העמוד לא נמצא." });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  scheduleNewsletter();
  console.log(`Server is running on http://localhost:${port}`);
});
