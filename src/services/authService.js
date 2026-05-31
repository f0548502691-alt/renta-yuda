const crypto = require("crypto");
const authUserRepository = require("../repositories/authUserRepository");

const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";
const MIN_PASSWORD_LENGTH = 6;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeReturnTo(value, fallback = "/payments") {
  const returnTo = String(value || "").trim();
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }

  return returnTo;
}

function createSessionUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    providers: user.providers || [],
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return { hash, salt };
}

function verifyPassword(user, password) {
  if (!user.password_hash || !user.password_salt) {
    return false;
  }

  const { hash } = hashPassword(password, user.password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.password_hash, "hex"));
}

async function registerWithEmail(input) {
  const fullName = String(input.full_name || "").trim();
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");

  if (!fullName || !email || password.length < MIN_PASSWORD_LENGTH) {
    return { status: "invalid_registration" };
  }

  const existing = await authUserRepository.findByEmail(email);
  if (existing) {
    return { status: "email_exists" };
  }

  const { hash, salt } = hashPassword(password);
  const user = await authUserRepository.createEmailUser({
    full_name: fullName,
    email,
    password_hash: hash,
    password_salt: salt,
  });

  return { status: "ok", user };
}

async function loginWithEmail(input) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");

  if (!email || !password) {
    return { status: "invalid_credentials" };
  }

  const user = await authUserRepository.findByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    return { status: "invalid_credentials" };
  }

  const updatedUser = await authUserRepository.markLogin(user.id);
  return { status: "ok", user: updatedUser || user };
}

function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

function buildGoogleAuthUrl({ redirectUri, state }) {
  const { clientId } = getGoogleConfig();
  if (!clientId) {
    return null;
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function authenticateWithGoogleCode({ code, redirectUri }) {
  const { clientId, clientSecret } = getGoogleConfig();
  if (!clientId || !clientSecret) {
    return { status: "google_not_configured" };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return { status: "google_failed" };
  }

  const tokenData = await tokenResponse.json();
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileResponse.ok) {
    return { status: "google_failed" };
  }

  const profile = await profileResponse.json();
  if (!profile.email || !profile.sub) {
    return { status: "google_failed" };
  }

  const user = await authUserRepository.upsertGoogleUser({
    google_id: profile.sub,
    email: profile.email,
    full_name: profile.name || profile.email,
  });

  return { status: "ok", user };
}

module.exports = {
  authenticateWithGoogleCode,
  buildGoogleAuthUrl,
  createSessionUser,
  loginWithEmail,
  normalizeReturnTo,
  registerWithEmail,
};
