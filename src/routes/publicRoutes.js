const express = require("express");
const publicController = require("../controllers/publicController");

const router = express.Router();

router.get("/", publicController.renderHome);
router.post("/requests", publicController.createSearchRequest);

router.get("/my-area", publicController.renderMyAreaLogin);
router.post("/my-area", publicController.loginMyArea);
router.get("/my-area/:token", publicController.renderMyAreaByToken);

router.get("/guest-apartment/new", publicController.renderGuestApartmentForm);
router.post("/guest-apartment", publicController.createGuestApartment);

module.exports = router;
