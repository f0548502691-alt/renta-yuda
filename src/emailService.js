const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  } else {
    // For local/dev usage when SMTP is not configured.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

function apartmentListHtml(apartments, includeContacts) {
  if (!apartments.length) {
    return "<p>כרגע אין דירות חדשות שמתאימות לחיפוש.</p>";
  }

  const lines = apartments.map((apt) => {
    const contactPart = includeContacts
      ? `<div><strong>איש קשר:</strong> ${apt.contact_name || "-"} | ${apt.contact_phone || "-"} | ${apt.contact_email || "-"}</div>`
      : "<div><em>פרטי קשר זמינים לאחר השלמת תשלום.</em></div>";

    return `
      <li style="margin-bottom: 12px;">
        <div><strong>${apt.title}</strong></div>
        <div>שכונה: ${apt.neighborhood} | חדרים: ${apt.rooms} | מחיר: ${apt.price.toLocaleString("he-IL")} ₪</div>
        <div>כתובת: ${apt.address || "-"}</div>
        ${contactPart}
      </li>
    `;
  });

  return `<ul>${lines.join("")}</ul>`;
}

async function sendMail(to, subject, html, text) {
  const from = process.env.MAIL_FROM || "no-reply@renta-yuda.local";
  const info = await getTransporter().sendMail({ to, from, subject, html, text });

  if (info.message && typeof info.message === "string") {
    console.log("Mail preview:", info.message);
  }
}

async function sendPaymentApprovedEmail(searchRequest) {
  const personalAreaUrl = `${process.env.APP_BASE_URL || "http://localhost:3000"}/my-area/${searchRequest.access_token}`;
  const subject = "התשלום אושר - אפשר לגשת לאזור האישי";
  const html = `
    <h2>שלום ${searchRequest.full_name},</h2>
    <p>התשלום שלך אושר. מעכשיו ניתן לצפות בפרטי יצירת קשר של המפרסמים.</p>
    <p><a href="${personalAreaUrl}">כניסה לאזור האישי</a></p>
  `;
  const text = `שלום ${searchRequest.full_name}, התשלום שלך אושר. כניסה לאזור אישי: ${personalAreaUrl}`;
  await sendMail(searchRequest.email, subject, html, text);
}

async function sendBiWeeklyDigest(searchRequest, apartments, includeContacts) {
  const subject = "רשימת דירות מעודכנת מהמערכת";
  const html = `
    <h2>שלום ${searchRequest.full_name},</h2>
    <p>להלן הדירות המעודכנות שמתאימות לחיפוש שלך:</p>
    ${apartmentListHtml(apartments, includeContacts)}
    <p>כניסה לאזור אישי: <a href="${process.env.APP_BASE_URL || "http://localhost:3000"}/my-area/${searchRequest.access_token}">לחץ כאן</a></p>
  `;
  const text = `שלום ${searchRequest.full_name}, מצורפת רשימת דירות מעודכנת (${apartments.length} תוצאות).`;
  await sendMail(searchRequest.email, subject, html, text);
}

module.exports = {
  sendBiWeeklyDigest,
  sendPaymentApprovedEmail,
};
