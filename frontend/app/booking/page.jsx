"use client";
/**
 * FILE: frontend/app/booking/page.jsx  [MODIFIED]
 *
 * Changes from v1:
 *  - Step 1: shows sub-services if available (loaded via subServicesAPI)
 *  - Step 2: unchanged (date + slots)
 *  - Step 3: unchanged (customer details)
 *  - Step 4: gateway selector (Razorpay / Paytm / Manual UPI) + shows 20% advance breakdown
 *  - After booking create: opens Razorpay/Paytm checkout or UPI upload
 *  - Booking confirmed ONLY after payment success
 */
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { servicesAPI, subServicesAPI, bookingsAPI, paymentsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { format, addDays, startOfToday } from "date-fns";
import { CheckCircle, Loader, ChevronLeft, ChevronRight, Clock, CreditCard, Upload } from "lucide-react";

const GATEWAY_OPTIONS = [
  { id: "razorpay", label: "Razorpay", sub: "UPI · Card · Netbanking", note: "2% fee on amounts < ₹1,500" },
  { id: "paytm",    label: "Paytm",    sub: "UPI · Wallet · Card",     note: "No extra fee" },
  { id: "upi_manual", label: "Manual UPI", sub: "Pay & upload screenshot", note: "No fee — admin verifies" },
];

function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedService = searchParams.get("service");
  const preselectedSub = searchParams.get("sub");

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [subServices, setSubServices] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [gateway, setGateway] = useState("razorpay");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [bookingRecord, setBookingRecord] = useState(null);
  const [upiFile, setUpiFile] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", password: "" });
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("ss_user");
    if (u) {
      const user = JSON.parse(u);
      setForm(prev => ({ ...prev, name: user.name || "", email: user.email || "" }));
      setIsGuest(false);
    }
  }, []);

  useEffect(() => {
    servicesAPI.list().then(r => {
      setServices(r.data||[]);
      if (preselectedService) {
        const found = (r.data||[]).find(s => s.id === preselectedService);
        if (found) {
          setSelectedService(found);
          setStep(2);
        }
      }
    });
  }, [preselectedService]);

  // Load sub-services when a service is selected
  useEffect(() => {
    if (!selectedService) return;
    setSelectedSub(null);
    subServicesAPI.byService(selectedService.id)
      .then(r => {
        setSubServices(r.data||[]);
        // Pre-select sub from URL ?sub= param
        if (preselectedSub) {
          const found = (r.data||[]).find(s => s.id === preselectedSub);
          if (found) setSelectedSub(found);
        }
      })
      .catch(() => setSubServices([]));
  }, [selectedService]);

  // Load time slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    bookingsAPI.availability(format(selectedDate, "yyyy-MM-dd"), selectedService.id)
      .then(r => setSlots(r.data||[]))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService]);

  // ── Determine effective price ──────────────────────────────────────────────
  const effectivePrice = selectedSub ? parseFloat(selectedSub.price) : selectedService ? parseFloat(selectedService.price) : 0;

  // Preview advance payment breakdown (same logic as backend)
  const getAdvancePreview = () => {
    const advance = parseFloat((effectivePrice * 0.2).toFixed(2));
    const remaining = parseFloat((effectivePrice * 0.8).toFixed(2));
    let fee = 0;
    if (gateway === "razorpay" && advance < 1500) fee = parseFloat((advance * 0.02).toFixed(2));
    return { advance, remaining, fee, chargeNow: parseFloat((advance + fee).toFixed(2)) };
  };

  // ── STEP 4 SUBMIT ──────────────────────────────────────────────────────────
  const handleCreateBooking = async () => {
    if (!form.name || !form.email || !form.phone) return toast.error("Name, email and phone number are required");
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/[\s+\-]/g, ""))) return toast.error("Enter a valid 10-digit Indian mobile number");
    if (isGuest && form.password && form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (isGuest && !form.password) return toast.error("Please set a password to create your account");
    setSubmitting(true);
    try {
      const u = localStorage.getItem("ss_user");
      const userId = u ? JSON.parse(u).id : undefined;

      const { data: booking } = await bookingsAPI.create({
        service_id:     selectedService.id,
        sub_service_id: selectedSub?.id,
        customer_name:  form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        booking_date:   format(selectedDate, "yyyy-MM-dd"),
        booking_time:   selectedSlot,
        notes:          form.notes,
        user_id:        userId,
        payment_method: gateway,
      });

      setBookingRecord(booking);

      // ── Route to payment gateway ──────────────────────────────────────────
      if (gateway === "razorpay") {
        await initiateRazorpay(booking);
      } else if (gateway === "paytm") {
        await initiatePaytm(booking);
      } else {
        // Manual UPI — show upload screen
        setStep(5);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const initiateRazorpay = async (booking) => {
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Razorpay failed to load. Check your internet connection."); return; }
      const { data: order } = await paymentsAPI.createRazorpayOrder(booking.id);
      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    "INR",
        name:        "Lonaz Luxe Salon",
        description: `${selectedSub?.name || selectedService?.name} — 20% Advance`,
        order_id:    order.order_id,
        handler: async (response) => {
          try {
            // Step 1: verify signature
            const { data: verified } = await paymentsAPI.verifyRazorpay({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              booking_id:          booking.id,
            });
            // Auto-register guest user after successful payment
            if (isGuest && form.password) {
              try {
                const { authAPI } = await import("@/lib/api");
                const { data: authData } = await authAPI.register({
                  name: form.name, email: form.email,
                  phone: form.phone, password: form.password,
                });
                if (authData.token) {
                  localStorage.setItem("ss_token", authData.token);
                  localStorage.setItem("ss_user", JSON.stringify(authData.user));
                  toast.success("Account created! You can now login anytime.");
                }
              } catch (e) {
                // User may already exist — that's fine
                console.log("Auto-register note:", e.response?.data?.error || e.message);
              }
            }
            setConfirmed(booking);
            toast.success("Payment successful! Booking confirmed. Check your email.");
          } catch (err) { toast.error("Payment verification failed: " + (err.response?.data?.error || err.message)); }
        },
        prefill:  { name: form.name, email: form.email, contact: form.phone },
        theme:    { color: "#C9A84C" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error("Could not initiate Razorpay: " + (e.response?.data?.error || e.message));
    }
  };

  const initiatePaytm = async (booking) => {
    try {
      const { data } = await paymentsAPI.createPaytmOrder(booking.id);
      // Submit Paytm form programmatically
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://securegw-stage.paytm.in/order/process`;
      Object.entries({ ...data.params, CHECKSUMHASH: data.checksum }).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = k; input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      toast.error("Could not initiate Paytm: " + (e.response?.data?.error || e.message));
    }
  };

  const handleUpiUpload = async () => {
    if (!upiFile) return toast.error("Please select your payment screenshot");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("screenshot", upiFile);
      fd.append("booking_id", bookingRecord.id);
      await paymentsAPI.uploadUpiScreenshot(fd);
      setConfirmed({ ...bookingRecord, upiPending: true });
      toast.success("Screenshot uploaded — awaiting admin verification");
    } catch (e) {
      toast.error(e.response?.data?.error || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── CONFIRMED SCREEN ──────────────────────────────────────────────────────
  if (confirmed) {
    const calc = getAdvancePreview();
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ paddingTop: 70 }}>
        <div className="glass-card p-12 max-w-lg w-full text-center" style={{ borderRadius: 4 }}>
          <CheckCircle size={56} className="text-gold mx-auto mb-6" />
          <h2 className="font-playfair text-3xl text-cream mb-2">
            {confirmed.upiPending ? "Booking Submitted!" : "Booking Confirmed!"}
          </h2>
          <p className="font-lora text-muted mb-8">
            {confirmed.upiPending
              ? "Your booking is awaiting payment verification by our team."
              : "Confirmation has been sent to your email."}
          </p>
          <div className="border border-gold/15 rounded p-6 mb-8 text-left space-y-3">
            <Row label="Reference"     value={bookingRecord?.booking_ref} gold />
            <Row label="Service"       value={selectedSub?.name || selectedService?.name} />
            <Row label="Date"          value={selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""} />
            <Row label="Time"          value={selectedSlot} />
            <div className="border-t border-gold/10 pt-3 space-y-2">
              <Row label="Total Price"      value={`₹${effectivePrice.toFixed(2)}`} />
              <Row label="Advance Paid"     value={`₹${calc.chargeNow.toFixed(2)}`} gold />
              <Row label="Pay at Salon"     value={`₹${calc.remaining.toFixed(2)}`} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="btn-outline flex-1">My Bookings</button>
            <button onClick={() => router.push("/")} className="btn-gold flex-1">Back Home</button>
          </div>
        </div>
      </div>
    );
  }

  const today = startOfToday();
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const calc = getAdvancePreview();

  return (
    <div style={{ paddingTop: 70 }}>
      {/* Header */}
      <div style={{ padding: "20px 5% 12px", textAlign: "center", background: "linear-gradient(180deg,#1a1a1a,#161616)" }}>
        <div className="section-label justify-center"><span className="gold-line" /><span>Reserve Your Spot</span><span className="gold-line" /></div>
        <h1 className="font-playfair text-cream" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700 }}>
          Book an <em className="text-gold">Appointment</em>
        </h1>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 28 }}>
          {["Service","Date","Details","Payment"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontFamily: "'Cinzel',serif", fontSize: 11, fontWeight: 700,
                background: step > i+1 ? "#C9A84C" : step === i+1 ? "rgba(201,168,76,0.15)" : "transparent",
                color: step > i+1 ? "#0a0a0a" : step === i+1 ? "#C9A84C" : "#9B8B7A",
                border: step > i+1 ? "none" : "1px solid rgba(201,168,76,0.3)",
              }}>{i + 1}</div>
              {i < 3 && <div style={{ width: 20, height: 1, background: step > i+1 ? "#C9A84C" : "rgba(201,168,76,0.15)" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: SELECT SERVICE + SUB-SERVICE ─────────────────────── */}
        {step === 1 && (
          <div>
            <h3 className="font-playfair text-cream" style={{ fontSize: 20, marginBottom: 16 }}>Choose a Service</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {services.map(s => (
                <button key={s.id} onClick={() => { setSelectedService(s); setSelectedSub(null); }}
                  className="glass-card" style={{
                    padding: "14px 18px", display: "flex", justifyContent: "space-between",
                    alignItems: "center", cursor: "pointer", textAlign: "left", width: "100%",
                    borderColor: selectedService?.id === s.id ? "#C9A84C" : undefined,
                    background: selectedService?.id === s.id ? "rgba(201,168,76,0.06)" : undefined,
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{s.icon}</span>
                    <div>
                      <div className="font-playfair text-cream" style={{ fontSize: 14 }}>{s.name}</div>
                      <div className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2 }}>{s.duration} MIN</div>
                    </div>
                  </div>
                  <span className="font-playfair text-gold" style={{ fontSize: 16, fontWeight: 700 }}>₹{s.price}</span>
                </button>
              ))}
            </div>

            {/* Sub-services */}
            {selectedService && subServices.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="font-cinzel text-muted" style={{ fontSize: 10, letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
                  Choose a variant for {selectedService.name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {subServices.map(ss => (
                    <button key={ss.id} onClick={() => setSelectedSub(selectedSub?.id === ss.id ? null : ss)}
                      className="font-cinzel"
                      style={{
                        padding: "8px 16px", border: `1px solid ${selectedSub?.id === ss.id ? "#C9A84C" : "rgba(201,168,76,0.2)"}`,
                        background: selectedSub?.id === ss.id ? "rgba(201,168,76,0.1)" : "transparent",
                        color: selectedSub?.id === ss.id ? "#C9A84C" : "#9B8B7A",
                        borderRadius: 2, cursor: "pointer", fontSize: 10, letterSpacing: 2,
                      }}>
                      {ss.name} — ₹{ss.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedService && (
              <button onClick={() => setStep(2)} className="btn-gold" style={{ width: "100%", marginTop: 18 }}>
                Continue <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* ── STEP 2: DATE + TIME ───────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="font-cinzel text-muted" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 10, letterSpacing: 2, cursor: "pointer", background: "none", border: "none" }}>
              <ChevronLeft size={13} /> Back
            </button>
            {/* Service summary */}
            <div className="glass-card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{selectedService?.icon}</span>
                <div>
                  <div className="font-playfair text-cream" style={{ fontSize: 13 }}>
                    {selectedSub?.name || selectedService?.name}
                  </div>
                  <div className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2 }}>{selectedService?.duration} MIN</div>
                </div>
              </div>
              <span className="font-playfair text-gold" style={{ fontSize: 17, fontWeight: 700 }}>₹{effectivePrice}</span>
            </div>

            <h3 className="font-playfair text-cream" style={{ fontSize: 18, marginBottom: 12 }}>Select Date</h3>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
              {calendarDays.map(day => {
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                return (
                  <button key={day.toString()} onClick={() => setSelectedDate(day)}
                    style={{
                      flexShrink: 0, width: 48, height: 56, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none",
                      borderRadius: 4,
                      background: isSelected ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                      outline: isSelected ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.15)",
                    }}>
                    <span className="font-cinzel text-muted" style={{ fontSize: 8, letterSpacing: 1 }}>{format(day, "EEE")}</span>
                    <span className="font-playfair" style={{ fontSize: 17, fontWeight: 700, color: isSelected ? "#C9A84C" : "#9B8B7A" }}>{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <>
                <h3 className="font-playfair text-cream" style={{ fontSize: 16, marginBottom: 10 }}>Select Time</h3>
                {loadingSlots ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                    <Loader size={22} className="text-gold animate-spin" />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
                    {slots.map(({ time, available }) => (
                      <button key={time} disabled={!available} onClick={() => setSelectedSlot(time)}
                        className="font-cinzel"
                        style={{
                          padding: "9px 4px", textAlign: "center", fontSize: 10, letterSpacing: 1, cursor: available ? "pointer" : "not-allowed",
                          border: `1px solid ${selectedSlot === time ? "#C9A84C" : available ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.05)"}`,
                          background: selectedSlot === time ? "rgba(201,168,76,0.12)" : "transparent",
                          color: selectedSlot === time ? "#C9A84C" : available ? "#9B8B7A" : "rgba(155,139,122,0.3)",
                          textDecoration: available ? "none" : "line-through", borderRadius: 4,
                        }}>
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {selectedDate && selectedSlot && (
              <button onClick={() => setStep(3)} className="btn-gold" style={{ width: "100%" }}>
                Continue <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: DETAILS ───────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="font-cinzel text-muted" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 10, letterSpacing: 2, cursor: "pointer", background: "none", border: "none" }}>
              <ChevronLeft size={13} /> Back
            </button>
            <h3 className="font-playfair text-cream" style={{ fontSize: 20, marginBottom: 16 }}>Your Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "FULL NAME *",     key: "name",  type: "text",  ph: "Your name" },
                { label: "EMAIL ADDRESS *", key: "email", type: "email", ph: "email@example.com" },
                { label: "PHONE NUMBER *",  key: "phone", type: "tel",   ph: "+91 XXXXX XXXXX", required: true },
              ].map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
                  <input className="salon-input" type={type} placeholder={ph}
                    value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              {isGuest && (
                <div>
                  <label className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 6, textTransform: "uppercase" }}>CREATE PASSWORD *</label>
                  <input className="salon-input" type="password" placeholder="Min 6 characters — to login later"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <p style={{ fontSize: 10, color: "rgba(155,139,122,0.6)", marginTop: 4, fontFamily: "'Cinzel',serif", letterSpacing: "0.5px" }}>
                    Set a password to access your bookings anytime
                  </p>
                </div>
              )}
              <div>
                <label className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 6, textTransform: "uppercase" }}>SPECIAL REQUESTS</label>
                <textarea className="salon-input" rows={3} placeholder="Any specific requirements?"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <button onClick={() => setStep(4)} disabled={!form.name || !form.email || !form.phone || (isGuest && !form.password)}
              className="btn-gold" style={{ width: "100%", marginTop: 16 }}>
              Choose Payment <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── STEP 4: PAYMENT GATEWAY + 20% ADVANCE ────────────────────── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="font-cinzel text-muted" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 10, letterSpacing: 2, cursor: "pointer", background: "none", border: "none" }}>
              <ChevronLeft size={13} /> Back
            </button>
            <h3 className="font-playfair text-cream" style={{ fontSize: 20, marginBottom: 6 }}>Payment</h3>
            <p className="font-lora text-muted" style={{ fontSize: 12, marginBottom: 18, lineHeight: 1.6 }}>
              Pay 20% advance now to confirm your slot. The remaining is paid at the salon.
            </p>

            {/* Gateway selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {GATEWAY_OPTIONS.map(gw => (
                <button key={gw.id} onClick={() => setGateway(gw.id)}
                  className="glass-card"
                  style={{
                    padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                    cursor: "pointer", textAlign: "left", width: "100%", border: "none",
                    outline: gateway === gw.id ? "2px solid #C9A84C" : "1px solid rgba(201,168,76,0.13)",
                    background: gateway === gw.id ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: gateway === gw.id ? "#C9A84C" : "transparent",
                    border: `2px solid ${gateway === gw.id ? "#C9A84C" : "rgba(201,168,76,0.3)"}`,
                    flexShrink: 0,
                  }} />
                  <div>
                    <div className="font-cinzel text-cream" style={{ fontSize: 12, letterSpacing: 2 }}>{gw.label}</div>
                    <div className="font-lora text-muted" style={{ fontSize: 11 }}>{gw.sub}</div>
                    <div className="font-cinzel" style={{ fontSize: 9, color: gateway === gw.id ? "#C9A84C" : "#9B8B7A", marginTop: 2, letterSpacing: 1 }}>{gw.note}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Advance breakdown */}
            <div className="glass-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
              <div className="font-cinzel text-gold" style={{ fontSize: 9, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>Payment Breakdown</div>
              <Row label="Service Price"      value={`₹${effectivePrice.toFixed(2)}`} />
              <Row label="Advance (20%)"      value={`₹${calc.advance.toFixed(2)}`} />
              {calc.fee > 0 && <Row label={`Gateway Fee (2%)`} value={`₹${calc.fee.toFixed(2)}`} />}
              <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)", marginTop: 8, paddingTop: 8 }}>
                <Row label="Pay Now"    value={`₹${calc.chargeNow.toFixed(2)}`} gold />
                <Row label="Pay at Salon" value={`₹${calc.remaining.toFixed(2)}`} />
              </div>
            </div>

            <button onClick={handleCreateBooking} disabled={submitting}
              className="btn-gold" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? <Loader size={15} className="animate-spin" /> : <CreditCard size={15} />}
              {submitting ? "Processing..." : `Pay ₹${calc.chargeNow.toFixed(2)} Now`}
            </button>
          </div>
        )}

        {/* ── STEP 5: MANUAL UPI UPLOAD ─────────────────────────────────── */}
        {step === 5 && bookingRecord && (
          <div>
            <h3 className="font-playfair text-cream" style={{ fontSize: 20, marginBottom: 8 }}>Upload Payment Screenshot</h3>
            <p className="font-lora text-muted" style={{ fontSize: 12, marginBottom: 18, lineHeight: 1.6 }}>
              Pay <strong style={{ color: "#C9A84C" }}>₹{calc.advance.toFixed(2)}</strong> to UPI ID:{" "}
              <strong style={{ color: "#C9A84C" }}>{process.env.NEXT_PUBLIC_UPI_ID || "smartsalon@upi"}</strong>, then upload the screenshot.
            </p>
            <div className="glass-card" style={{ padding: 16, marginBottom: 12, fontFamily: "'Cinzel',serif", fontSize: 11, color: "#F5F0E8" }}>
              <div>Booking Ref: <span style={{ color: "#C9A84C" }}>{bookingRecord.booking_ref}</span></div>
              <div style={{ marginTop: 4 }}>Amount: <span style={{ color: "#C9A84C" }}>₹{calc.advance.toFixed(2)}</span></div>
            </div>
            <label style={{
              display: "flex", alignItems: "center", gap: 12, border: "1px dashed rgba(201,168,76,0.3)",
              padding: 16, borderRadius: 4, cursor: "pointer", marginBottom: 14,
            }}>
              <Upload size={18} className="text-gold" />
              <span className="font-lora text-muted" style={{ fontSize: 12 }}>
                {upiFile ? upiFile.name : "Click to upload payment screenshot"}
              </span>
              <input type="file" style={{ display: "none" }} accept=".jpg,.jpeg,.png,.pdf"
                onChange={e => setUpiFile(e.target.files[0])} />
            </label>
            <button onClick={handleUpiUpload} disabled={submitting || !upiFile}
              className="btn-gold" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? <Loader size={15} className="animate-spin" /> : null}
              {submitting ? "Uploading..." : "Submit for Verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, gold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span className="font-cinzel text-muted" style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
      <span className="font-lora" style={{ fontSize: 13, color: gold ? "#C9A84C" : "#F5F0E8", fontWeight: gold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", paddingTop: 70, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader size={28} className="text-gold animate-spin" /></div>}>
      <BookingForm />
    </Suspense>
  );
}
