"use client";
/**
 * FILE: frontend/components/sections/OfferSection.jsx
 *
 * FIX #1: Cloudinary images — src used directly (already correct URL from DB).
 *         Added onError handler so broken images degrade gracefully.
 * FIX #2: Offers look like social media post cards — image banner at top,
 *         bold title, description, optional discount badge, CTA button.
 *         Mobile-first responsive grid.
 */
import Link from "next/link";
import { Tag, Clock, ArrowRight } from "lucide-react";

export default function OfferSection({ offers = [] }) {
  if (!offers.length) return null;

  return (
    <section
      className="py-14 sm:py-20 px-4 sm:px-6"
      style={{ background: "rgba(10,42,33,0.65)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-10">
          <div className="section-label justify-center">
            <span className="gold-line" />
            <span>Special Offers</span>
            <span className="gold-line" />
          </div>
          <h2 className="font-playfair text-[clamp(22px,4vw,42px)] font-bold text-cream">
            Exclusive <em className="text-gold">Deals</em>
          </h2>
        </div>

        {/* Card grid — 1 col mobile, 2 tablet, 3 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map(offer => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OfferCard({ offer }) {
  return (
    <article
      className="group flex flex-col rounded-sm overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "rgba(15,59,47,0.55)",
        border: "1px solid rgba(201,168,76,0.15)",
        boxShadow: "0 2px 24px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; e.currentTarget.style.boxShadow = "0 4px 32px rgba(201,168,76,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)"; e.currentTarget.style.boxShadow = "0 2px 24px rgba(0,0,0,0.25)"; }}
    >
      {/* ── Image banner (social post style) ── */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "16/9", background: "linear-gradient(135deg,rgba(10,42,33,0.9),rgba(15,59,47,0.85))" }}
      >
        {offer.image_url ? (
          <>
            <img
              src={offer.image_url}
              alt={offer.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              /* FIX #1: onError hides broken Cloudinary image, shows placeholder */
              onError={e => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
            {/* Placeholder shown only if image fails */}
            <div
              className="absolute inset-0 items-center justify-center"
              style={{ display: "none", background: "linear-gradient(135deg,rgba(10,42,33,0.9),rgba(15,59,47,0.85))" }}
            >
              <Tag size={40} className="text-gold/20" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag size={40} className="text-gold/20" />
          </div>
        )}

        {/* Gradient overlay at bottom of image */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(10,42,33,0.9) 0%, transparent 50%)" }}
        />

        {/* Discount badge overlaid on image */}
        {offer.discount && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
            style={{ background: "rgba(201,168,76,0.92)", backdropFilter: "blur(4px)" }}
          >
            <Tag size={10} style={{ color: "#1a1a1a" }} />
            <span className="font-cinzel text-[9px] tracking-[1.5px] font-bold" style={{ color: "#1a1a1a" }}>
              {offer.discount}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Title */}
        <h3
          className="font-playfair text-lg font-bold text-cream mb-2 group-hover:text-gold transition-colors leading-snug"
        >
          {offer.title}
        </h3>

        {/* Description */}
        {offer.description && (
          <p className="font-lora text-xs text-cream/60 leading-relaxed mb-3 flex-1">
            {offer.description}
          </p>
        )}

        {/* Expiry */}
        {offer.expiry_date && (
          <div className="flex items-center gap-1.5 mb-4">
            <Clock size={10} className="text-gold/40 shrink-0" />
            <span className="font-cinzel text-[8px] tracking-[1px] text-cream/35 uppercase">
              Valid till{" "}
              {new Date(offer.expiry_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* CTA — always shown */}
        <Link
          href="/booking"
          className="flex items-center justify-center gap-2 mt-auto py-2.5 px-4 rounded-sm font-cinzel text-[9px] tracking-[2px] uppercase transition-all"
          style={{
            background: "rgba(201,168,76,0.12)",
            border: "1px solid rgba(201,168,76,0.3)",
            color: "#C9A84C",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#C9A84C";
            e.currentTarget.style.color = "#1a1a1a";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(201,168,76,0.12)";
            e.currentTarget.style.color = "#C9A84C";
          }}
        >
          Book Now <ArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}
