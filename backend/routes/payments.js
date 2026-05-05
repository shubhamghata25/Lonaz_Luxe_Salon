/**
 * FILE: backend/routes/payments.js  [MODIFIED]
 *
 * Changes from v1:
 *  - calculateFinalAmount() applied before creating Razorpay/Paytm orders
 *  - Paytm integration added (mock-ready, swap in real SDK)
 *  - fee_applied, payment_method, transaction_id stored in payments table
 *  - After successful payment: calls bookings/:id/confirm-payment
 *  - All v1 UPI manual + admin verify endpoints preserved
 */
const router = require("express").Router();
const db = require("../config/db");
const { sendBookingConfirmation, sendOwnerAlert } = require("../utils/email");
const { sendWhatsAppConfirmation } = require("../utils/whatsapp");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

const upload = require("../utils/multer");
const crypto = require("crypto");
const { calculateFinalAmount } = require("../utils/paymentUtils");

let Razorpay;
try { Razorpay = require("razorpay"); } catch {}

const getRazorpay = () => {
  if (!Razorpay || !process.env.RAZORPAY_KEY_ID) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

// ── RAZORPAY ORDER (MODIFIED: fee logic + advance 20%) ─────────────────────
router.post("/razorpay/order", authenticate, [
  body("booking_id").isUUID().withMessage("valid booking_id required"),
], validate, async (req, res) => {
  const rz = getRazorpay();
  if (!rz) return res.status(503).json({ error: "Razorpay not configured" });

  const { booking_id } = req.body;
  try {
    const { rows } = await db.query("SELECT * FROM bookings WHERE id=$1", [booking_id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });

    const booking = rows[0];
    const baseAmount = parseFloat(booking.total_amount || booking.amount);

    // Apply fee rules for advance (20%) payment
    const calc = calculateFinalAmount(baseAmount, "razorpay", "advance");

    const order = await rz.orders.create({
      amount: Math.round(calc.chargeableAmount * 100), // paise
      currency: "INR",
      receipt: booking.booking_ref,
      notes: { booking_id, fee_applied: calc.feeApplied },
    });

    // Persist payment record with fee info
    const { rows: pay } = await db.query(
      `INSERT INTO payments
         (booking_id, user_id, amount, currency, method, payment_method,
          status, razorpay_order_id, gateway_order_id, fee_applied)
       VALUES ($1,$2,$3,'INR','razorpay','razorpay','pending',$4,$4,$5) RETURNING *`,
      [booking_id, req.user.id, calc.chargeableAmount, order.id, calc.feeApplied]
    );

    res.json({
      order_id:    order.id,
      amount:      order.amount,      // in paise
      key:         process.env.RAZORPAY_KEY_ID,
      payment_id:  pay[0].id,
      breakdown:   calc.breakdown,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RAZORPAY VERIFY (MODIFIED: stores transaction_id, triggers booking confirm) ──
router.post("/razorpay/verify", authenticate, [
  body("razorpay_order_id").notEmpty().withMessage("razorpay_order_id required"),
  body("razorpay_payment_id").notEmpty().withMessage("razorpay_payment_id required"),
  body("razorpay_signature").notEmpty().withMessage("razorpay_signature required"),
  body("booking_id").isUUID().withMessage("valid booking_id required"),
], validate, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id, payment_record_id } = req.body;
  // Validate all required fields present
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
    return res.status(400).json({ error: "Missing payment verification fields" });
  }
  // Validate format to prevent injection
  if (!/^order_[a-zA-Z0-9]+$/.test(razorpay_order_id) || !/^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id)) {
    return res.status(400).json({ error: "Invalid payment ID format" });
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: "Invalid payment signature" });

  try {
    const { rows: pay } = await db.query(
      `UPDATE payments
         SET status='success', transaction_id=$1, razorpay_payment_id=$1
       WHERE razorpay_order_id=$2 RETURNING *`,
      [razorpay_payment_id, razorpay_order_id]
    );

    if (!pay.length) return res.status(404).json({ error: "Payment record not found" });

    // Confirm the booking
    const { rows: booking } = await db.query(
      `UPDATE bookings
         SET status='confirmed', payment_status='partially_paid', paid_amount=$1
       WHERE id=$2 RETURNING *`,
      [pay[0].amount, booking_id]
    );

    // Send confirmation email + WhatsApp to customer
    if (booking.length) {
      const { rows: svc } = await db.query("SELECT name FROM services WHERE id=$1", [booking[0].service_id]);
      const svcName = svc[0]?.name || "Service";

      sendBookingConfirmation({
        to:               booking[0].customer_email,
        name:             booking[0].customer_name,
        service:          svcName,
        date:             booking[0].booking_date,
        time:             booking[0].booking_time,
        bookingRef:       booking[0].booking_ref,
        amount:           booking[0].total_amount,
        advancePaid:      booking[0].paid_amount,
        remainingAtSalon: booking[0].remaining_amount,
      }).catch(console.error);

      sendOwnerAlert({
        name:       booking[0].customer_name,
        service:    svcName,
        date:       booking[0].booking_date,
        time:       booking[0].booking_time,
        phone:      booking[0].customer_phone,
        bookingRef: booking[0].booking_ref,
      }).catch(console.error);

      sendWhatsAppConfirmation({
        phone:            booking[0].customer_phone,
        name:             booking[0].customer_name,
        service:          svcName,
        date:             booking[0].booking_date,
        time:             booking[0].booking_time,
        bookingRef:       booking[0].booking_ref,
        amount:           booking[0].total_amount,
        advancePaid:      booking[0].paid_amount,
        remainingAtSalon: booking[0].remaining_amount,
      }).catch(console.error);
    }

    res.json({ message: "Payment verified", payment: pay[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PAYTM ORDER (NEW) ────────────────────────────────────────────────────────
// Paytm SDK wired in — swap mock for real PaytmChecksum when you go live
router.post("/paytm/order", authenticate, async (req, res) => {
  const { booking_id } = req.body;
  if (!process.env.PAYTM_MID) return res.status(503).json({ error: "Paytm not configured" });

  try {
    const { rows } = await db.query("SELECT * FROM bookings WHERE id=$1", [booking_id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });

    const booking = rows[0];
    const baseAmount = parseFloat(booking.total_amount || booking.amount);

    // Paytm: no fee surcharge
    const calc = calculateFinalAmount(baseAmount, "paytm", "advance");
    const orderId = "PAYTM_" + booking.booking_ref + "_" + Date.now();

    const params = {
      MID:            process.env.PAYTM_MID,
      WEBSITE:        process.env.PAYTM_WEBSITE || "WEBSTAGING",
      CHANNEL_ID:     "WEB",
      ORDER_ID:       orderId,
      CUST_ID:        req.user.id,
      TXN_AMOUNT:     calc.chargeableAmount.toFixed(2),
      CURRENCY:       "INR",
      CALLBACK_URL:   `${process.env.BACKEND_URL}/api/payments/paytm/callback`,
    };

    // Persist pending record
    const { rows: pay } = await db.query(
      `INSERT INTO payments
         (booking_id, user_id, amount, currency, method, payment_method,
          status, gateway_order_id, fee_applied)
       VALUES ($1,$2,$3,'INR','paytm','paytm','pending',$4,0) RETURNING *`,
      [booking_id, req.user.id, calc.chargeableAmount, orderId]
    );

    res.json({
      params,           // frontend uses these to submit Paytm form
      payment_id: pay[0].id,
      breakdown:  calc.breakdown,
      // TODO: generate real checksum via paytm-pg-node-sdk when live
      checksum:   "MOCK_CHECKSUM_REPLACE_WITH_REAL",
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PAYTM CALLBACK (NEW) ─────────────────────────────────────────────────────
router.post("/paytm/callback", async (req, res) => {
  const { STATUS, ORDERID, TXNID, TXNAMOUNT } = req.body;
  try {
    if (STATUS === "TXN_SUCCESS") {
      const { rows: pay } = await db.query(
        `UPDATE payments SET status='success', transaction_id=$1
         WHERE gateway_order_id=$2 RETURNING *`,
        [TXNID, ORDERID]
      );
      if (pay.length) {
        await db.query(
          `UPDATE bookings SET status='confirmed', payment_status='partially_paid'
           WHERE id=$1`, [pay[0].booking_id]
        );
      }
    } else {
      await db.query(
        "UPDATE payments SET status='failed' WHERE gateway_order_id=$1", [ORDERID]
      );
    }
    // Redirect to frontend booking confirmation page
    res.redirect(`${process.env.FRONTEND_URL}/booking/success?order=${ORDERID}`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── UPI MANUAL UPLOAD (unchanged) ────────────────────────────────────────────
router.post("/upi/upload", authenticate, (req, res, next) => {
  req.uploadFolder = "payments"; next();
}, upload.single("screenshot"), async (req, res) => {
  const { booking_id } = req.body;
  if (!req.file) return res.status(400).json({ error: "Screenshot required" });
  try {
    const { rows: booking } = await db.query("SELECT * FROM bookings WHERE id=$1", [booking_id]);
    if (!booking.length) return res.status(404).json({ error: "Booking not found" });

    const screenshotUrl = `/uploads/payments/${req.file.filename}`;
    const { rows } = await db.query(
      `INSERT INTO payments (booking_id,user_id,amount,method,payment_method,status,upi_screenshot_url,fee_applied)
       VALUES ($1,$2,$3,'upi_manual','upi_manual','pending',$4,0) RETURNING *`,
      [booking_id, req.user.id, booking[0].paid_amount || booking[0].amount, screenshotUrl]
    );
    res.status(201).json({ ...rows[0], message: "Screenshot uploaded. Awaiting admin verification." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PENDING UPI (admin, unchanged) ───────────────────────────────────────────
router.get("/pending", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,b.booking_ref,b.customer_name,b.customer_email,s.name AS service_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id=b.id
       LEFT JOIN services s ON b.service_id=s.id
       WHERE p.method='upi_manual' AND p.status='pending'
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN VERIFY UPI (unchanged) ─────────────────────────────────────────────
router.patch("/:id/verify", authenticate, requireAdmin, async (req, res) => {
  const { approved, note } = req.body;
  const status = approved ? "success" : "failed";
  try {
    const { rows } = await db.query(
      "UPDATE payments SET status=$1,admin_verified=TRUE,admin_note=$2 WHERE id=$3 RETURNING *",
      [status, note, req.params.id]
    );
    if (approved) {
      await db.query(
        "UPDATE bookings SET status='confirmed', payment_status='partially_paid' WHERE id=$1",
        [rows[0].booking_id]
      );
    }
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LIST ALL PAYMENTS (admin, unchanged) ──────────────────────────────────────
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,b.booking_ref,b.customer_name,s.name AS service_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id=b.id
       LEFT JOIN services s ON b.service_id=s.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
