/**
 * WhatsApp notification via Twilio or direct WhatsApp API
 * Uses WATI (WhatsApp Business API) or falls back to a simple wa.me link log
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env to enable
 */

const formatDate = (d) => {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Kolkata" });
  } catch { return d; }
};

const formatTime = (t) => {
  try {
    const [h, m] = t.toString().slice(0,5).split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2,"0")} ${ampm}`;
  } catch { return t; }
};

const sendWhatsAppConfirmation = async ({ phone, name, service, date, time, bookingRef, amount, advancePaid, remainingAtSalon }) => {
  if (!phone) return;

  // Normalize phone number
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) normalized = "91" + normalized.slice(1);
  if (!normalized.startsWith("91")) normalized = "91" + normalized;

  const message = `Hi ${name}! 🎉

Your booking at *Lonaz Luxe Salon* is confirmed!

📋 *Booking Details:*
• Ref: ${bookingRef}
• Service: ${service}
• Date: ${formatDate(date)}
• Time: ${formatTime(time)}
• Total: ₹${amount}
${advancePaid ? `• Advance Paid: ₹${advancePaid}` : ""}
${remainingAtSalon ? `• Pay at Salon: ₹${remainingAtSalon}` : ""}

📍 Ayra Realties Building, Dabha, Vayusena Nagar, Nagpur 440023
📞 +91 90968 63511

Please arrive 5 minutes early. See you soon! ✨`;

  // Option 1: Twilio WhatsApp
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"}`,
        to:   `whatsapp:+${normalized}`,
        body: message,
      });
      console.log(`✅ WhatsApp sent to +${normalized}`);
      return;
    } catch (e) {
      console.error("Twilio WhatsApp failed:", e.message);
    }
  }

  // Option 2: WATI API
  if (process.env.WATI_API_URL && process.env.WATI_API_TOKEN) {
    try {
      const fetch = require("node-fetch");
      await fetch(`${process.env.WATI_API_URL}/api/v1/sendSessionMessage/${normalized}`, {
        method: "POST",
        headers: { Authorization: process.env.WATI_API_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ messageText: message }),
      });
      console.log(`✅ WATI WhatsApp sent to +${normalized}`);
      return;
    } catch (e) {
      console.error("WATI WhatsApp failed:", e.message);
    }
  }

  // Fallback: just log the message (no WhatsApp API configured)
  console.log(`⚠️  WhatsApp not configured. Message for +${normalized}:\n${message}`);
};

module.exports = { sendWhatsAppConfirmation };
