const adminService = require("../services/adminService");
const apartmentService = require("../services/apartmentService");

function renderAdminLogin(_req, res) {
  res.render("admin-login", { error: null });
}

function loginAdmin(req, res) {
  if (adminService.authenticateAdmin(req.body.username, req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  return res.status(401).render("admin-login", { error: "פרטי ההתחברות שגויים." });
}

function logoutAdmin(req, res) {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
}

async function renderDashboard(req, res) {
  const dashboardData = await adminService.getDashboardData();
  res.render("admin-dashboard", {
    ...dashboardData,
    status: req.query.status || null,
  });
}

async function markRequestAsPaid(req, res) {
  const result = await adminService.approvePayment(req.params.id);
  return res.redirect(`/admin?status=${result.status}`);
}

async function createAdminApartment(req, res) {
  const apartment = await apartmentService.createAdminApartment(req.body);
  if (!apartment) {
    return res.redirect("/admin?status=missing_apartment_fields");
  }

  return res.redirect("/admin?status=apartment_added");
}

async function uploadApartmentsExcel(req, res) {
  if (!req.file) {
    return res.redirect("/admin?status=file_missing");
  }

  const importedCount = await apartmentService.importApartmentsFromExcel(req.file.buffer);
  if (!importedCount) {
    return res.redirect("/admin?status=no_valid_rows");
  }

  return res.redirect(`/admin?status=excel_imported_${importedCount}`);
}

async function runNewsletterNow(_req, res) {
  const result = await adminService.triggerNewsletter();
  return res.redirect(`/admin?status=${result.status}`);
}

async function runScheduledNewsletter(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const fromVercelCron = Boolean(req.headers["x-vercel-cron"]);

  const isAuthorized = cronSecret
    ? token === cronSecret
    : fromVercelCron || process.env.NODE_ENV !== "production";

  if (!isAuthorized) {
    return res.status(401).json({ ok: false, message: "Unauthorized cron request" });
  }

  const result = await adminService.triggerNewsletter();
  if (result.status !== "newsletter_sent") {
    return res.status(500).json({ ok: false, status: result.status });
  }

  return res.json({ ok: true, status: result.status });
}

module.exports = {
  createAdminApartment,
  loginAdmin,
  logoutAdmin,
  markRequestAsPaid,
  renderAdminLogin,
  renderDashboard,
  runNewsletterNow,
  runScheduledNewsletter,
  uploadApartmentsExcel,
};
