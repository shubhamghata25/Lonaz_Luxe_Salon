"use client";
/**
 * FILE: frontend/app/services-menu/page.jsx
 * UX: Step1 → pick category (one at a time, others hidden)
 *     Step2 → services of that category (price range admin-set)
 *     Step3 → sub-services (exact fixed price each)
 */
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { categoriesAPI, servicesAPI, subServicesAPI } from "@/lib/api";
import { Loader, ChevronLeft, Clock, Tag, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

// Returns admin-set price range label for a service
function servicePriceLabel(service) {
  const min  = service.price_min != null ? parseFloat(service.price_min)  : null;
  const max  = service.price_max != null ? parseFloat(service.price_max)  : null;
  const base = parseFloat(service.price || 0);
  if (min !== null && max !== null && max > min) return `₹${min.toFixed(0)} – ₹${max.toFixed(0)}`;
  if (min !== null && max !== null)              return `₹${min.toFixed(0)}`;
  if (min !== null)                              return `from ₹${min.toFixed(0)}`;
  if (base)                                      return `₹${base.toFixed(0)}`;
  return null;
}

// Returns price range across all services in a category
function catPriceRange(services) {
  if (!services.length) return null;
  const mins = services.map(s => s.price_min != null ? parseFloat(s.price_min) : parseFloat(s.price || 0)).filter(Boolean);
  const maxs = services.map(s => s.price_max != null ? parseFloat(s.price_max) : parseFloat(s.price || 0)).filter(Boolean);
  if (!mins.length) return null;
  const lo = Math.min(...mins), hi = Math.max(...maxs);
  return lo === hi ? `₹${lo.toFixed(0)}` : `₹${lo.toFixed(0)} – ₹${hi.toFixed(0)}`;
}

// ── Category Tab ──────────────────────────────────────────────────────────────
function CatTab({ cat, active, onClick, priceRange, count }) {
  return (
    <button onClick={onClick} className="group relative w-full text-left rounded-sm overflow-hidden transition-all duration-200"
      style={{ background: active ? "rgba(201,168,76,0.1)" : "rgba(15,59,47,0.6)",
        border: active ? "2px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)",
        boxShadow: active ? "0 0 20px rgba(201,168,76,0.2)" : "none" }}>
      {cat.image_url ? (
        <div className="relative h-24 overflow-hidden">
          <img src={cat.image_url} alt={cat.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.currentTarget.closest(".relative").style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 to-transparent" />
          {active && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
              <Check size={11} style={{ color: "#1a1a1a" }} />
            </div>
          )}
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-2xl"
          style={{ background: "linear-gradient(135deg,rgba(15,59,47,0.85),rgba(10,42,33,0.95))" }}>
          {cat.name === "Men" ? "💈" : cat.name === "Women" ? "💆" : cat.name === "Child" ? "👶" : "✂️"}
        </div>
      )}
      <div className="p-3">
        <div className="font-cinzel text-[11px] tracking-[2px] uppercase text-cream group-hover:text-gold transition-colors">{cat.name}</div>
        {priceRange && <div className="font-playfair text-[11px] text-gold/70 mt-0.5">{priceRange}</div>}
        <div className="font-lora text-[10px] text-cream/30 mt-0.5">{count} service{count !== 1 ? "s" : ""}</div>
      </div>
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,transparent,#C9A84C,transparent)" }} />}
    </button>
  );
}

// ── Service Card (Level 2) ────────────────────────────────────────────────────
function SvcCard({ svc, onClick }) {
  const priceLabel = servicePriceLabel(svc);
  return (
    <button onClick={onClick} className="group w-full text-left rounded-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "rgba(15,59,47,0.6)", border: "1px solid rgba(201,168,76,0.15)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.45)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)"; }}>
      {svc.image_url && (
        <div className="relative h-36 overflow-hidden">
          <img src={svc.image_url} alt={svc.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.currentTarget.closest(".relative").style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 to-transparent" />
        </div>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {!svc.image_url && <span style={{ fontSize: 22, flexShrink: 0 }}>{svc.icon || "✂️"}</span>}
            <h3 className="font-playfair text-base sm:text-lg text-cream group-hover:text-gold transition-colors font-semibold truncate">{svc.name}</h3>
          </div>
          {/* Admin-set price range */}
          {priceLabel && <span className="font-playfair text-base font-bold text-gold shrink-0">{priceLabel}</span>}
        </div>
        {(svc.slot_duration || svc.duration) && (
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={10} className="text-gold/40" />
            <span className="font-cinzel text-[9px] tracking-widest text-cream/35">{svc.slot_duration || svc.duration} MIN</span>
          </div>
        )}
        {svc.description && <p className="font-lora text-xs text-cream/50 leading-relaxed mb-3 line-clamp-2">{svc.description}</p>}
        <span className="font-cinzel text-[9px] tracking-[2px] uppercase text-gold/60 group-hover:text-gold transition-colors">View Options →</span>
      </div>
    </button>
  );
}

// ── Sub-Service Card (Level 3) ────────────────────────────────────────────────
function SubCard({ sub }) {
  const original   = parseFloat(sub.price || 0);
  const discounted = sub.discount_price ? parseFloat(sub.discount_price) : null;
  const hasOffer   = discounted && discounted < original;
  return (
    <div className="group rounded-sm overflow-hidden" style={{ background: "rgba(15,59,47,0.6)", border: "1px solid rgba(201,168,76,0.15)" }}>
      {sub.image_url && (
        <div className="relative h-32 overflow-hidden">
          <img src={sub.image_url} alt={sub.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.currentTarget.closest(".relative").style.display = "none"; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 to-transparent" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-playfair text-sm sm:text-base text-cream font-semibold group-hover:text-gold transition-colors">{sub.name}</h4>
          {/* Exact fixed price */}
          <div className="text-right shrink-0">
            {hasOffer ? (
              <>
                <div className="font-playfair text-base font-bold text-gold">₹{discounted.toFixed(0)}</div>
                <div className="font-lora text-[10px] text-muted line-through">₹{original.toFixed(0)}</div>
              </>
            ) : (
              <div className="font-playfair text-base font-bold text-gold">₹{original.toFixed(0)}</div>
            )}
          </div>
        </div>
        {hasOffer && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={9} className="text-green-400" />
            <span className="font-cinzel text-[8px] tracking-[1px] text-green-400">DISCOUNT</span>
          </div>
        )}
        {sub.duration && (
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={10} className="text-gold/40" />
            <span className="font-cinzel text-[9px] tracking-widest text-cream/35">{sub.duration} MIN</span>
          </div>
        )}
        {sub.description && <p className="font-lora text-xs text-cream/50 leading-relaxed mb-3">{sub.description}</p>}
        <Link href={`/booking?service=${sub.service_id}&sub=${sub.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-sm font-cinzel text-[9px] tracking-[2px] uppercase transition-all"
          style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#1a1a1a"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.color = "#C9A84C"; }}
          onClick={e => e.stopPropagation()}>
          Book Now <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Step Label ────────────────────────────────────────────────────────────────
function StepBadge({ n, label }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="font-cinzel text-[9px] tracking-[3px] uppercase px-2 py-1 rounded-sm"
        style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>{n}</span>
      <span className="font-cinzel text-[10px] tracking-[2px] text-cream/50 uppercase">{label}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function ServicesMenuContent() {
  const searchParams = useSearchParams();
  const [categories,   setCategories]   = useState([]);
  const [allServices,  setAllServices]  = useState([]);
  const [subServices,  setSubServices]  = useState([]);
  const [activeCatId,  setActiveCatId]  = useState(null);
  const [activeSvc,    setActiveSvc]    = useState(null);
  const [loadingMain,  setLoadingMain]  = useState(true);
  const [loadingSubs,  setLoadingSubs]  = useState(false);

  useEffect(() => {
    const initCat = searchParams.get("category");
    Promise.all([categoriesAPI.list(), servicesAPI.list()])
      .then(([cRes, sRes]) => {
        setCategories(cRes.data||[]);
        setAllServices(sRes.data||[]);
        if (initCat) setActiveCatId(initCat);
      })
      .catch(() => {})
      .finally(() => setLoadingMain(false));
  }, []);

  const visibleServices = activeCatId
    ? allServices.filter(s => s.category_id === activeCatId)
    : allServices;

  const handleSvcClick = async (svc) => {
    setActiveSvc(svc);
    setSubServices([]);
    setLoadingSubs(true);
    try { const { data } = await subServicesAPI.byService(svc.id); setSubServices(data); }
    catch { setSubServices([]); }
    finally { setLoadingSubs(false); }
  };

  const handleBack = () => { setActiveSvc(null); setSubServices([]); };

  const handleCatClick = (catId) => { setActiveCatId(catId); setActiveSvc(null); setSubServices([]); };

  const activeCat = categories.find(c => c.id === activeCatId);

  if (loadingMain) return (
    <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
      <Loader size={28} className="text-gold animate-spin" />
    </div>
  );

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      {/* Page header */}
      <div className="py-12 sm:py-16 px-4 text-center"
        style={{ background: "linear-gradient(180deg,rgba(10,42,33,.95),rgba(15,59,47,.7))" }}>
        <div className="section-label justify-center">
          <span className="gold-line" /><span>Explore</span><span className="gold-line" />
        </div>
        <h1 className="font-playfair text-[clamp(28px,5vw,54px)] font-bold text-cream">
          Our <em className="text-gold">Services</em>
        </h1>
        <p className="font-lora text-sm text-cream/50 mt-2 max-w-sm mx-auto">
          Pick a category → choose a service → select your style.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── LEVEL 1: Category Tabs ────────────────────────────────────────── */}
        <div className="mb-10">
          <StepBadge n="Step 1" label="Select Category" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* All tab */}
            <button onClick={() => handleCatClick(null)}
              className="group relative rounded-sm overflow-hidden transition-all duration-200 p-4 text-center"
              style={{ background: !activeCatId ? "rgba(201,168,76,0.1)" : "rgba(15,59,47,0.6)",
                border: !activeCatId ? "2px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)",
                boxShadow: !activeCatId ? "0 0 20px rgba(201,168,76,0.2)" : "none" }}>
              <div className="text-2xl mb-2">✨</div>
              <div className="font-cinzel text-[11px] tracking-[2px] uppercase text-cream group-hover:text-gold transition-colors">All</div>
              <div className="font-lora text-[10px] text-cream/30 mt-0.5">{allServices.length} services</div>
              {!activeCatId && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,transparent,#C9A84C,transparent)" }} />}
            </button>

            {categories.map(cat => (
              <CatTab key={cat.id} cat={cat}
                active={activeCatId === cat.id}
                onClick={() => handleCatClick(cat.id)}
                priceRange={catPriceRange(allServices.filter(s => s.category_id === cat.id))}
                count={allServices.filter(s => s.category_id === cat.id).length} />
            ))}
          </div>
        </div>

        {/* ── LEVEL 2: Services (hidden when service selected) ─────────────── */}
        {!activeSvc && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="font-cinzel text-[9px] tracking-[3px] uppercase px-2 py-1 rounded-sm"
                style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>Step 2</span>
              <span className="font-cinzel text-[10px] tracking-[2px] text-cream/50 uppercase">
                {activeCat ? `${activeCat.name} Services` : "All Services"}
              </span>
              <span className="font-lora text-xs text-cream/25">({visibleServices.length})</span>
            </div>
            {visibleServices.length === 0 ? (
              <div className="text-center py-16 rounded-sm"
                style={{ border: "1px solid rgba(201,168,76,0.1)", background: "rgba(15,59,47,0.3)" }}>
                <p className="font-lora text-cream/40">No services in this category yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleServices.map(svc => (
                  <SvcCard key={svc.id} svc={svc} onClick={() => handleSvcClick(svc)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LEVEL 3: Sub-services (replaces Level 2) ────────────────────── */}
        {activeSvc && (
          <div>
            {/* Breadcrumb + back */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={handleBack}
                className="flex items-center gap-1.5 font-cinzel text-[9px] tracking-[2px] uppercase text-gold/60 hover:text-gold transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
              <span className="text-gold/20">|</span>
              {activeCat && <span className="font-cinzel text-[9px] tracking-[2px] text-cream/30 uppercase">{activeCat.name}</span>}
              <span className="text-gold/20">›</span>
              <span className="font-cinzel text-[10px] tracking-[2px] text-gold uppercase">{activeSvc.name}</span>
            </div>

            {/* Service summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-sm mb-6"
              style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div className="flex items-center gap-3">
                {activeSvc.image_url ? (
                  <img src={activeSvc.image_url} alt={activeSvc.name}
                    className="w-12 h-12 object-cover rounded-sm shrink-0"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <span style={{ fontSize: 28 }}>{activeSvc.icon || "✂️"}</span>
                )}
                <div>
                  <h2 className="font-playfair text-lg sm:text-xl font-bold text-cream">{activeSvc.name}</h2>
                  {activeSvc.description && <p className="font-lora text-xs text-cream/50 mt-0.5">{activeSvc.description}</p>}
                </div>
              </div>
              {servicePriceLabel(activeSvc) && (
                <div className="shrink-0">
                  <div className="font-cinzel text-[8px] tracking-[2px] text-cream/30 uppercase mb-0.5">Price Range</div>
                  <div className="font-playfair text-lg font-bold text-gold">{servicePriceLabel(activeSvc)}</div>
                </div>
              )}
            </div>

            <StepBadge n="Step 3" label="Choose Your Option" />

            {loadingSubs ? (
              <div className="flex justify-center py-16">
                <Loader size={24} className="text-gold animate-spin" />
              </div>
            ) : subServices.length === 0 ? (
              <div className="text-center py-12 rounded-sm"
                style={{ border: "1px solid rgba(201,168,76,0.15)", background: "rgba(15,59,47,0.4)" }}>
                <p className="font-lora text-sm text-cream/50 mb-5">No sub-options. Book directly.</p>
                <Link href={`/booking?service=${activeSvc.id}`} className="btn-gold !px-8 !py-3">
                  Book {activeSvc.name} — {servicePriceLabel(activeSvc) || `₹${parseFloat(activeSvc.price).toFixed(0)}`}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {subServices.map(ss => <SubCard key={ss.id} sub={ss} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ minHeight: "100vh", paddingTop: 70 }}>
        <Loader size={28} className="text-gold animate-spin" />
      </div>
    }>
      <ServicesMenuContent />
    </Suspense>
  );
}
