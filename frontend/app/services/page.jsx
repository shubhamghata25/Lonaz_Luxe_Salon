"use client";
/**
 * FILE: frontend/app/services/page.jsx  [v4 redesign]
 * - Tabs: All | Men | Women | Child (from DB categories)
 * - Selecting a category shows services filtered to that category
 * - Selecting a service expands sub-options with price/discount
 * - Mobile responsive
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { servicesAPI, subServicesAPI, categoriesAPI } from "@/lib/api";
import { Clock, ArrowRight, Loader, ChevronDown, ChevronUp, Tag } from "lucide-react";

export default function ServicesPage() {
  const [categories,    setCategories]   = useState([]);
  const [services,      setServices]     = useState([]);
  const [subMap,        setSubMap]       = useState({}); // serviceId -> sub[]
  const [expanded,      setExpanded]     = useState(null);
  const [activeTab,     setActiveTab]    = useState("all");
  const [loading,       setLoading]      = useState(true);
  const [loadingSubs,   setLoadingSubs]  = useState(false);

  useEffect(() => {
    Promise.all([categoriesAPI.list(), servicesAPI.list()])
      .then(([cRes, sRes]) => {
        setCategories(cRes.data||[]);
        setServices(sRes.data||[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter by active tab
  const filtered = activeTab === "all"
    ? services
    : services.filter(s => s.category_id === activeTab);

  // Toggle expand service and lazy-load sub-services
  const toggleService = useCallback(async (svcId) => {
    if (expanded === svcId) { setExpanded(null); return; }
    setExpanded(svcId);
    if (!subMap[svcId]) {
      setLoadingSubs(true);
      try {
        const { data } = await subServicesAPI.byService(svcId);
        setSubMap(prev => ({ ...prev, [svcId]: data }));
      } catch (_) {
        setSubMap(prev => ({ ...prev, [svcId]: [] }));
      } finally {
        setLoadingSubs(false);
      }
    }
  }, [expanded, subMap]);

  // Tabs use category id (not name) so filter is exact match
  const tabs = [
    { id: "all", label: "All Services" },
    ...categories.map(c => ({ id: c.id, label: c.name })),
  ];

  return (
    <div className="min-h-screen pt-[70px]">
      {/* Header */}
      <div className="py-16 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#1a1a1a,#161616)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <div className="section-label justify-center">
            <span className="gold-line" /><span>Our Offerings</span><span className="gold-line" />
          </div>
          <h1 className="font-playfair text-[clamp(32px,5vw,64px)] font-bold text-cream mb-4">
            Our <em className="text-gold not-italic">Services</em>
          </h1>
          <p className="font-lora text-muted max-w-md mx-auto text-sm">
            Every service is a bespoke experience — crafted to your unique style and needs.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-cinzel text-[10px] tracking-[2px] px-4 sm:px-5 py-2 border rounded-sm transition-all uppercase ${
                activeTab === tab.id
                  ? "bg-gold text-charcoal border-gold"
                  : "border-gold/20 text-muted hover:border-gold/50 hover:text-cream"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader size={32} className="text-gold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-lora text-muted">No services in this category yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(service => {
              const isOpen = expanded === service.id;
              const subs   = subMap[service.id] || [];
              const hasDiscount = subs.some(s => s.discount_price && parseFloat(s.discount_price) < parseFloat(s.price));
              const minPrice = subs.length
                ? Math.min(...subs.map(s => parseFloat(s.discount_price || s.price)))
                : parseFloat(service.price);
              const maxPrice = subs.length
                ? Math.max(...subs.map(s => parseFloat(s.price)))
                : parseFloat(service.price);

              return (
                <div key={service.id}
                  className="glass-card rounded-sm overflow-hidden transition-all duration-300"
                  style={{ borderColor: isOpen ? "rgba(201,168,76,0.4)" : undefined }}>

                  {/* Service Row */}
                  <button
                    onClick={() => toggleService(service.id)}
                    className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Icon / Image */}
                    <div className="shrink-0">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          onError={e => { e.currentTarget.style.display="none"; }}
                          className="w-12 h-12 object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-sm"
                          style={{ background: "rgba(201,168,76,0.07)" }}>
                          {service.icon || "✂️"}
                        </div>
                      )}
                    </div>

                    {/* Name + category */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-playfair text-cream text-base sm:text-lg leading-tight">
                          {service.name}
                        </h3>
                        {service.category_name && (
                          <span className="font-cinzel text-[8px] tracking-[2px] uppercase text-gold/60 border border-gold/20 px-2 py-0.5 rounded-sm">
                            {service.category_name}
                          </span>
                        )}
                      </div>
                      <p className="font-lora text-xs text-muted line-clamp-1">{service.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Clock size={10} className="text-muted shrink-0" />
                        <span className="font-cinzel text-[9px] tracking-widest text-muted">
                          {service.slot_duration || service.duration || 30} MIN
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right mr-2">
                      {subs.length > 0 ? (
                        <div>
                          <div className="font-playfair text-gold font-bold text-base">
                            ₹{minPrice.toFixed(0)}
                            {maxPrice > minPrice && <span className="text-gold/60">–₹{maxPrice.toFixed(0)}</span>}
                          </div>
                          {hasDiscount && (
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              <Tag size={9} className="text-green-400" />
                              <span className="font-cinzel text-[8px] text-green-400 tracking-[1px]">DISCOUNT</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-playfair text-gold font-bold text-base">
                          ₹{parseFloat(service.price).toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 text-gold/50">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Sub-services accordion */}
                  {isOpen && (
                    <div className="border-t border-gold/10 px-4 sm:px-5 pb-4 pt-3"
                      style={{ background: "rgba(201,168,76,0.02)" }}>

                      {loadingSubs && !subMap[service.id] ? (
                        <div className="flex items-center gap-2 py-3">
                          <Loader size={14} className="text-gold animate-spin" />
                          <span className="font-cinzel text-[9px] tracking-[2px] text-muted">Loading options...</span>
                        </div>
                      ) : subs.length === 0 ? (
                        // No sub-services → direct book
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <p className="font-lora text-sm text-cream/60">{service.description}</p>
                          <Link
                            href={`/booking?service=${service.id}`}
                            className="btn-gold !py-2 !px-5 !text-[10px] flex items-center justify-center gap-2 shrink-0"
                          >
                            Book Now <ArrowRight size={12} />
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subs.map(sub => {
                            const original  = parseFloat(sub.price);
                            const discounted = sub.discount_price ? parseFloat(sub.discount_price) : null;
                            const hasOffer  = discounted && discounted < original;
                            return (
                              <div key={sub.id}
                                className="flex items-center justify-between gap-3 rounded-sm px-3 py-2.5"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.1)" }}>
                                <div className="flex-1 min-w-0">
                                  <div className="font-lora text-sm text-cream">{sub.name}</div>
                                  {sub.description && (
                                    <div className="font-lora text-xs text-muted mt-0.5 line-clamp-1">{sub.description}</div>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  {hasOffer ? (
                                    <div>
                                      <div className="font-playfair text-gold font-bold text-sm">
                                        ₹{discounted.toFixed(0)}
                                      </div>
                                      <div className="font-lora text-xs text-muted line-through">₹{original.toFixed(0)}</div>
                                    </div>
                                  ) : (
                                    <div className="font-playfair text-gold font-bold text-sm">
                                      ₹{original.toFixed(0)}
                                    </div>
                                  )}
                                </div>
                                <Link
                                  href={`/booking?service=${service.id}&sub=${sub.id}`}
                                  className="shrink-0 font-cinzel text-[8px] tracking-[2px] uppercase px-3 py-1.5 border border-gold/30 text-gold hover:bg-gold hover:text-charcoal rounded-sm transition-all"
                                >
                                  Book
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
