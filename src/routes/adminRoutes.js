const express = require("express");
const multer = require("multer");
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/admin/login", adminController.renderAdminLogin);
router.post("/admin/login", adminController.loginAdmin);
router.post("/admin/logout", requireAdmin, adminController.logoutAdmin);

router.get("/admin", requireAdmin, adminController.renderDashboard);
router.post("/admin/requests/:id/pay", requireAdmin, adminController.markRequestAsPaid);
router.post("/admin/apartments", requireAdmin, adminController.createAdminApartment);
router.post(
  "/admin/apartments/upload",
  requireAdmin,
  upload.single("file"),
  adminController.uploadApartmentsExcel
);
router.post("/admin/newsletter/run", requireAdmin, adminController.runNewsletterNow);
router.get("/internal/cron/newsletter", adminController.runScheduledNewsletter);

module.exports = router;
