/**
 * FILE: backend/routes/bookings.js
 */
const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};
const { sendBookingConfirmation, sendOwnerAlert } = require("../utils/email");
const { sendWhatsAppConfirmation } = require("../utils/whatsapp");
const { calculateFinalAmount } = require("../utils/paymentUtils");

const genRef = () => "SB" + Date.now().toString(36).toUpperCase().slice(-6);

/** "09:15" -> minutes-since-midnight */
const toMins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** minutes-since-midnight -> "09:15" */
const fromMins = (m) => {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ── AVAILABILITY ─────────────────────────────────────────────────────────────
router.get("/availability", async (req, res) => {
  const { date, service_id } = req.query;
  if (!date) return res.status(400).json({ error: "date required" });

  try {
    const { rows: slotRows } = await db.query(
      "SELECT slot_time FROM time_slot_configs WHERE is_active=TRUE ORDER BY slot_time"
    );
    const allSlotTimes = slotRows.map((r) => r.slot_time.slice(0, 5));

    let slotsNeeded = 1;
    if (service_id) {
      const { rows: svc } = await db.query(
        "SELECT slot_duration, duration FROM services WHERE id=$1",
        [service_id]
      );
      if (svc.length) {
        const dur = svc[0].slot_duration || svc[0].duration || 30;
        slotsNeeded = Math.ceil(dur / 15);
      }
    }

    // Only block slots for confirmed bookings — not pending/unpaid ones
    const { rows: booked } = await db.query(
      `SELECT booking_time, end_time, slot_count
       FROM bookings
       WHERE booking_date=$1 AND status IN ('confirmed', 'completed')`,
      [date]
    );

    const occupiedMins = new Set();
    for (const bk of booked) {
      const startM = toMins(bk.booking_time.slice(0, 5));
      // Use end_time if available, otherwise calculate from slot_count
      let endM;
      if (bk.end_time) {
        endM = toMins(bk.end_time.slice(0, 5));
      } else {
        endM = startM + (bk.slot_count || 1) * 15;
      }
      for (let m = startM; m < endM; m += 15) {
        occupiedMins.add(m);
      }
    }

    const result = allSlotTimes.map((time) => {
      const startM = toMins(time);
      let available = true;

      for (let i = 0; i < slotsNeeded; i++) {
        if (occupiedMins.has(startM + i * 15)) {
          available = false;
          break;
        }
      }

      // Ensure all required consecutive slots exist in the schedule
      if (available && slotsNeeded > 1) {
        for (let i = 1; i < slotsNeeded; i++) {
          const needed = fromMins(startM + i * 15);
          if (!allSlotTimes.includes(needed)) {
            available = false;
            break;
          }
        }
      }

      return { time, available };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CREATE BOOKING ────────────────────────────────────────────────────────────
router.post(
  "/",
  [
    body("service_id").notEmpty(),
    body("customer_name").trim().isLength({ min: 2 }),
    body("customer_email").isEmail().normalizeEmail(),
    body("booking_date").isDate(),
    body("booking_time").matches(/^\d{2}:\d{2}$/),
    body("customer_phone").notEmpty().withMessage("Phone number is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      service_id,
      customer_name,
      customer_email,
      customer_phone,
      booking_date,
      booking_time,
      notes,
      user_id,
      payment_method = "razorpay",
      sub_service_id,
    } = req.body;

    try {
      let basePrice;
      let slotsNeeded = 1;
      let resolvedServiceId = service_id;

      if (sub_service_id) {
        const { rows: sub } = await db.query(
          "SELECT * FROM sub_services WHERE id=$1 AND is_active=TRUE",
          [sub_service_id]
        );
        if (!sub.length)
          return res.status(404).json({ error: "Sub-service not found" });
        basePrice = parseFloat(sub[0].price);
        resolvedServiceId = sub[0].service_id;
      }

      const { rows: svc } = await db.query(
        "SELECT * FROM services WHERE id=$1",
        [service_id]
      );
      if (!svc.length)
        return res.status(404).json({ error: "Service not found" });

      if (!sub_service_id) basePrice = parseFloat(svc[0].price);

      const dur = svc[0].slot_duration || svc[0].duration || 30;
      slotsNeeded = Math.ceil(dur / 15);

      const startM = toMins(booking_time);
      const endM = startM + slotsNeeded * 15;
      const endTime = fromMins(endM);

      // Only check conflicts against confirmed/completed bookings
      const { rows: conflict } = await db.query(
        `SELECT id FROM bookings
         WHERE booking_date=$1
           AND status IN ('confirmed', 'completed')
           AND booking_time < $3::time
           AND (
             (end_time IS NOT NULL AND end_time > $2::time)
             OR
             (end_time IS NULL AND booking_time >= $2::time AND booking_time < $3::time)
           )`,
        [booking_date, booking_time, endTime]
      );
      if (conflict.length)
        return res.status(409).json({ error: "Slot already booked" });

      const payCalc = calculateFinalAmount(basePrice, payment_method, "advance");
      const ref = genRef();

      const { rows } = await db.query(
        `INSERT INTO bookings
           (booking_ref, user_id, service_id, sub_service_id,
            customer_name, customer_email, customer_phone,
            booking_date, booking_time, end_time,
            slot_count, notes, status, amount,
            total_amount, paid_amount, remaining_amount, payment_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',
                 $13,$14,$15,$16,'unpaid')
         RETURNING *`,
        [
          ref, user_id || null, resolvedServiceId, sub_service_id || null,
          customer_name, customer_email, customer_phone,
          booking_date, booking_time, endTime,
          slotsNeeded, notes,
          basePrice,
          payCalc.totalAmount, payCalc.advanceAmount, payCalc.remainingAmount,
        ]
      );

      res.status(201).json({ ...rows[0], paymentRequired: payCalc });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// ── CONFIRM BOOKING AFTER PAYMENT ────────────────────────────────────────────
router.patch("/:id/confirm-payment", authenticate, async (req, res) => {
  const { payment_id } = req.body;
  try {
    const { rows: pay } = await db.query(
      "SELECT * FROM payments WHERE id=$1 AND status='success'",
      [payment_id]
    );
    if (!pay.length)
      return res.status(402).json({ error: "Payment not verified" });

    const { rows: booking } = await db.query(
      `UPDATE bookings
         SET status='confirmed', payment_status='partially_paid', paid_amount=$1
       WHERE id=$2 RETURNING *`,
      [pay[0].amount, req.params.id]
    );
    if (!booking.length)
      return res.status(404).json({ error: "Booking not found" });

    const { rows: svc } = await db.query(
      "SELECT name FROM services WHERE id=$1",
      [booking[0].service_id]
    );
    const svcName = svc[0]?.name || "Service";

    sendBookingConfirmation({
      to: booking[0].customer_email,
      name: booking[0].customer_name,
      service: svcName,
      date: booking[0].booking_date,
      time: booking[0].booking_time,
      bookingRef: booking[0].booking_ref,
      amount: booking[0].total_amount,
      advancePaid: booking[0].paid_amount,
      remainingAtSalon: booking[0].remaining_amount,
    }).catch(console.error);

    sendWhatsAppConfirmation({
      phone: booking[0].customer_phone,
      name: booking[0].customer_name,
      service: svcName,
      date: booking[0].booking_date,
      time: booking[0].booking_time,
      bookingRef: booking[0].booking_ref,
      amount: booking[0].total_amount,
      advancePaid: booking[0].paid_amount,
      remainingAtSalon: booking[0].remaining_amount,
    }).catch(console.error);

    sendOwnerAlert({
      name: booking[0].customer_name,
      service: svcName,
      date: booking[0].booking_date,
      time: booking[0].booking_time,
      phone: booking[0].customer_phone,
      bookingRef: booking[0].booking_ref,
    }).catch(console.error);

    res.json(booking[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LIST BOOKINGS ─────────────────────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    let q, params;
    if (req.user.role === "admin") {
      q = `SELECT b.*,s.name AS service_name,ss.name AS sub_service_name
           FROM bookings b
           LEFT JOIN services s ON b.service_id=s.id
           LEFT JOIN sub_services ss ON b.sub_service_id=ss.id
           ORDER BY b.booking_date DESC, b.booking_time`;
      params = [];
    } else {
      q = `SELECT b.*,s.name AS service_name,ss.name AS sub_service_name
           FROM bookings b
           LEFT JOIN services s ON b.service_id=s.id
           LEFT JOIN sub_services ss ON b.sub_service_id=ss.id
           WHERE b.user_id=$1 ORDER BY b.booking_date DESC`;
      params = [req.user.id];
    }
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET SINGLE ────────────────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*,s.name AS service_name,s.duration,s.slot_duration
       FROM bookings b LEFT JOIN services s ON b.service_id=s.id WHERE b.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "admin" && rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── UPDATE STATUS (admin) ─────────────────────────────────────────────────────
router.patch("/:id/status", authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["pending", "confirmed", "completed", "cancelled"].includes(status))
    return res.status(400).json({ error: "Invalid status" });
  try {
    const { rows } = await db.query(
      "UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CANCEL (user) ─────────────────────────────────────────────────────────────
router.patch("/:id/cancel", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM bookings WHERE id=$1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "admin" && rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });
    await db.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [req.params.id]);
    res.json({ message: "Booking cancelled" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE (admin only) ───────────────────────────────────────────────────────
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Booking id required" });
  try {
    const { rows } = await db.query("SELECT id FROM bookings WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });
    // Delete child records first (payments may not have CASCADE in all DB versions)
    await db.query("DELETE FROM payments WHERE booking_id=$1", [id]);
    await db.query("DELETE FROM bookings WHERE id=$1", [id]);
    res.json({ message: "Booking deleted" });
  } catch (e) {
    console.error("Delete booking error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// ── WALK-IN BOOKING (admin only — no email required) ─────────────────────────
router.post("/walkin", authenticate, requireAdmin, [
  body("service_id").notEmpty().withMessage("service required"),
  body("customer_name").trim().isLength({ min: 2 }).withMessage("customer name required"),
  body("customer_phone").optional({ nullable: true }).trim(),
  body("booking_date").isDate().withMessage("valid date required"),
  body("booking_time").matches(/^\d{2}:\d{2}$/).withMessage("time required (HH:MM)"),
], validate, async (req, res) => {
  const {
    service_id, sub_service_id,
    customer_name, customer_phone,
    booking_date, booking_time, notes,
  } = req.body;

  try {
    // Resolve price
    let basePrice, resolvedServiceId = service_id;
    if (sub_service_id) {
      const { rows: sub } = await db.query(
        "SELECT * FROM sub_services WHERE id=$1 AND is_active=TRUE", [sub_service_id]
      );
      if (!sub.length) return res.status(404).json({ error: "Sub-service not found" });
      basePrice = parseFloat(sub[0].price);
      resolvedServiceId = sub[0].service_id;
    }

    const { rows: svc } = await db.query("SELECT * FROM services WHERE id=$1", [service_id]);
    if (!svc.length) return res.status(404).json({ error: "Service not found" });
    if (!sub_service_id) basePrice = parseFloat(svc[0].price);

    const dur = svc[0].slot_duration || svc[0].duration || 30;
    const slotsNeeded = Math.ceil(dur / 15);
    const startM = toMins(booking_time);
    const endTime = fromMins(startM + slotsNeeded * 15);

    // Check conflicts
    const { rows: conflict } = await db.query(
      `SELECT id FROM bookings
       WHERE booking_date=$1 AND status IN ('confirmed','completed')
         AND booking_time < $3::time
         AND (
           (end_time IS NOT NULL AND end_time > $2::time)
           OR (end_time IS NULL AND booking_time >= $2::time AND booking_time < $3::time)
         )`,
      [booking_date, booking_time, endTime]
    );
    if (conflict.length) return res.status(409).json({ error: "Slot already booked — pick another time" });

    const ref = genRef();
    const { rows } = await db.query(
      `INSERT INTO bookings
         (booking_ref, user_id, service_id, sub_service_id,
          customer_name, customer_email, customer_phone,
          booking_date, booking_time, end_time,
          slot_count, notes, status,
          amount, total_amount, paid_amount, remaining_amount,
          payment_method, payment_status)
       VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
               'confirmed',$12,$12,0,$12,'cash','unpaid')
       RETURNING *`,
      [
        ref, resolvedServiceId, sub_service_id || null,
        customer_name,
        customer_phone ? `${customer_phone}@walkin.local` : `walkin.${Date.now()}@walkin.local`,
        customer_phone || null,
        booking_date, booking_time, endTime,
        slotsNeeded, notes || "Walk-in booking",
        basePrice,
      ]
    );

    res.status(201).json({ ...rows[0], message: "Walk-in booking created" });
  } catch (e) {
    console.error("Walk-in booking error:", e.message);
    res.status(500).json({ error: e.message });
  }
});
