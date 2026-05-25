const apartmentService = require("../services/apartmentService");
const requestService = require("../services/requestService");

function renderHome(req, res) {
  res.render("index", {
    success: req.query.success || null,
    error: req.query.error || null,
  });
}

async function createSearchRequest(req, res) {
  const request = await requestService.createGuestSearchRequest(req.body);
  if (!request) {
    return res.redirect("/?error=missing_request_fields");
  }

  return res.redirect(`/my-area/${request.access_token}?success=request_saved`);
}

function renderMyAreaLogin(_req, res) {
  res.render("my-area-login", { error: null });
}

function loginMyArea(req, res) {
  const { access_token: accessToken } = req.body;
  if (!accessToken) {
    return res.render("my-area-login", {
      error: "יש להזין קוד גישה.",
    });
  }
  return res.redirect(`/my-area/${accessToken.trim()}`);
}

async function renderMyAreaByToken(req, res) {
  const areaData = await requestService.getAreaByToken(req.params.token);
  if (!areaData) {
    return res.status(404).render("not-found", { message: "קוד הגישה לא נמצא במערכת." });
  }

  return res.render("my-area", {
    apartments: areaData.apartments,
    hasFullAccess: areaData.hasFullAccess,
    request: areaData.request,
    success: req.query.success || null,
  });
}

function renderGuestApartmentForm(_req, res) {
  res.render("guest-apartment-form");
}

async function createGuestApartment(req, res) {
  const apartment = await apartmentService.createGuestApartment(req.body);
  if (!apartment) {
    return res.redirect("/?error=missing_apartment_fields");
  }

  return res.redirect("/?success=guest_apartment_created");
}

function renderNotFound(_req, res) {
  return res.status(404).render("not-found", { message: "העמוד לא נמצא." });
}

module.exports = {
  createGuestApartment,
  createSearchRequest,
  loginMyArea,
  renderGuestApartmentForm,
  renderHome,
  renderMyAreaByToken,
  renderMyAreaLogin,
  renderNotFound,
};
