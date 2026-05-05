"use client";
/**
 * FILE: frontend/app/admin/page.jsx
 *
 * CRITICAL FIX — Typing loses focus after every character:
 * FI, FTA, ImgUpload, FormPanel, AddBtn, EditBtn, DelBtn were defined
 * INSIDE AdminPage(). React creates a brand-new component reference on
 * every render, so it unmounts+remounts the <input> on every keystroke,
 * destroying focus. Fix: define all shared UI components OUTSIDE AdminPage.
 */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  adminAPI, bookingsAPI, servicesAPI, subServicesAPI, paymentsAPI,
  contactsAPI, careersAPI, coursesAPI, offersAPI, settingsAPI,
  videosAPI, uploadAPI, categoriesAPI,
} from "@/lib/api";
import HeroMediaSection from "@/components/admin/HeroMediaSection";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  LayoutDashboard, CalendarDays, Scissors, CreditCard,
  MessageSquare, Users, Briefcase, LogOut, TrendingUp,
  Loader, CheckCircle, XCircle, Edit, Trash2, Plus,
  Gift, Settings, BookOpen, Tag, Video, Layers, Upload,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { id:"overview",     label:"Overview",     icon:LayoutDashboard },
  { id:"bookings",     label:"Bookings",     icon:CalendarDays    },
  { id:"categories",   label:"Categories",   icon:Layers          },
  { id:"services",     label:"Services",     icon:Scissors        },
  { id:"sub_services", label:"Sub-Services", icon:Tag             },
  { id:"payments",     label:"Payments",     icon:CreditCard      },
  { id:"courses",      label:"Courses",      icon:BookOpen        },
  { id:"offers",       label:"Offers",       icon:Gift            },
  { id:"videos",       label:"Videos",       icon:Video           },
  { id:"contacts",     label:"Messages",     icon:MessageSquare   },
  { id:"applications", label:"Careers",      icon:Briefcase       },
  { id:"users",        label:"Users",        icon:Users           },
  { id:"settings",     label:"Settings",     icon:Settings        },
];

const SC = {
  confirmed:"#2E7D32", pending:"#9B8B7A", completed:"#C9A84C",
  cancelled:"#C62828", success:"#2E7D32", failed:"#C62828",
  new:"#C9A84C", reviewed:"#9B8B7A", shortlisted:"#2E7D32", rejected:"#C62828",
};

const EMPTY = {
  svc: { name:"", description:"", price:"", price_min:"", price_max:"", duration:"", slot_duration:"30", icon:"✂️", category:"", category_id:"", image_url:"", sort_order:0 },
  sub: { service_id:"", name:"", price:"", duration:"", discount_price:"", description:"", image_url:"", sort_order:0 },
  cat: { name:"", description:"", image_url:"", sort_order:0 },
  crs: { title:"", description:"", price:"", offer_price:"", duration_hrs:"", lesson_count:"", tag:"", video_url:"", thumbnail:"" },
  off: { title:"", description:"", discount:"", image_url:"", expiry_date:"" },
  job: { title:"", type:"Full-time", experience:"", salary:"", description:"" },
  vid: { title:"", url:"", thumbnail_url:"", platform:"instagram", sort_order:0 },
  set: { salon_name:"", upi_id:"", whatsapp_number:"", footer_tagline:"", footer_address:"", footer_phone:"", footer_email:"", instagram_url:"", owner_image_url:"" },
};

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS — defined OUTSIDE AdminPage so they are stable
// references and React never unmounts/remounts the input on re-render.
// Props carry the data and callbacks they need.
// ══════════════════════════════════════════════════════════════════════════════

function FI({ label, value, onChange, type="text", ph="", required=false }) {
  return (
    <div>
      <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        className="salon-input text-sm"
        placeholder={ph}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function FTA({ label, value, onChange, ph="" }) {
  return (
    <div>
      <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">{label}</label>
      <textarea
        rows={2}
        className="salon-input text-sm"
        placeholder={ph}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function ImgUpload({ value, onChange, onUpload, uploading, previewType = "square" }) {
  // previewType: "square" | "wide" | "portrait" | "banner"
  const previewConfigs = {
    square:   { label: "Square (1:1)",    paddingTop: "100%",    hint: "Categories, Services" },
    wide:     { label: "Landscape (16:9)","paddingTop": "56.25%", hint: "Hero, Banners" },
    portrait: { label: "Portrait (3:4)",  paddingTop: "133.33%", hint: "Offers, Reels" },
    banner:   { label: "Wide Banner (3:1)","paddingTop": "33.33%",hint: "Header images" },
  };
  const cfg = previewConfigs[previewType] || previewConfigs.square;

  return (
    <div>
      <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Image</label>
      <div className="flex gap-2">
        <input
          className="salon-input text-sm flex-1"
          placeholder="https://... or upload →"
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
        />
        <label className="btn-outline !py-2 !px-3 cursor-pointer shrink-0 flex items-center gap-1">
          {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
          <input type="file" className="hidden" accept="image/*" onChange={async e => {
            if (e.target.files[0]) onUpload(e.target.files[0]);
          }} />
        </label>
      </div>
      {value && (
        <div className="mt-2">
          {/* Preview frame showing how image appears on website */}
          <div className="relative w-full overflow-hidden rounded border border-gold/20" style={{ paddingTop: cfg.paddingTop }}>
            <img
              src={value}
              alt="Preview"
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}
              onError={e => { e.currentTarget.parentElement.style.display = "none"; }}
            />
            {/* Grid overlay to show crop area */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              backgroundImage:"linear-gradient(rgba(201,168,76,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.08) 1px,transparent 1px)",
              backgroundSize:"33.33% 33.33%",
              border:"2px dashed rgba(201,168,76,0.3)"
            }} />
            <div style={{ position:"absolute", bottom:4, right:6, fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"1px", color:"rgba(201,168,76,0.7)", textTransform:"uppercase", textShadow:"0 1px 3px rgba(0,0,0,0.8)" }}>
              {cfg.label} · {cfg.hint}
            </div>
          </div>
          <p className="font-cinzel text-[8px] tracking-[1px] text-cream/30 mt-1 uppercase">
            ↑ This is how your image will appear on the website. Image is cropped to fill the frame.
          </p>
        </div>
      )}
    </div>
  );
}

function FormPanel({ title, onSave, onCancel, children }) {
  return (
    <div className="glass-card p-5 rounded-sm mb-5">
      <div className="font-playfair text-base text-cream mb-4">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">{children}</div>
      <div className="flex gap-2">
        <button onClick={onSave}   className="btn-gold !py-2 !px-5 !text-[10px]">Save</button>
        <button onClick={onCancel} className="btn-outline !py-2 !px-4 !text-[10px]">Cancel</button>
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }) {
  return (
    <button onClick={onClick} className="btn-gold !py-2 !px-4 !text-[10px] flex items-center gap-1.5">
      <Plus size={12} /> {label}
    </button>
  );
}
function EditBtn({ onClick }) {
  return (
    <button onClick={onClick} className="btn-outline !py-1.5 !px-3 !text-[9px] flex items-center gap-1">
      <Edit size={10}/> Edit
    </button>
  );
}
function DelBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ border:"1px solid #C62828", color:"#C62828", background:"none", padding:"6px 12px", fontSize:9, fontFamily:"'Cinzel',serif", cursor:"pointer", borderRadius:2, display:"flex", alignItems:"center", gap:4 }}>
      <Trash2 size={10}/> Del
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter();
  const [user,        setUser]        = useState(null);
  const [tab,         setTab]         = useState("overview");
  const [loading,     setLoading]     = useState(true);

  const [stats,        setStats]        = useState(null);
  const [bookings,     setBookings]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [services,     setServices]     = useState([]);
  const [subSvcs,      setSubSvcs]      = useState([]);
  const [payments,     setPayments]     = useState([]);
  const [pendingUpi,   setPendingUpi]   = useState([]);
  const [contacts,     setContacts]     = useState([]);
  const [applications, setApps]         = useState([]);
  const [users,        setUsers]        = useState([]);
  const [courses,      setCourses]      = useState([]);
  const [offers,       setOffers]       = useState([]);
  const [jobs,         setJobs]         = useState([]);
  const [videos,       setVideos]       = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [heroMedia,    setHeroMedia]    = useState({ url:"", type:"image" });

  const [forms,     setForms]     = useState(EMPTY);
  const [editingId, setEditingId] = useState({});
  const [showForm,  setShowForm]  = useState({});
  const [uploading, setUploading] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [showWalkin,   setShowWalkin]   = useState(false);
  const [walkinForm,   setWalkinForm]   = useState({ customer_name:"", customer_phone:"", service_id:"", sub_service_id:"", booking_date:"", booking_time:"", notes:"" });
  const [walkinSubs,   setWalkinSubs]   = useState([]);
  const [walkinSlots,  setWalkinSlots]  = useState([]);
  const [walkinSaving, setWalkinSaving] = useState(false);
  const [logoFile,  setLogoFile]  = useState(null);

  // Stable form field setter
  const setF = useCallback((key, val) => setForms(p => ({ ...p, [key]: val })), []);

  // Update a single field inside a form key
  const setField = useCallback((key, subKey, val) => {
    setForms(p => ({ ...p, [key]: { ...p[key], [subKey]: val } }));
  }, []);

  const toggleForm = (key, id=null, initial=null) => {
    setShowForm(p => ({ ...p, [key]: !p[key] }));
    setEditingId(p => ({ ...p, [key]: id }));
    if (initial) setForms(p => ({ ...p, [key]: initial }));
    else setForms(p => ({ ...p, [key]: EMPTY[key] }));
  };

  useEffect(() => {
    const u = localStorage.getItem("ss_user");
    if (!u) { router.push("/login"); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== "admin") { toast.error("Admin access required"); router.push("/"); return; }
    setUser(parsed);
  }, [router]);

  const load = useCallback(async (t) => {
    setLoading(true);
    try {
      switch (t) {
        case "overview": { const {data} = await adminAPI.dashboard(); setStats(data); break; }
        case "bookings": { const {data} = await bookingsAPI.list(); setBookings(data||[]); break; }
        case "categories": { const {data} = await categoriesAPI.list(); setCategories(data||[]); break; }
        case "services": {
          const [{data:sv},{data:cats}] = await Promise.all([servicesAPI.list(), categoriesAPI.list()]);
          setServices(sv); setCategories(cats); break;
        }
        case "sub_services": {
          const [{data:sub},{data:sv}] = await Promise.all([subServicesAPI.all(), servicesAPI.list()]);
          setSubSvcs(sub); setServices(sv); break;
        }
        case "payments": {
          const [allP,pendP] = await Promise.all([paymentsAPI.list(), paymentsAPI.pendingUpi()]);
          setPayments(allP.data||[]); setPendingUpi(pendP.data||[]); break;
        }
        case "courses":  { const {data} = await coursesAPI.list();          setCourses(data||[]);  break; }
        case "offers":   { const {data} = await offersAPI.all();             setOffers(data||[]);   break; }
        case "videos":   { const {data} = await videosAPI.list();            setVideos(data||[]);   break; }
        case "contacts": { const {data} = await contactsAPI.list();          setContacts(data||[]); break; }
        case "applications": {
          const [{data:ap},{data:jb}] = await Promise.all([careersAPI.applications(), careersAPI.jobs()]);
          setApps(ap); setJobs(jb); break;
        }
        case "users": { const {data} = await adminAPI.users(); setUsers(data||[]); break; }
        case "settings": {
          const {data} = await settingsAPI.get();
          setSiteSettings(data);
          setHeroMedia({ url: data.hero_media_url||"", type: data.hero_media_type||"image" });
          setForms(p => ({ ...p, set: {
            salon_name:      data.salon_name      || "",
            upi_id:          data.upi_id          || "",
            whatsapp_number: data.whatsapp_number || "",
            footer_tagline:  data.footer_tagline  || "",
            footer_address:  data.footer_address  || "",
            footer_phone:    data.footer_phone    || "",
            footer_email:    data.footer_email    || "",
            instagram_url:   data.instagram_url   || "",
          }}));
          break;
        }
      }
    } catch (e) { toast.error("Failed to load: " + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(tab); }, [tab, user, load]);

  // Image upload helper
  const uploadImage = async (file, folder="lonaz-luxe/general") => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const {data} = await uploadAPI.image(fd, folder);
      return data.url;
    } catch (e) {
      toast.error("Upload failed: " + (e.response?.data?.error || e.message));
      return null;
    } finally { setUploading(false); }
  };

  const crudSave = async (key, createFn, updateFn, reloadTab) => {
    try {
      if (editingId[key]) await updateFn(editingId[key], forms[key]);
      else await createFn(forms[key]);
      toast.success(editingId[key] ? "Updated" : "Created");
      toggleForm(key);
      load(reloadTab || key);
    } catch (e) { toast.error(e.response?.data?.error || "Failed"); }
  };

  const updateBookingStatus = async (id, status) => {
    try { await bookingsAPI.updateStatus(id, status); setBookings(p => p.map(b => b.id===id ? {...b,status} : b)); }
    catch { toast.error("Failed"); }
  };
  const handleUpiVerify = async (id, approved) => {
    try { await paymentsAPI.verifyManual(id, {approved}); setPendingUpi(p => p.filter(x => x.id!==id)); toast.success(approved?"Approved":"Rejected"); }
    catch { toast.error("Failed"); }
  };
  const markRead = async (id) => {
    try { await contactsAPI.markRead(id); setContacts(p => p.map(c => c.id===id ? {...c,is_read:true} : c)); }
    catch {}
  };
  const saveSettings = async () => {
    setSavingSet(true);
    try {
      await settingsAPI.update(forms.set);
      if (logoFile) { const fd = new FormData(); fd.append("logo", logoFile); await settingsAPI.uploadLogo(fd); }
      toast.success("Settings saved"); load("settings");
    } catch { toast.error("Failed"); }
    finally { setSavingSet(false); }
  };
  const logout = () => { localStorage.removeItem("ss_token"); localStorage.removeItem("ss_user"); router.push("/"); };

  if (!user) return null;

  // ── Helpers to keep JSX concise ──────────────────────────────────────────
  const fi  = (label, key, subKey, opts={}) => (
    <FI key={subKey} label={label} value={forms[key][subKey]} onChange={v => setField(key, subKey, v)} {...opts} />
  );
  const fta = (label, key, subKey, ph="") => (
    <FTA key={subKey} label={label} value={forms[key][subKey]} onChange={v => setField(key, subKey, v)} ph={ph} />
  );
  const imgUpload = (key, subKey, folder, previewType="square") => (
    <ImgUpload
      key={subKey}
      value={forms[key][subKey]}
      onChange={v => setField(key, subKey, v)}
      onUpload={async file => { const url = await uploadImage(file, folder); if (url) setField(key, subKey, url); }}
      uploading={uploading}
      previewType={previewType}
    />
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", paddingTop:70, background:"#061a12" }}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{ width:168, background:"rgba(10,42,33,.95)", borderRight:"1px solid rgba(201,168,76,.1)", position:"fixed", top:70, bottom:0, overflowY:"auto", zIndex:40, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 12px", borderBottom:"1px solid rgba(201,168,76,.08)" }}>
          <div className="font-cinzel text-[8px] tracking-[3px] text-gold/40 mb-1">ADMIN PANEL</div>
          <div className="font-playfair text-sm text-cream">{user?.name}</div>
        </div>
        <nav style={{ flex:1, padding:8, overflowY:"auto" }}>
          {TABS.map(({ id, label, icon:Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:7, padding:"8px 10px",
              borderRadius:4, marginBottom:2, cursor:"pointer", fontFamily:"'Cinzel',serif",
              fontSize:9, letterSpacing:1, textTransform:"uppercase", textAlign:"left", border:"none",
              borderLeft:`2px solid ${tab===id?"#C9A84C":"transparent"}`,
              background: tab===id ? "rgba(201,168,76,.08)" : "transparent",
              color: tab===id ? "#C9A84C" : "#9B8B7A",
            }}>
              <Icon size={12}/> {label}
            </button>
          ))}
        </nav>
        <div style={{ padding:10, borderTop:"1px solid rgba(201,168,76,.08)" }}>
          <button onClick={logout} style={{ display:"flex", alignItems:"center", gap:7, color:"#9B8B7A", fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:2, cursor:"pointer", background:"none", border:"none", width:"100%" }}>
            <LogOut size={12}/> LOGOUT
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main style={{ marginLeft:168, flex:1, padding:"24px 24px", overflowX:"auto", minWidth:0 }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}>
            <Loader size={26} className="text-gold animate-spin"/>
          </div>
        ) : (
          <>

          {/* ─── OVERVIEW ─────────────────────────────── */}
          {tab==="overview" && stats && (
            <div>
              <h2 className="font-playfair text-xl text-cream mb-6">Dashboard Overview</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
                {[
                  ["Total Bookings",   stats.stats.total_bookings,   CalendarDays],
                  ["Today's Bookings", stats.stats.today_bookings,   CalendarDays],
                  [`₹${Number(stats.stats.total_revenue||0).toLocaleString("en-IN")}`, null, TrendingUp, "Total Revenue"],
                  ["Pending Payments", stats.stats.pending_payments, CreditCard],
                  ["Unread Messages",  stats.stats.unread_contacts,  MessageSquare],
                  ["New Applications", stats.stats.new_applications, Briefcase],
                ].map(([val,_,Icon,lbl],i) => (
                  <div key={i} className="glass-card p-5 rounded-sm">
                    <Icon size={18} className="text-gold mb-2"/>
                    <div className="font-playfair text-xl text-cream font-bold">{val}</div>
                    <div className="font-cinzel text-[9px] tracking-[2px] text-gold/40 uppercase mt-1">{lbl||val}</div>
                  </div>
                ))}
              </div>
              {stats.top_services?.length>0 && (
                <div className="glass-card p-5 rounded-sm mb-5">
                  <div className="font-playfair text-base text-cream mb-4">Top Services</div>
                  {stats.top_services.map(s => (
                    <div key={s.name} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(201,168,76,.06)" }}>
                      <span className="font-lora text-sm text-cream">{s.name}</span>
                      <div style={{ display:"flex", gap:16 }}>
                        <span className="font-cinzel text-[10px] text-gold/50">{s.bookings} bookings</span>
                        <span className="font-cinzel text-[10px] text-gold">₹{Number(s.revenue||0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── BOOKINGS ─────────────────────────────── */}
          {tab==="bookings" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">All Bookings</h2>
                <button onClick={()=>setShowWalkin(w=>!w)}
                  style={{display:"flex",alignItems:"center",gap:6,background:"#C9A84C",color:"#0a2a21",border:"none",padding:"8px 16px",borderRadius:4,fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,fontWeight:"bold",cursor:"pointer"}}>
                  <Plus size={13}/> WALK-IN BOOKING
                </button>
              </div>

              {showWalkin && (
                <div className="glass-card rounded-sm p-6 mb-6" style={{border:"1px solid rgba(201,168,76,.3)"}}>
                  <h3 className="font-cinzel text-[11px] tracking-[3px] text-gold mb-5">NEW WALK-IN BOOKING (Cash / No Account Needed)</h3>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                    <div>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">CUSTOMER NAME *</label>
                      <input className="salon-input" placeholder="e.g. Priya / Child / Walk-in"
                        value={walkinForm.customer_name}
                        onChange={e=>setWalkinForm(p=>({...p,customer_name:e.target.value}))} />
                    </div>
                    <div>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">PHONE (optional)</label>
                      <input className="salon-input" placeholder="+91 XXXXX XXXXX" type="tel"
                        value={walkinForm.customer_phone}
                        onChange={e=>setWalkinForm(p=>({...p,customer_phone:e.target.value}))} />
                    </div>
                    <div>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">SERVICE *</label>
                      <select className="salon-input" value={walkinForm.service_id}
                        onChange={e=>{
                          const sid=e.target.value;
                          setWalkinForm(p=>({...p,service_id:sid,sub_service_id:"",booking_date:"",booking_time:""}));
                          setWalkinSubs([]); setWalkinSlots([]);
                          if(sid) subServicesAPI.byService(sid).then(r=>setWalkinSubs(r.data||[])).catch(()=>{});
                        }}>
                        <option value="">Select service</option>
                        {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {walkinSubs.length>0 && (
                      <div>
                        <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">SUB-SERVICE</label>
                        <select className="salon-input" value={walkinForm.sub_service_id}
                          onChange={e=>setWalkinForm(p=>({...p,sub_service_id:e.target.value}))}>
                          <option value="">Any / Base price</option>
                          {walkinSubs.map(s=><option key={s.id} value={s.id}>{s.name} — ₹{s.price}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">DATE *</label>
                      <input className="salon-input" type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={walkinForm.booking_date}
                        onChange={e=>{
                          const d=e.target.value;
                          setWalkinForm(p=>({...p,booking_date:d,booking_time:""}));
                          setWalkinSlots([]);
                          if(d && walkinForm.service_id)
                            bookingsAPI.availability(d,walkinForm.service_id)
                              .then(r=>setWalkinSlots(r.data?.available||[]))
                              .catch(()=>{});
                        }} />
                    </div>
                    <div>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">TIME SLOT *</label>
                      {walkinSlots.length>0 ? (
                        <select className="salon-input" value={walkinForm.booking_time}
                          onChange={e=>setWalkinForm(p=>({...p,booking_time:e.target.value}))}>
                          <option value="">Pick available slot</option>
                          {walkinSlots.map(t=>{const [h,m]=t.split(":").map(Number);return <option key={t} value={t}>{`${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`}</option>;})}
                        </select>
                      ) : (
                        <input className="salon-input" type="time"
                          value={walkinForm.booking_time}
                          onChange={e=>setWalkinForm(p=>({...p,booking_time:e.target.value}))} />
                      )}
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-muted mb-1 block">NOTES</label>
                      <input className="salon-input" placeholder="e.g. Cash received ₹500, special request..."
                        value={walkinForm.notes}
                        onChange={e=>setWalkinForm(p=>({...p,notes:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:16,alignItems:"center",flexWrap:"wrap"}}>
                    <button disabled={walkinSaving} onClick={async()=>{
                        if(!walkinForm.customer_name.trim()) return toast.error("Customer name required");
                        if(!walkinForm.service_id) return toast.error("Select a service");
                        if(!walkinForm.booking_date) return toast.error("Select a date");
                        if(!walkinForm.booking_time) return toast.error("Select a time slot");
                        setWalkinSaving(true);
                        try {
                          await bookingsAPI.walkin(walkinForm);
                          toast.success("Walk-in booking confirmed!");
                          setShowWalkin(false);
                          setWalkinForm({customer_name:"",customer_phone:"",service_id:"",sub_service_id:"",booking_date:"",booking_time:"",notes:""});
                          setWalkinSubs([]); setWalkinSlots([]);
                          const {data}=await bookingsAPI.list(); setBookings(data||[]);
                        } catch(e){ toast.error(e.response?.data?.error||"Failed to create booking"); }
                        finally { setWalkinSaving(false); }
                      }}
                      style={{display:"flex",alignItems:"center",gap:6,background:"#C9A84C",color:"#0a2a21",border:"none",padding:"10px 24px",borderRadius:4,fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,fontWeight:"bold",cursor:walkinSaving?"not-allowed":"pointer"}}>
                      {walkinSaving?<Loader size={12} className="animate-spin"/>:<CheckCircle size={12}/>}
                      {walkinSaving?"BOOKING...":"CONFIRM WALK-IN"}
                    </button>
                    <button onClick={()=>setShowWalkin(false)}
                      style={{background:"transparent",color:"#9B8B7A",border:"1px solid rgba(155,139,122,.3)",padding:"10px 20px",borderRadius:4,fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,cursor:"pointer"}}>
                      CANCEL
                    </button>
                    <span style={{fontSize:11,color:"#9B8B7A"}}>💵 Auto-confirmed · Cash payment · No account needed</span>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-sm overflow-x-auto">
                <table className="salon-table">
                  <thead><tr>{["Ref","Customer","Service","Date","Time","Total","Advance","Status","Action",""].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td className="font-cinzel text-[10px] text-gold">{b.booking_ref}</td>
                        <td><div className="text-cream text-sm">{b.customer_name}</div><div className="text-gold/40 text-xs">{b.customer_email}</div></td>
                        <td className="text-sm">{b.service_name}</td>
                        <td className="text-gold/50 text-xs">{b.booking_date ? format(new Date(b.booking_date),"MMM d") : "—"}</td>
                        <td className="text-gold/50 text-xs">{b.booking_time ? (() => { try { const [h,m]=b.booking_time.slice(0,5).split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; } catch { return b.booking_time; } })() : "—"}</td>
                        <td className="text-gold font-bold text-sm">₹{b.total_amount||b.amount}</td>
                        <td className="text-cream/60 text-xs">₹{b.paid_amount||"—"}</td>
                        <td><span className="badge text-[8px]" style={{background:SC[b.status]||"#9B8B7A",color:"#fff"}}>{b.status}</span></td>
                        <td>
                          <select value={b.status} onChange={e=>updateBookingStatus(b.id,e.target.value)}
                            style={{background:"#061a12",border:"1px solid rgba(201,168,76,.2)",color:"#9B8B7A",fontSize:10,padding:"4px 6px",borderRadius:4,fontFamily:"'Cinzel',serif",cursor:"pointer"}}>
                            {["pending","confirmed","completed","cancelled"].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <DelBtn onClick={() => {
                            if (!window.confirm(`Delete booking ${b.booking_ref}? This cannot be undone.`)) return;
                            bookingsAPI.delete(b.id)
                              .then(() => { setBookings(p => p.filter(x => x.id !== b.id)); toast.success("Booking deleted"); })
                              .catch(e => toast.error(e.response?.data?.error || "Failed to delete booking"));
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── CATEGORIES ───────────────────────────── */}
          {tab==="categories" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Categories</h2>
                <AddBtn label="Add Category" onClick={()=>toggleForm("cat")} />
              </div>
              {showForm.cat && (
                <FormPanel title={editingId.cat?"Edit Category":"New Category"}
                  onSave={()=>crudSave("cat",categoriesAPI.create,(id,d)=>categoriesAPI.update(id,d),"categories")}
                  onCancel={()=>toggleForm("cat")}>
                  {fi("Name","cat","name",{required:true,ph:"e.g. Women"})}
                  {fi("Sort Order","cat","sort_order",{type:"number"})}
                  <div className="sm:col-span-2">{fta("Description","cat","description","Short description")}</div>
                  <div className="sm:col-span-2">{imgUpload("cat","image_url","lonaz-luxe/categories","square")}</div>
                </FormPanel>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                {categories.map(c => (
                  <div key={c.id} className="glass-card rounded-sm overflow-hidden">
                    {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-28 object-cover" onError={e=>{e.currentTarget.style.display="none"}}/>}
                    <div className="p-4">
                      <div className="font-playfair text-sm text-cream mb-1">{c.name}</div>
                      {c.description && <div className="font-lora text-xs text-gold/50 mb-3">{c.description}</div>}
                      <div style={{display:"flex",gap:6}}>
                        <EditBtn onClick={()=>toggleForm("cat",c.id,{name:c.name,description:c.description||"",image_url:c.image_url||"",sort_order:c.sort_order||0})}/>
                        <DelBtn onClick={()=>categoriesAPI.delete(c.id).then(()=>{setCategories(p=>p.filter(x=>x.id!==c.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── SERVICES ─────────────────────────────── */}
          {tab==="services" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Services</h2>
                <AddBtn label="Add Service" onClick={()=>toggleForm("svc")}/>
              </div>
              {showForm.svc && (
                <FormPanel title={editingId.svc?"Edit Service":"New Service"}
                  onSave={()=>crudSave("svc",servicesAPI.create,(id,d)=>servicesAPI.update(id,d),"services")}
                  onCancel={()=>toggleForm("svc")}>
                  {fi("Name","svc","name",{required:true,ph:"Service name"})}
                  {fi("Price ₹ (base)","svc","price",{type:"number",ph:"599"})}
                  {fi("Price Range Min ₹","svc","price_min",{type:"number",ph:"199"})}
                  {fi("Price Range Max ₹","svc","price_max",{type:"number",ph:"2999"})}
                  {fi("Duration (min)","svc","duration",{type:"number",ph:"45"})}
                  {fi("Slot Duration (min)","svc","slot_duration",{type:"number",ph:"30"})}
                  {fi("Icon (emoji)","svc","icon",{ph:"✂️"})}
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Category</label>
                    <select className="salon-input text-sm" value={forms.svc.category_id||""}
                      onChange={e=>setField("svc","category_id",e.target.value)}>
                      <option value="">No category</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {fi("Sort Order","svc","sort_order",{type:"number"})}
                  <div className="sm:col-span-2">{fta("Description","svc","description","Service description")}</div>
                  <div className="sm:col-span-2">{imgUpload("svc","image_url","lonaz-luxe/services","square")}</div>
                </FormPanel>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {services.map(s => (
                  <div key={s.id} className="glass-card p-4 rounded-sm flex justify-between items-center">
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {s.image_url
                        ? <img src={s.image_url} alt={s.name} className="w-12 h-12 rounded object-cover" onError={e=>{e.currentTarget.style.display="none"}}/>
                        : <span style={{fontSize:28}}>{s.icon}</span>}
                      <div>
                        <div className="font-playfair text-sm text-cream">{s.name}</div>
                        <div className="font-cinzel text-[9px] tracking-[1px] text-gold/50">
                          {s.duration} MIN · ₹{s.price}
                          {s.price_min && s.price_max ? ` (₹${s.price_min}–₹${s.price_max})` : ""}
                          {" · "}{s.category_name||s.category||"—"}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <EditBtn onClick={()=>toggleForm("svc",s.id,{name:s.name,description:s.description||"",price:s.price,price_min:s.price_min||"",price_max:s.price_max||"",duration:s.duration,slot_duration:s.slot_duration||30,icon:s.icon||"✂️",category:s.category||"",category_id:s.category_id||"",image_url:s.image_url||"",sort_order:s.sort_order||0})}/>
                      <DelBtn onClick={()=>servicesAPI.delete(s.id).then(()=>{setServices(p=>p.filter(x=>x.id!==s.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── SUB-SERVICES ─────────────────────────── */}
          {tab==="sub_services" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Sub-Services</h2>
                <AddBtn label="Add Sub-Service" onClick={()=>toggleForm("sub")}/>
              </div>
              {showForm.sub && (
                <FormPanel title={editingId.sub?"Edit Sub-Service":"New Sub-Service"}
                  onSave={()=>crudSave("sub",subServicesAPI.create,(id,d)=>subServicesAPI.update(id,d),"sub_services")}
                  onCancel={()=>toggleForm("sub")}>
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Parent Service *</label>
                    <select className="salon-input text-sm" value={forms.sub.service_id||""}
                      onChange={e=>setField("sub","service_id",e.target.value)}>
                      <option value="">Select service...</option>
                      {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {fi("Sub-Service Name","sub","name",{required:true,ph:"e.g. Fade Cut"})}
                  {fi("Price ₹","sub","price",{type:"number",ph:"499"})}
                  {fi("Discount Price ₹ (optional)","sub","discount_price",{type:"number",ph:"399"})}
                  {fi("Duration (min)","sub","duration",{type:"number",ph:"30"})}
                  {fi("Sort Order","sub","sort_order",{type:"number"})}
                  <div className="sm:col-span-2">{fta("Description","sub","description","Style details...")}</div>
                  <div className="sm:col-span-2">{imgUpload("sub","image_url","lonaz-luxe/sub-services","square")}</div>
                </FormPanel>
              )}
              <div className="glass-card rounded-sm overflow-x-auto">
                <table className="salon-table">
                  <thead><tr>{["Parent","Name","Price","Discount","Duration","Action"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {subSvcs.map(ss => (
                      <tr key={ss.id}>
                        <td className="text-gold/50 text-sm">{ss.service_name}</td>
                        <td className="text-cream text-sm">{ss.name}</td>
                        <td className="text-gold font-bold">₹{ss.price}</td>
                        <td className="text-green-400 text-xs">{ss.discount_price?`₹${ss.discount_price}`:"—"}</td>
                        <td className="text-gold/50 text-xs">{ss.duration?`${ss.duration} min`:"—"}</td>
                        <td><div style={{display:"flex",gap:6}}>
                          <EditBtn onClick={()=>toggleForm("sub",ss.id,{service_id:ss.service_id,name:ss.name,price:ss.price,duration:ss.duration||"",discount_price:ss.discount_price||"",description:ss.description||"",image_url:ss.image_url||"",sort_order:ss.sort_order||0})}/>
                          <DelBtn onClick={()=>subServicesAPI.delete(ss.id).then(()=>{setSubSvcs(p=>p.filter(x=>x.id!==ss.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── PAYMENTS ─────────────────────────────── */}
          {tab==="payments" && (
            <div>
              <h2 className="font-playfair text-xl text-cream mb-5">Payments</h2>
              {pendingUpi.length>0 && (
                <div className="mb-6">
                  <div className="font-cinzel text-[9px] tracking-[3px] text-gold/60 mb-3 uppercase">Pending UPI Verifications</div>
                  {pendingUpi.map(p => (
                    <div key={p.id} className="glass-card p-4 mb-3 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="font-playfair text-sm text-cream">{p.customer_name} — {p.service_name}</div>
                        <div className="font-cinzel text-[9px] tracking-[1px] text-gold/50 mt-1">{p.booking_ref} · ₹{p.amount}</div>
                        {p.upi_screenshot_url && <a href={`${(process.env.NEXT_PUBLIC_API_URL||"").replace("/api","")}${p.upi_screenshot_url}`} target="_blank" rel="noreferrer" className="font-cinzel text-[9px] text-gold underline">View Screenshot →</a>}
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>handleUpiVerify(p.id,true)} style={{background:"#2E7D32",border:"none",color:"#fff",padding:"7px 14px",fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:1,borderRadius:2,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><CheckCircle size={11}/> Approve</button>
                        <button onClick={()=>handleUpiVerify(p.id,false)} style={{background:"#C62828",border:"none",color:"#fff",padding:"7px 14px",fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:1,borderRadius:2,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><XCircle size={11}/> Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="glass-card rounded-sm overflow-x-auto">
                <table className="salon-table">
                  <thead><tr>{["Customer","Service","Amount","Method","Fee","Status","Date"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="text-cream text-sm">{p.customer_name}</td>
                        <td className="text-gold/50 text-sm">{p.service_name}</td>
                        <td className="text-gold font-bold">₹{p.amount}</td>
                        <td><span className="badge badge-muted text-[8px]">{p.payment_method||p.method}</span></td>
                        <td className="text-gold/40 text-xs">{p.fee_applied>0?`₹${p.fee_applied}`:"—"}</td>
                        <td><span className="badge text-[8px]" style={{background:SC[p.status]||"#9B8B7A",color:"#fff"}}>{p.status}</span></td>
                        <td className="text-gold/40 text-xs">{p.created_at?format(new Date(p.created_at),"MMM d"):"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── COURSES ──────────────────────────────── */}
          {tab==="courses" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Courses</h2>
                <AddBtn label="Add Course" onClick={()=>toggleForm("crs")}/>
              </div>
              {showForm.crs && (
                <FormPanel title={editingId.crs?"Edit Course":"New Course"}
                  onSave={()=>crudSave("crs",coursesAPI.create,(id,d)=>coursesAPI.update(id,d),"courses")}
                  onCancel={()=>toggleForm("crs")}>
                  <div className="sm:col-span-2">{fi("Title","crs","title",{required:true,ph:"Course title"})}</div>
                  {fi("Price ₹","crs","price",{type:"number",ph:"4999"})}
                  {fi("Offer Price ₹","crs","offer_price",{type:"number",ph:"3999 (optional)"})}
                  {fi("Duration (hrs)","crs","duration_hrs",{type:"number",ph:"8"})}
                  {fi("Lessons","crs","lesson_count",{type:"number",ph:"12"})}
                  {fi("Tag","crs","tag",{ph:"BESTSELLER"})}
                  {fi("Video URL","crs","video_url",{ph:"https://..."})}
                  <div className="sm:col-span-2">{imgUpload("crs","thumbnail","lonaz-luxe/courses","wide")}</div>
                  <div className="sm:col-span-2">{fta("Description","crs","description","Course description")}</div>
                </FormPanel>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {courses.map(c => (
                  <div key={c.id} className="glass-card p-4 rounded-sm flex justify-between items-center">
                    <div>
                      <div className="font-playfair text-sm text-cream">{c.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                        {c.offer_price
                          ? <><span className="font-cinzel text-[10px] text-gold">₹{c.offer_price}</span><span className="font-cinzel text-[9px] text-gold/40 line-through">₹{c.price}</span><span className="badge badge-gold text-[7px]">OFFER</span></>
                          : <span className="font-cinzel text-[10px] text-gold">₹{c.price}</span>}
                        {c.tag && <span className="badge badge-muted text-[8px]">{c.tag}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <EditBtn onClick={()=>toggleForm("crs",c.id,{title:c.title,description:c.description||"",price:c.price,offer_price:c.offer_price||"",duration_hrs:c.duration_hrs||"",lesson_count:c.lesson_count||"",tag:c.tag||"",video_url:c.video_url||"",thumbnail:c.thumbnail||""})}/>
                      <DelBtn onClick={()=>coursesAPI.delete(c.id).then(()=>{setCourses(p=>p.filter(x=>x.id!==c.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── OFFERS ───────────────────────────────── */}
          {tab==="offers" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Homepage Offers</h2>
                <AddBtn label="Add Offer" onClick={()=>toggleForm("off")}/>
              </div>
              {showForm.off && (
                <FormPanel
                  title={editingId.off?"Edit Offer":"New Offer"}
                  onSave={async () => {
                    const fd = new FormData();
                    Object.entries(forms.off).forEach(([k,v]) => { if (v) fd.append(k,v); });
                    try {
                      if (editingId.off) await offersAPI.update(editingId.off, fd);
                      else await offersAPI.create(fd);
                      toast.success("Saved"); toggleForm("off"); load("offers");
                    } catch(e) { toast.error(e.response?.data?.error||"Failed"); }
                  }}
                  onCancel={()=>toggleForm("off")}>
                  {fi("Title","off","title",{required:true,ph:"e.g. Summer Special"})}
                  {fi("Discount","off","discount",{ph:"e.g. 20% OFF"})}
                  {fi("Expiry Date","off","expiry_date",{type:"date"})}
                  <div className="sm:col-span-2">{fta("Description","off","description","Offer details...")}</div>
                  <div className="sm:col-span-2">{imgUpload("off","image_url","lonaz-luxe/offers","portrait")}</div>
                </FormPanel>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
                {offers.map(o => (
                  <div key={o.id} className="glass-card rounded-sm overflow-hidden">
                    {o.image_url && <img src={o.image_url} alt={o.title} className="w-full h-32 object-cover" onError={e=>{e.currentTarget.style.display="none"}}/>}
                    <div className="p-4">
                      <div className="font-playfair text-sm text-cream mb-1">{o.title}</div>
                      {o.discount && <span className="badge badge-gold text-[8px] mb-2 inline-block">{o.discount}</span>}
                      {o.expiry_date && <div className="font-cinzel text-[8px] text-gold/40 mb-2">Expires: {new Date(o.expiry_date).toLocaleDateString("en-IN")}</div>}
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                        <span className="badge text-[8px]" style={{background:o.is_active?"#2E7D32":"#C62828",color:"#fff"}}>{o.is_active?"Active":"Inactive"}</span>
                        <button onClick={()=>offersAPI.update(o.id,JSON.stringify({is_active:!o.is_active})).then(()=>load("offers")).catch(()=>{})} className="font-cinzel text-[8px] text-gold/50 underline cursor-pointer border-none bg-transparent">Toggle</button>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <EditBtn onClick={()=>toggleForm("off",o.id,{title:o.title,description:o.description||"",discount:o.discount||"",image_url:o.image_url||"",expiry_date:o.expiry_date?o.expiry_date.split("T")[0]:""})}/>
                        <DelBtn onClick={()=>offersAPI.delete(o.id).then(()=>{setOffers(p=>p.filter(x=>x.id!==o.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                      </div>
                    </div>
                  </div>
                ))}
                {offers.length===0 && <p className="font-lora text-sm text-cream/40 col-span-full py-10 text-center">No offers yet.</p>}
              </div>
            </div>
          )}

          {/* ─── VIDEOS ───────────────────────────────── */}
          {tab==="videos" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Instagram / Videos</h2>
                <AddBtn label="Add Video" onClick={()=>toggleForm("vid")}/>
              </div>
              {showForm.vid && (
                <FormPanel title={editingId.vid?"Edit Video":"New Video"}
                  onSave={()=>crudSave("vid",videosAPI.create,(id,d)=>videosAPI.update(id,d),"videos")}
                  onCancel={()=>toggleForm("vid")}>
                  {fi("Title","vid","title",{ph:"e.g. Bridal Transformation"})}
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Platform</label>
                    <select className="salon-input text-sm" value={forms.vid.platform}
                      onChange={e=>setField("vid","platform",e.target.value)}>
                      {["instagram","youtube","facebook","tiktok"].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">{fi("Video URL *","vid","url",{ph:"https://instagram.com/reel/... or https://youtube.com/watch?v=..."})}</div>
                  <div className="sm:col-span-2">{imgUpload("vid","thumbnail_url","lonaz-luxe/video-thumbs","wide")}</div>
                  {fi("Sort Order","vid","sort_order",{type:"number"})}
                </FormPanel>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                {videos.map(v => (
                  <div key={v.id} className="glass-card rounded-sm overflow-hidden">
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt={v.title||"Video"} className="w-full h-28 object-cover" onError={e=>{e.currentTarget.style.display="none"}}/>
                      : <div className="h-28 flex items-center justify-center" style={{background:"rgba(15,59,47,.6)"}}><Video size={28} className="text-gold/40"/></div>}
                    <div className="p-4">
                      <div className="font-playfair text-sm text-cream mb-1">{v.title||"Video"}</div>
                      <div className="font-cinzel text-[8px] tracking-[1px] text-gold/40 uppercase mb-2">{v.platform}</div>
                      <a href={v.url} target="_blank" rel="noreferrer" className="font-cinzel text-[9px] text-gold underline block mb-2 truncate">Open Link →</a>
                      <div style={{display:"flex",gap:6}}>
                        <EditBtn onClick={()=>toggleForm("vid",v.id,{title:v.title||"",url:v.url,thumbnail_url:v.thumbnail_url||"",platform:v.platform||"instagram",sort_order:v.sort_order||0})}/>
                        <DelBtn onClick={()=>videosAPI.delete(v.id).then(()=>{setVideos(p=>p.filter(x=>x.id!==v.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.length===0 && <p className="font-lora text-sm text-cream/40 col-span-full py-10 text-center">No videos yet.</p>}
              </div>
            </div>
          )}

          {/* ─── CONTACTS ─────────────────────────────── */}
          {tab==="contacts" && (
            <div>
              <h2 className="font-playfair text-xl text-cream mb-5">Contact Messages</h2>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {contacts.map(c => (
                  <div key={c.id} onClick={()=>!c.is_read&&markRead(c.id)}
                    className="glass-card p-5 rounded-sm cursor-pointer" style={{borderColor:!c.is_read?"rgba(201,168,76,.3)":undefined}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <div><span className="font-cinzel text-[10px] tracking-[2px] text-cream">{c.name}</span><span className="font-lora text-xs text-gold/40 ml-3">{c.email}</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {!c.is_read && <div style={{width:6,height:6,borderRadius:"50%",background:"#C9A84C"}}/>}
                        <span className="font-lora text-xs text-gold/30">{c.created_at?format(new Date(c.created_at),"MMM d, h:mm a"):""}</span>
                      </div>
                    </div>
                    {c.subject && <div className="font-cinzel text-[9px] tracking-[2px] text-gold mb-2">{c.subject}</div>}
                    <p className="font-lora text-sm text-cream/75 leading-relaxed">{c.message}</p>
                  </div>
                ))}
                {contacts.length===0 && <p className="font-lora text-sm text-cream/40 py-10 text-center">No messages yet.</p>}
              </div>
            </div>
          )}

          {/* ─── CAREERS ──────────────────────────────── */}
          {tab==="applications" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="font-playfair text-xl text-cream">Careers</h2>
                <AddBtn label="Add Job" onClick={()=>toggleForm("job")}/>
              </div>
              {showForm.job && (
                <FormPanel title={editingId.job?"Edit Job":"New Job"}
                  onSave={()=>crudSave("job",careersAPI.createJob,(id,d)=>careersAPI.updateJob(id,d),"applications")}
                  onCancel={()=>toggleForm("job")}>
                  {fi("Title","job","title",{required:true,ph:"Senior Hair Stylist"})}
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Type</label>
                    <select className="salon-input text-sm" value={forms.job.type}
                      onChange={e=>setField("job","type",e.target.value)}>
                      {["Full-time","Part-time","Contract"].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {fi("Experience","job","experience",{ph:"3+ years"})}
                  {fi("Salary","job","salary",{ph:"₹30,000 – ₹50,000/mo"})}
                  <div className="sm:col-span-2">{fta("Description","job","description","Role description")}</div>
                </FormPanel>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
                {jobs.map(j => (
                  <div key={j.id} className="glass-card p-4 rounded-sm flex justify-between items-center">
                    <div>
                      <div className="font-playfair text-sm text-cream">{j.title}</div>
                      <div className="font-cinzel text-[9px] tracking-[1px] text-gold/50">{j.type} · {j.experience} · {j.salary}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <EditBtn onClick={()=>toggleForm("job",j.id,{title:j.title,type:j.type||"Full-time",experience:j.experience||"",salary:j.salary||"",description:j.description||""})}/>
                      <DelBtn onClick={()=>careersAPI.deleteJob(j.id).then(()=>{setJobs(p=>p.filter(x=>x.id!==j.id));toast.success("Removed")}).catch(()=>toast.error("Failed"))}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="font-cinzel text-[9px] tracking-[3px] text-gold/40 mb-4 uppercase">Applications</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {applications.map(a => (
                  <div key={a.id} className="glass-card p-5 rounded-sm flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <div className="font-playfair text-sm text-cream">{a.name}</div>
                      <div className="font-cinzel text-[10px] tracking-[2px] text-gold mb-2">{a.job_title}</div>
                      <div className="font-lora text-xs text-gold/50">{a.email} · {a.phone}</div>
                      {a.experience && <div className="font-lora text-xs text-gold/40">Exp: {a.experience}</div>}
                      {a.resume_url && <a href={`${(process.env.NEXT_PUBLIC_API_URL||"").replace("/api","")}${a.resume_url}`} target="_blank" rel="noreferrer" className="font-cinzel text-[9px] text-gold underline mt-1 block">Resume →</a>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span className="badge text-[8px]" style={{background:SC[a.status]||"#9B8B7A",color:"#fff"}}>{a.status}</span>
                      <select value={a.status}
                        onChange={e=>careersAPI.updateApplication(a.id,e.target.value).then(()=>setApps(p=>p.map(x=>x.id===a.id?{...x,status:e.target.value}:x))).catch(()=>toast.error("Failed"))}
                        style={{background:"#061a12",border:"1px solid rgba(201,168,76,.2)",color:"#9B8B7A",fontSize:10,padding:"4px 6px",borderRadius:4,fontFamily:"'Cinzel',serif",cursor:"pointer"}}>
                        {["new","reviewed","shortlisted","rejected"].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── USERS ────────────────────────────────── */}
          {tab==="users" && (
            <div>
              <h2 className="font-playfair text-xl text-cream mb-5">All Users</h2>
              <div className="glass-card rounded-sm overflow-x-auto">
                <table className="salon-table">
                  <thead><tr>{["Name","Email","Phone","Role","Joined"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="text-cream text-sm">{u.name}</td>
                        <td className="text-gold/50 text-sm">{u.email}</td>
                        <td className="text-gold/40 text-sm">{u.phone||"—"}</td>
                        <td><span className={`badge text-[8px] ${u.role==="admin"?"badge-gold":"badge-muted"}`}>{u.role}</span></td>
                        <td className="text-gold/40 text-xs">{u.created_at?format(new Date(u.created_at),"MMM d, yyyy"):"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── SETTINGS ─────────────────────────────── */}
          {tab==="settings" && (
            <div style={{maxWidth:580}}>
              <h2 className="font-playfair text-xl text-cream mb-6">Salon Settings</h2>
              <div className="glass-card p-6 rounded-sm mb-5">
                <div className="font-cinzel text-[9px] tracking-[3px] text-gold/50 mb-4 uppercase">Branding</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Salon Name</label>
                    <input className="salon-input text-sm" value={forms.set.salon_name||""}
                      onChange={e=>setField("set","salon_name",e.target.value)} placeholder="Lonaz Luxe Salon"/>
                  </div>
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Logo</label>
                    {siteSettings.logo_url && <img src={siteSettings.logo_url} alt="Logo" className="h-10 mb-2 object-contain" onError={e=>{e.currentTarget.style.display="none"}}/>}
                    <label className="flex items-center gap-3 border border-dashed border-gold/25 p-3 rounded-sm cursor-pointer hover:border-gold/50 transition-colors">
                      <Upload size={15} className="text-gold/50"/>
                      <span className="font-lora text-xs text-cream/50">{logoFile?logoFile.name:"Click to upload logo (PNG/JPG/SVG)"}</span>
                      <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={e=>setLogoFile(e.target.files[0])}/>
                    </label>
                  </div>
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Owner / Salon Photo (shown in Philosophy section)</label>
                    {imgUpload("set","owner_image_url","lonaz-luxe/owner","portrait")}
                  </div>
                  <div>
                    <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">Footer Tagline</label>
                    <input className="salon-input text-sm" value={forms.set.footer_tagline||""}
                      onChange={e=>setField("set","footer_tagline",e.target.value)} placeholder="Where Beauty Meets Luxury"/>
                  </div>
                </div>
              </div>
              <div className="glass-card p-6 rounded-sm mb-5">
                <div className="font-cinzel text-[9px] tracking-[3px] text-gold/50 mb-4 uppercase">Contact Info</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  {[
                    ["Footer Address","footer_address","123 Style Street, Mumbai"],
                    ["Footer Phone","footer_phone","+91 98765 43210"],
                    ["Footer Email","footer_email","hello@lonazluxe.in"],
                    ["WhatsApp Number","whatsapp_number","919876543210"],
                    ["UPI ID","upi_id","lonazluxe@upi"],
                    ["Instagram URL","instagram_url","https://instagram.com/lonazluxe"],
                  ].map(([label,key,ph]) => (
                    <div key={key}>
                      <label className="font-cinzel text-[9px] tracking-[2px] text-gold/50 block mb-1.5 uppercase">{label}</label>
                      <input className="salon-input text-sm" value={forms.set[key]||""} placeholder={ph}
                        onChange={e=>setField("set",key,e.target.value)}/>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <HeroMediaSection
                  currentUrl={heroMedia.url}
                  currentType={heroMedia.type}
                  onSaved={(data) => {
                    if (data) setHeroMedia({ url: data.url, type: data.type });
                    else setHeroMedia({ url: "", type: "image" });
                  }}
                />
              </div>
              <button onClick={saveSettings} disabled={savingSet} className="btn-gold flex items-center gap-2 mt-6">
                {savingSet ? <Loader size={14} className="animate-spin"/> : null}
                {savingSet ? "Saving..." : "Save All Settings"}
              </button>
            </div>
          )}

          </>
        )}
      </main>
    </div>
  );
}
