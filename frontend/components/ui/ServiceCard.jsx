"use client";
/**
 * FILE: frontend/components/ui/ServiceCard.jsx
 * FIX #1: Added onError handler on <img> so a broken/missing Cloudinary URL
 *         degrades to the emoji icon instead of showing a broken-image icon.
 */
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";

export default function ServiceCard({ service, onClick }) {
  const content = (
    <div
      onClick={onClick}
      className="luxury-card rounded-sm overflow-hidden group cursor-pointer"
    >
      {service.image_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => {
              // Hide broken Cloudinary image; show emoji row below
              e.currentTarget.closest(".relative").style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 to-transparent" />
          <div className="absolute bottom-3 left-4">
            <span className="font-cinzel text-[9px] tracking-[2px] text-gold uppercase">
              {service.category_name || service.category}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-5">
        {/* Emoji row shown when no image_url OR when image fails to load */}
        {(!service.image_url) && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{service.icon || "✂️"}</span>
            {service.category_name && (
              <span className="badge badge-muted text-[8px]">{service.category_name}</span>
            )}
          </div>
        )}

        <div className="flex justify-between items-start mb-2">
          <h3 className="font-playfair text-base sm:text-lg text-cream group-hover:text-gold transition-colors font-semibold">
            {service.name}
          </h3>
          <span className="font-playfair text-base font-bold text-gold ml-2 shrink-0">
            ₹{parseFloat(service.price || 0).toFixed(0)}
          </span>
        </div>

        {service.slot_duration || service.duration ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={11} className="text-gold/50" />
            <span className="font-cinzel text-[9px] tracking-widest text-cream/40">
              {service.slot_duration || service.duration} MIN
            </span>
          </div>
        ) : null}

        {service.description && (
          <p className="font-lora text-xs text-cream/55 leading-relaxed mb-3 line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="flex items-center gap-1 text-gold/60 group-hover:text-gold transition-colors">
          <span className="font-cinzel text-[9px] tracking-[2px] uppercase">View Options</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );

  return onClick ? content : (
    <Link href={`/booking?service=${service.id}`}>{content}</Link>
  );
}
