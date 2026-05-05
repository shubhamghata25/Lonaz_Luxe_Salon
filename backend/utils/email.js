/**
 * Email via Brevo REST API (not SMTP — avoids port blocking on Render free tier)
 * Set in Render env vars:
 *   BREVO_API_KEY  = your Brevo API key (from brevo.com → SMTP & API → API Keys)
 *   OWNER_EMAIL    = hello@lonazluxe.in
 */

const https = require("https");

const BRAND   = "LONAZ LUXE SALON";
const GOLD    = "#C9A84C";
const BG      = "#0a2a21";
const TEXT    = "#F5F0E8";
const MUTED   = "#9B8B7A";
const ADDRESS = "Ayra Realties Building, Dabha, Vayusena Nagar, Nagpur 440023";
const PHONE   = "+91 90968 63511";
const FROM    = process.env.BREVO_SENDER_EMAIL || "hello@lonazluxe.in";
const FROM_NAME = BRAND;

const canEmail = () => {
  const ok = !!process.env.BREVO_API_KEY;
  if (!ok) console.warn("⚠️  BREVO_API_KEY not set — skipping email");
  return ok;
};

const sendViaBrevo = (to, toName, subject, html) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    sender: { name: FROM_NAME, email: FROM },
    to: [{ email: to, name: toName }],
    subject,
    htmlContent: html,
  });

  const req = https.request({
    hostname: "api.brevo.com",
    path: "/v3/smtp/email",
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(data);
      } else {
        reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
      }
    });
  });

  req.on("error", reject);
  req.write(body);
  req.end();
});

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Kolkata" });
  } catch { return d; }
};

const formatTime = (t) => {
  try {
    const [h, m] = t.toString().slice(0,5).split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ampm}`;
  } catch { return t; }
};

const wrap = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Georgia,serif">
<div style="max-width:600px;margin:32px auto;background:${BG};border-top:4px solid ${GOLD};border-radius:4px;overflow:hidden">
  <div style="padding:32px 36px 0">
    <h1 style="margin:0 0 4px;font-size:20px;letter-spacing:4px;color:${GOLD}">${BRAND}</h1>
    <p style="margin:0;font-size:10px;letter-spacing:2px;color:${MUTED};text-transform:uppercase">Where Beauty Meets Luxury</p>
  </div>
  <div style="padding:28px 36px">${body}</div>
  <div style="padding:20px 36px;border-top:1px solid #1a3d2a;background:#061a12">
    <p style="margin:0;font-size:11px;color:${MUTED}">📍 ${ADDRESS}</p>
    <p style="margin:6px 0 0;font-size:11px;color:${MUTED}">📞 ${PHONE}</p>
    <p style="margin:12px 0 0;font-size:9px;letter-spacing:2px;color:${GOLD};text-transform:uppercase">${BRAND}</p>
  </div>
</div></body></html>`;

const row = (label, value, highlight=false) => `
<tr>
  <td style="padding:10px 12px;color:${MUTED};font-size:13px;border-bottom:1px solid #1a3d2a;width:140px">${label}</td>
  <td style="padding:10px 12px;color:${highlight?GOLD:TEXT};font-size:13px;border-bottom:1px solid #1a3d2a;font-weight:${highlight?"bold":"normal"}">${value}</td>
</tr>`;

// ── BOOKING CONFIRMATION ────────────────────────────────────────────────────
const sendBookingConfirmation = async ({ to, name, service, date, time, bookingRef, amount, advancePaid, remainingAtSalon }) => {
  if (!canEmail()) return;
  try {
    const html = wrap(`
      <p style="color:${TEXT};font-size:16px;margin:0 0 8px">Dear <strong>${name}</strong>,</p>
      <p style="color:${MUTED};font-size:13px;margin:0 0 24px">Your appointment is <strong style="color:#4CAF50">confirmed</strong>!</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row("Booking Ref", bookingRef, true)}
        ${row("Service", service)}
        ${row("Date", formatDate(date))}
        ${row("Time", formatTime(time))}
        ${row("Total", "₹"+amount, true)}
        ${advancePaid ? row("Advance Paid", "₹"+advancePaid) : ""}
        ${remainingAtSalon ? row("Pay at Salon", "₹"+remainingAtSalon) : ""}
      </table>
      <p style="color:${MUTED};font-size:12px">Please arrive 5 minutes before your appointment. See you soon! ✨</p>`);

    await sendViaBrevo(to, name, `✅ Booking Confirmed — ${bookingRef} | ${BRAND}`, html);
    console.log(`✅ Booking confirmation email sent to ${to}`);
  } catch (e) { console.error("Booking email failed:", e.message); }
};

// ── OWNER ALERT ─────────────────────────────────────────────────────────────
const sendOwnerAlert = async ({ name, service, date, time, phone, bookingRef }) => {
  if (!canEmail() || !process.env.OWNER_EMAIL) return;
  try {
    const html = wrap(`
      <p style="color:${TEXT};font-size:15px;margin:0 0 20px">🔔 <strong>New Booking Received</strong></p>
      <table style="width:100%;border-collapse:collapse">
        ${row("Ref", bookingRef, true)}
        ${row("Customer", name)}
        ${row("Phone", phone||"N/A")}
        ${row("Service", service)}
        ${row("Date", formatDate(date))}
        ${row("Time", formatTime(time))}
      </table>`);

    await sendViaBrevo(process.env.OWNER_EMAIL, "Salon Owner", `🔔 New Booking: ${name} — ${service}`, html);
    console.log(`✅ Owner alert sent to ${process.env.OWNER_EMAIL}`);
  } catch (e) { console.error("Owner alert failed:", e.message); }
};

// ── COURSE ENROLLMENT ───────────────────────────────────────────────────────
const sendCourseEnrollmentConfirmation = async ({ to, name, courseTitle, amount, videoUrl }) => {
  if (!canEmail()) return;
  try {
    const html = wrap(`
      <p style="color:${TEXT};font-size:16px;margin:0 0 8px">Dear <strong>${name}</strong>,</p>
      <p style="color:${MUTED};font-size:13px;margin:0 0 24px">You have enrolled in <strong style="color:${GOLD}">${courseTitle}</strong>!</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row("Course", courseTitle, true)}
        ${row("Amount Paid", "₹"+amount)}
        ${row("Access", "Lifetime Access")}
      </table>
      ${videoUrl ? `<a href="${videoUrl}" style="display:inline-block;background:${GOLD};color:#0a2a21;padding:14px 32px;text-decoration:none;font-size:11px;letter-spacing:2px;font-weight:bold;border-radius:2px">▶ START LEARNING</a>` : ""}
      <p style="color:${MUTED};font-size:12px;margin-top:20px">Login anytime to access your courses.</p>`);

    await sendViaBrevo(to, name, `🎓 Enrollment Confirmed — ${courseTitle} | ${BRAND}`, html);
    console.log(`✅ Course enrollment email sent to ${to}`);
  } catch (e) { console.error("Course email failed:", e.message); }
};

// ── REMINDER ────────────────────────────────────────────────────────────────
const sendReminderEmail = async ({ to, name, service, date, time }) => {
  if (!canEmail()) return;
  try {
    const html = wrap(`
      <p style="color:${TEXT};font-size:16px;margin:0 0 8px">Hi <strong>${name}</strong>,</p>
      <p style="color:${MUTED};font-size:13px;margin:0 0 16px">Reminder for your appointment tomorrow.</p>
      <div style="text-align:center;padding:20px;border:1px solid ${GOLD};border-radius:4px;margin-bottom:20px">
        <p style="color:${GOLD};font-size:20px;margin:0;font-weight:bold">${service}</p>
        <p style="color:${TEXT};font-size:16px;margin:8px 0 0">${formatDate(date)} at <strong>${formatTime(time)}</strong></p>
      </div>
      <p style="color:${MUTED};font-size:12px">Please arrive 5 minutes early. See you soon! ✨</p>`);

    await sendViaBrevo(to, name, `⏰ Reminder: Your appointment tomorrow | ${BRAND}`, html);
  } catch (e) { console.error("Reminder email failed:", e.message); }
};

module.exports = { sendBookingConfirmation, sendOwnerAlert, sendCourseEnrollmentConfirmation, sendReminderEmail };
