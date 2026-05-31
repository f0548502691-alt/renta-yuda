const crypto = require("crypto");
const apartmentService = require("../services/apartmentService");
const authService = require("../services/authService");
const requestService = require("../services/requestService");

function renderHome(req, res) {
  res.render("index", {
    success: req.query.success || null,
    error: req.query.error || null,
  });
}

function renderAbout(_req, res) {
  res.render("about");
}

function renderLogin(req, res) {
  res.render("login", {
    error: null,
    success: null,
    next: authService.normalizeReturnTo(req.query.next, "/payments"),
  });
}

async function login(req, res) {
  const next = authService.normalizeReturnTo(req.body.next, "/payments");
  const result = await authService.loginWithEmail(req.body);

  if (result.status !== "ok") {
    return res.status(401).render("login", {
      error: "האימייל או הסיסמה שגויים.",
      success: null,
      next,
    });
  }

  req.session.authUser = authService.createSessionUser(result.user);
  return res.redirect(next);
}

async function register(req, res) {
  const next = authService.normalizeReturnTo(req.body.next, "/payments");
  const result = await authService.registerWithEmail(req.body);

  if (result.status === "email_exists") {
    return res.status(409).render("login", {
      error: "כבר קיים משתמש עם האימייל הזה. אפשר להתחבר באמצעות הסיסמה.",
      success: null,
      next,
    });
  }

  if (result.status !== "ok") {
    return res.status(400).render("login", {
      error: "יש להזין שם, אימייל וסיסמה באורך 6 תווים לפחות.",
      success: null,
      next,
    });
  }

  req.session.authUser = authService.createSessionUser(result.user);
  return res.redirect(next);
}

function getBaseUrl(req) {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getGoogleRedirectUri(req) {
  return process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;
}

function startGoogleLogin(req, res) {
  const next = authService.normalizeReturnTo(req.query.next, "/payments");
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = authService.buildGoogleAuthUrl({
    redirectUri: getGoogleRedirectUri(req),
    state,
  });

  if (!authUrl) {
    return res.status(503).render("login", {
      error: "התחברות Google SSO עדיין לא הוגדרה בסביבה.",
      success: null,
      next,
    });
  }

  req.session.googleOAuthState = {
    state,
    next,
    createdAt: Date.now(),
  };
  return res.redirect(authUrl);
}

async function handleGoogleCallback(req, res) {
  const savedState = req.session.googleOAuthState;
  delete req.session.googleOAuthState;

  if (!savedState || savedState.state !== req.query.state || !req.query.code) {
    return res.status(400).render("login", {
      error: "לא ניתן להשלים התחברות Google. נסו שוב.",
      success: null,
      next: "/payments",
    });
  }

  const result = await authService.authenticateWithGoogleCode({
    code: req.query.code,
    redirectUri: getGoogleRedirectUri(req),
  });

  if (result.status !== "ok") {
    return res.status(400).render("login", {
      error: "התחברות Google נכשלה. נסו שוב או התחברו באמצעות אימייל וסיסמה.",
      success: null,
      next: savedState.next,
    });
  }

  req.session.authUser = authService.createSessionUser(result.user);
  return res.redirect(authService.normalizeReturnTo(savedState.next, "/payments"));
}

function logout(req, res) {
  req.session.authUser = null;
  return res.redirect("/");
}

function redirectToLogin(req, res) {
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || "/payments")}`);
}

async function renderPayments(req, res) {
  if (!req.session.authUser) {
    return redirectToLogin(req, res);
  }

  const token = String(req.query.token || "").trim();
  const areaData = token ? await requestService.getAreaByToken(token) : null;

  if (token && !areaData) {
    return res.status(404).render("not-found", { message: "בקשת החיפוש לא נמצאה." });
  }

  return res.render("payments", {
    user: req.session.authUser,
    request: areaData ? areaData.request : null,
    hasFullAccess: areaData ? areaData.hasFullAccess : false,
    token,
    status: req.query.status || null,
  });
}

function renderSubscribe(req, res) {
  if (!req.session.authUser) {
    return redirectToLogin(req, res);
  }

  return res.redirect("/payments");
}

async function startPayment(req, res) {
  if (!req.session.authUser) {
    return redirectToLogin(req, res);
  }

  const token = String(req.body.token || "").trim();
  if (token) {
    const areaData = await requestService.getAreaByToken(token);
    if (!areaData) {
      return res.status(404).render("not-found", { message: "בקשת החיפוש לא נמצאה." });
    }
  }

  req.session.pendingPayment = {
    token: token || null,
    requestedAt: new Date().toISOString(),
  };

  const redirectUrl = token
    ? `/payments?token=${encodeURIComponent(token)}&status=payment_started`
    : "/payments?status=payment_started";
  return res.redirect(redirectUrl);
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
  handleGoogleCallback,
  login,
  loginMyArea,
  logout,
  register,
  renderAbout,
  renderPayments,
  renderGuestApartmentForm,
  renderHome,
  renderLogin,
  renderMyAreaByToken,
  renderMyAreaLogin,
  renderNotFound,
  renderSubscribe,
  startGoogleLogin,
  startPayment,
};
