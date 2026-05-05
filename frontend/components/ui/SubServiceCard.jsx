"use client";
/**
 * FILE: frontend/components/ui/SubServiceCard.jsx
 * FIX #1: onError hides broken Cloudinary image gracefully.
 * FIX #5: Shows discount_price with strikethrough original when available.
 */
import Link from "next/link";
import { Clock, Tag } from "lucide-react";

export default function SubServiceCard({ subService, showBookBtn = true }) {
  const original   = parseFloat(subService.price || 0);
  const discounted = subService.discount_price ? parseFloat(subService.discount_price) : null;
  const hasOffer   = discounted && discounted < original;

  return (
    <div className="luxury-card rounded-sm overflow-hidden group">
      {subService.image_url ? (
        <div className="relative h-36 overflow-hidden">
          <img
            src={subService.image_url}
            alt={subService.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => {
              // Hide the whole image container on error
              e.currentTarget.closest(".relative").style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 to-transparent" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h4 className="font-playfair text-sm sm:text-base text-cream group-hover:text-gold transition-colors font-semibold">
            {subService.name}
          </h4>
          {/* FIX #5: exact price at sub-service level */}
          <div className="text-right shrink-0">
            {hasOffer ? (
              <>
                <div className="font-playfair text-base font-bold text-gold">
                  ₹{discounted.toFixed(0)}
                </div>
                <div className="font-lora text-[10px] text-muted line-through">
                  ₹{original.toFixed(0)}
                </div>
              </>
            ) : (
              <span className="font-playfair text-base font-bold text-gold ml-2">
                ₹{original.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        {hasOffer && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={9} className="text-green-400" />
            <span className="font-cinzel text-[8px] tracking-[1px] text-green-400">DISCOUNT APPLIED</span>
          </div>
        )}

        {subService.duration && (
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={10} className="text-gold/50" />
            <span className="font-cinzel text-[9px] tracking-widest text-cream/40">
              {subService.duration} MIN
            </span>
          </div>
        )}

        {subService.description && (
          <p className="font-lora text-xs text-cream/55 leading-relaxed mb-3">
            {subService.description}
          </p>
        )}

        {showBookBtn && (
          <Link
            href={`/booking?service=${subService.service_id}&sub=${subService.id}`}
            className="btn-gold !py-2 !px-4 !text-[9px] w-full text-center block"
          >
            Book Now
          </Link>
        )}
      </div>
    </div>
  );
}
