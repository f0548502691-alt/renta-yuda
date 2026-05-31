const express = require("express");
const publicController = require("../controllers/publicController");

const router = express.Router();

router.get("/", publicController.renderHome);
router.post("/requests", publicController.createSearchRequest);

router.get("/about", publicController.renderAbout);
router.get("/payments", publicController.renderPayments);
router.post("/payments/start", publicController.startPayment);
router.get("/subscribe", publicController.renderSubscribe);

router.get("/login", publicController.renderLogin);
router.post("/login", publicController.login);
router.post("/register", publicController.register);
router.get("/auth/google", publicController.startGoogleLogin);
router.get("/auth/google/callback", publicController.handleGoogleCallback);
router.post("/logout", publicController.logout);

router.get("/my-area", publicController.renderMyAreaLogin);
router.post("/my-area", publicController.loginMyArea);
router.get("/my-area/:token", publicController.renderMyAreaByToken);

router.get("/guest-apartment/new", publicController.renderGuestApartmentForm);
router.post("/guest-apartment", publicController.createGuestApartment);

module.exports = router;
