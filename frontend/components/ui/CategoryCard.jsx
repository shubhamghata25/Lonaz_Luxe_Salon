"use client";
/**
 * FILE: frontend/components/ui/CategoryCard.jsx
 *
 * FIX #1: Added onError fallback for broken Cloudinary images.
 * FIX #5: Accept optional `priceRange` prop and display it on the card.
 *         The parent (services-menu) computes min–max from its services list
 *         and passes it down, so no extra API call is needed.
 */
export default function CategoryCard({ category, onClick, active, priceRange }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-sm transition-all duration-300 w-full
        ${active
          ? "border-2 border-gold shadow-gold-glow"
          : "border border-gold/20 hover:border-gold/50 hover:shadow-gold-glow"
        }`}
      style={{ background: active ? "rgba(201,168,76,0.08)" : "rgba(15,59,47,0.6)" }}
    >
      {/* Image */}
      {category.image_url ? (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img
            src={category.image_url}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => {
              // Hide broken image container; emoji placeholder below becomes visible
              e.currentTarget.closest(".relative").style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/80 to-transparent" />
        </div>
      ) : (
        <div
          className="h-24 sm:h-32 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(15,59,47,0.8), rgba(10,42,33,0.9))" }}
        >
          <span style={{ fontSize: 40 }}>✂️</span>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-cinzel text-[12px] sm:text-[13px] tracking-[3px] uppercase text-cream group-hover:text-gold transition-colors">
          {category.name}
        </h3>

        {/* FIX #5: price range passed in from parent */}
        {priceRange && (
          <p className="font-playfair text-[11px] text-gold/70 mt-1">{priceRange}</p>
        )}

        {!priceRange && category.description && (
          <p className="font-lora text-xs text-cream/50 mt-1 leading-relaxed line-clamp-2">
            {category.description}
          </p>
        )}
      </div>

      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-gradient" />
      )}
    </button>
  );
}
