const router = require("express").Router();
const db = require("../config/db");
const { authenticate, requireAdmin } = require("../middleware/auth");

// GET /api/admin/dashboard — summary stats
router.get("/dashboard", authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalBookings, todayBookings, revenue, pendingPayments, contacts, applications] = await Promise.all([
      db.query("SELECT COUNT(*) FROM bookings"),
      db.query("SELECT COUNT(*) FROM bookings WHERE booking_date=CURRENT_DATE"),
      db.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='success'"),
      db.query("SELECT COUNT(*) FROM payments WHERE status='pending' AND method='upi_manual'"),
      db.query("SELECT COUNT(*) FROM contacts WHERE is_read=FALSE"),
      db.query("SELECT COUNT(*) FROM applications WHERE status='new'"),
    ]);

    const bookingsByStatus = await db.query(
      "SELECT status, COUNT(*) FROM bookings GROUP BY status"
    );
    const revenueByMonth = await db.query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month, SUM(amount) AS total
       FROM payments WHERE status='success'
       GROUP BY month ORDER BY month DESC LIMIT 6`
    );
    const topServices = await db.query(
      `SELECT s.name, COUNT(b.id) AS bookings, SUM(b.amount) AS revenue
       FROM bookings b JOIN services s ON b.service_id=s.id
       WHERE b.status IN ('confirmed','completed')
       GROUP BY s.name ORDER BY bookings DESC LIMIT 5`
    );

    res.json({
      stats: {
        total_bookings: totalBookings.rows[0].count,
        today_bookings: todayBookings.rows[0].count,
        total_revenue: revenue.rows[0].total,
        pending_payments: pendingPayments.rows[0].count,
        unread_contacts: contacts.rows[0].count,
        new_applications: applications.rows[0].count,
      },
      bookings_by_status: bookingsByStatus.rows,
      revenue_by_month: revenueByMonth.rows,
      top_services: topServices.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/users
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/bookings/today
router.get("/bookings/today", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*,s.name AS service_name FROM bookings b
       LEFT JOIN services s ON b.service_id=s.id
       WHERE b.booking_date=CURRENT_DATE ORDER BY b.booking_time`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
