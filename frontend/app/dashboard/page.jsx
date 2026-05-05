"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usersAPI, bookingsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { CalendarDays, BookOpen, User, LogOut, Loader, XCircle, Clock, IndianRupee, ChevronRight } from "lucide-react";
import Link from "next/link";

const TABS = [
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "courses",  label: "Courses",  icon: BookOpen },
  { id: "profile",  label: "Profile",  icon: User },
];

const STATUS_COLOR = {
  confirmed: { bg: "rgba(76,175,80,0.12)", color: "#4CAF50", border: "rgba(76,175,80,0.3)" },
  pending:   { bg: "rgba(201,168,76,0.10)", color: "#C9A84C", border: "rgba(201,168,76,0.3)" },
  completed: { bg: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "rgba(201,168,76,0.4)" },
  cancelled: { bg: "rgba(239,68,68,0.10)",  color: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

const formatTime = (t) => {
  try {
    const [h, m] = t.slice(0,5).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
  } catch { return t; }
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("ss_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    setProfileForm({ name: parsed.name || "", phone: parsed.phone || "" });
    Promise.all([usersAPI.myBookings(), usersAPI.myCourses()])
      .then(([b, c]) => { setBookings(b.data||[]); setCourses(c.data||[]); })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [router]);

  const cancelBooking = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await bookingsAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
      toast.success("Booking cancelled");
    } catch (e) { toast.error(e.response?.data?.error || "Failed to cancel"); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await usersAPI.updateProfile(profileForm);
      const updated = { ...user, ...data };
      localStorage.setItem("ss_user", JSON.stringify(updated));
      setUser(updated);
      toast.success("Profile updated");
    } catch { toast.error("Update failed"); }
    finally { setSavingProfile(false); }
  };

  const logout = () => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight:"100vh", paddingTop:70, background:"#0d0d0d" }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(180deg,#0a2a21 0%,#0d0d0d 100%)", padding:"28px 20px 20px", borderBottom:"1px solid rgba(201,168,76,.1)" }}>
        <div style={{ maxWidth:680, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div>
            <p style={{ fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"3px", color:"rgba(201,168,76,.5)", textTransform:"uppercase", margin:"0 0 6px" }}>
              ── My Account
            </p>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(20px,5vw,28px)", color:"#F5F0E8", margin:"0 0 4px", fontWeight:700 }}>
              Welcome, <em style={{ color:"#C9A84C", fontStyle:"italic" }}>{user.name?.split(" ")[0]}</em>
            </h1>
            <p style={{ fontFamily:"'Lora',serif", fontSize:12, color:"rgba(155,139,122,.7)", margin:0 }}>{user.email}</p>
          </div>
          <button onClick={logout} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:4, padding:"8px 12px", color:"rgba(239,68,68,.7)", fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1px", cursor:"pointer", flexShrink:0 }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────── */}
      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 20px" }}>
        <div style={{ display:"flex", borderBottom:"1px solid rgba(201,168,76,.1)", marginBottom:24, marginTop:4 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              padding:"14px 4px", fontFamily:"'Cinzel',serif", fontSize:"clamp(8px,2.5vw,10px)",
              letterSpacing:"1.5px", textTransform:"uppercase", cursor:"pointer", border:"none",
              borderBottom: tab === id ? "2px solid #C9A84C" : "2px solid transparent",
              color: tab === id ? "#C9A84C" : "rgba(155,139,122,.6)",
              background:"transparent", transition:"all .2s", marginBottom:-1
            }}>
              <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
            <Loader size={28} color="#C9A84C" className="animate-spin" />
          </div>
        ) : (
          <>
            {/* ── BOOKINGS ─────────────────────────────────────── */}
            {tab === "bookings" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(16px,4vw,20px)", color:"#F5F0E8", margin:0 }}>Your Appointments</h2>
                  <Link href="/booking" style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1.5px", background:"#C9A84C", color:"#0a2a21", padding:"8px 14px", textDecoration:"none", borderRadius:2, fontWeight:700, whiteSpace:"nowrap" }}>
                    + Book New
                  </Link>
                </div>

                {bookings.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"48px 20px", border:"1px solid rgba(201,168,76,.1)", borderRadius:4, background:"rgba(201,168,76,.02)" }}>
                    <CalendarDays size={36} color="rgba(155,139,122,.4)" style={{ margin:"0 auto 12px" }} />
                    <p style={{ fontFamily:"'Lora',serif", color:"rgba(155,139,122,.6)", marginBottom:16 }}>No appointments yet</p>
                    <Link href="/booking" style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1.5px", background:"#C9A84C", color:"#0a2a21", padding:"10px 24px", textDecoration:"none", borderRadius:2, fontWeight:700 }}>Book Now</Link>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {bookings.map(b => {
                      const st = STATUS_COLOR[b.status] || STATUS_COLOR.pending;
                      return (
                        <div key={b.id} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(201,168,76,.1)", borderRadius:6, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
                          {/* Top row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(14px,3.5vw,16px)", color:"#F5F0E8", fontWeight:600, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {b.service_name || "Service"}
                              </div>
                              <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"1.5px", color:"rgba(201,168,76,.5)", textTransform:"uppercase" }}>
                                {b.booking_ref}
                              </div>
                            </div>
                            <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1px", padding:"4px 10px", borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}`, whiteSpace:"nowrap", flexShrink:0, textTransform:"uppercase" }}>
                              {b.status}
                            </span>
                          </div>

                          {/* Details row */}
                          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5, fontFamily:"'Lora',serif", fontSize:12, color:"rgba(245,240,232,.6)" }}>
                              <CalendarDays size={12} color="#C9A84C" />
                              {format(new Date(b.booking_date), "d MMM yyyy")}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:5, fontFamily:"'Lora',serif", fontSize:12, color:"rgba(245,240,232,.6)" }}>
                              <Clock size={12} color="#C9A84C" />
                              {formatTime(b.booking_time || "00:00")}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Playfair Display',serif", fontSize:14, color:"#C9A84C", fontWeight:700, marginLeft:"auto" }}>
                              <IndianRupee size={12} />{b.amount}
                            </div>
                          </div>

                          {/* Cancel button */}
                          {["pending","confirmed"].includes(b.status) && (
                            <button onClick={() => cancelBooking(b.id)} style={{ alignSelf:"flex-end", display:"flex", alignItems:"center", gap:4, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:4, padding:"6px 12px", color:"rgba(239,68,68,.7)", fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"1px", cursor:"pointer", textTransform:"uppercase" }}>
                              <XCircle size={11} /> Cancel
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── COURSES ──────────────────────────────────────── */}
            {tab === "courses" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(16px,4vw,20px)", color:"#F5F0E8", margin:0 }}>Enrolled Courses</h2>
                  <Link href="/courses" style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1.5px", border:"1px solid rgba(201,168,76,.4)", color:"#C9A84C", padding:"8px 14px", textDecoration:"none", borderRadius:2, whiteSpace:"nowrap" }}>
                    Browse
                  </Link>
                </div>

                {courses.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"48px 20px", border:"1px solid rgba(201,168,76,.1)", borderRadius:4, background:"rgba(201,168,76,.02)" }}>
                    <BookOpen size={36} color="rgba(155,139,122,.4)" style={{ margin:"0 auto 12px" }} />
                    <p style={{ fontFamily:"'Lora',serif", color:"rgba(155,139,122,.6)", marginBottom:16 }}>No courses enrolled yet</p>
                    <Link href="/courses" style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1.5px", background:"#C9A84C", color:"#0a2a21", padding:"10px 24px", textDecoration:"none", borderRadius:2, fontWeight:700 }}>Explore Courses</Link>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {courses.map(c => (
                      <div key={c.id} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(201,168,76,.1)", borderRadius:6, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:44, height:44, borderRadius:4, background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <BookOpen size={18} color="#C9A84C" />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(13px,3.5vw,15px)", color:"#F5F0E8", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                          <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"1.5px", color:"rgba(155,139,122,.5)", marginTop:3, textTransform:"uppercase" }}>
                            {c.lesson_count ? `${c.lesson_count} Lessons` : ""}{c.duration_hrs ? ` · ${c.duration_hrs}h` : ""}
                          </div>
                        </div>
                        <Link href={`/courses`} style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"1px", background:"#C9A84C", color:"#0a2a21", padding:"8px 12px", textDecoration:"none", borderRadius:2, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                          View <ChevronRight size={11} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PROFILE ──────────────────────────────────────── */}
            {tab === "profile" && (
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(16px,4vw,20px)", color:"#F5F0E8", margin:"0 0 20px" }}>Edit Profile</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {[
                    { label:"Full Name", key:"name", type:"text", disabled:false },
                    { label:"Phone",     key:"phone", type:"tel", disabled:false },
                  ].map(({ label, key, type, disabled }) => (
                    <div key={key}>
                      <label style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"2px", color:"rgba(155,139,122,.6)", display:"block", marginBottom:6, textTransform:"uppercase" }}>{label}</label>
                      <input className="salon-input" type={type} disabled={disabled}
                        style={{ width:"100%", boxSizing:"border-box", opacity: disabled ? .5 : 1 }}
                        value={profileForm[key]} onChange={e => setProfileForm(p => ({...p, [key]: e.target.value}))} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"2px", color:"rgba(155,139,122,.6)", display:"block", marginBottom:6, textTransform:"uppercase" }}>Email</label>
                    <input className="salon-input" type="email" disabled value={user.email} style={{ width:"100%", boxSizing:"border-box", opacity:.5 }} />
                  </div>
                  <button onClick={saveProfile} disabled={savingProfile} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#C9A84C", color:"#0a2a21", border:"none", padding:"14px 24px", fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"2px", fontWeight:700, borderRadius:2, cursor:"pointer", textTransform:"uppercase", opacity: savingProfile ? .7 : 1 }}>
                    {savingProfile ? <Loader size={14} className="animate-spin" /> : null}
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {/* Account info card */}
                <div style={{ marginTop:24, padding:"16px", border:"1px solid rgba(201,168,76,.1)", borderRadius:6, background:"rgba(201,168,76,.03)" }}>
                  <p style={{ fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"2px", color:"rgba(201,168,76,.5)", textTransform:"uppercase", margin:"0 0 8px" }}>Account Info</p>
                  <p style={{ fontFamily:"'Lora',serif", fontSize:12, color:"rgba(155,139,122,.6)", margin:"0 0 4px" }}>Role: <span style={{ color:"#C9A84C" }}>{user.role || "Customer"}</span></p>
                  <p style={{ fontFamily:"'Lora',serif", fontSize:12, color:"rgba(155,139,122,.6)", margin:0 }}>Member since: <span style={{ color:"rgba(245,240,232,.5)" }}>{user.created_at ? format(new Date(user.created_at), "MMM yyyy") : "—"}</span></p>
                </div>

                <button onClick={logout} style={{ width:"100%", marginTop:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:4, padding:"14px", color:"rgba(239,68,68,.7)", fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"1.5px", cursor:"pointer", textTransform:"uppercase" }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ height:40 }} />
      </div>
    </div>
  );
}
