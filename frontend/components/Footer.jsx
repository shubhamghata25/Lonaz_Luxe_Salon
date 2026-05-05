"use client";
/**
 * FILE: frontend/components/Footer.jsx  [v4]
 * - "Services" Quick Link → /services (the full services page)
 * - Service name list items → link to /services with anchor
 * - Settings loaded without caching
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Instagram, MessageCircle } from "lucide-react";
import { settingsAPI } from "@/lib/api";

export default function Footer() {
  const [settings, setSettings] = useState({
    salon_name:      "Lonaz Luxe Salon",
    footer_tagline:  "Where Beauty Meets Luxury",
    footer_address:  "📍Nagpur, Dabha chowk - 440023",
    footer_phone:    "+91 90968 63511",
    footer_email:    "hello@lonazluxe.in",
    instagram_url:   "https://www.instagram.com/lonaznagpur",
    whatsapp_number: "919096863511",
  });

  useEffect(() => {
    settingsAPI.get()
      .then(r => setSettings(s => ({ ...s, ...r.data })))
      .catch(() => {});
  }, []);

  const whatsapp = settings.whatsapp_number || "919876543210";

  const SERVICE_LINKS = [
    "Signature Haircut",
    "Beard Sculpting",
    "Hair Coloring",
    "Luxury Facial",
    "Hair Spa",
    "Bridal Package",
  ];

  return (
    <footer className="bg-forest-dark border-t border-gold/10 pt-14 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="font-cinzel text-xl font-bold text-gold tracking-[4px] mb-1">
              {(settings.salon_name || "Lonaz Luxe").toUpperCase()}
            </div>
            <div className="font-cinzel text-[7px] tracking-[6px] text-gold/40 mb-4">SALON</div>
            <p className="font-lora text-sm text-cream/55 leading-relaxed mb-5">
              {settings.footer_tagline || "Where Beauty Meets Luxury"}
            </p>
            <div className="flex gap-4">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"
                className="text-gold/40 hover:text-green-400 transition-colors hover-glow p-1">
                <MessageCircle size={18} />
              </a>
              <a href={settings.instagram_url || "#"} target="_blank" rel="noreferrer"
                className="text-gold/40 hover:text-pink-400 transition-colors hover-glow p-1">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links — Services links to /services page */}
          <div>
            <h4 className="font-cinzel text-[10px] tracking-[3px] text-gold mb-5 uppercase">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              {[
                ["Home",             "/"],
                ["Services",         "/services"],
                ["Book Appointment", "/booking"],
                ["Courses",          "/courses"],
                ["Careers",          "/careers"],
              ].map(([label, href]) => (
                <Link key={href} href={href}
                  className="font-lora text-sm text-cream/50 hover:text-gold transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Services — each links to services page */}
          <div>
            <h4 className="font-cinzel text-[10px] tracking-[3px] text-gold mb-5 uppercase">Services</h4>
            <div className="flex flex-col gap-2.5">
              {SERVICE_LINKS.map(s => (
                <Link
                  key={s}
                  href="/services"
                  className="font-lora text-sm text-cream/50 hover:text-gold transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-cinzel text-[10px] tracking-[3px] text-gold mb-5 uppercase">Contact</h4>
            <div className="flex flex-col gap-4">
              {[
                { icon: <MapPin size={14} className="mt-0.5 shrink-0 text-gold" />, content: settings.footer_address, href: null },
                { icon: <Phone size={14} className="shrink-0 text-gold" />, content: settings.footer_phone, href: `tel:${settings.footer_phone}` },
                { icon: <Mail size={14} className="shrink-0 text-gold" />, content: settings.footer_email, href: `mailto:${settings.footer_email}` },
              ].map(({ icon, content, href }) => (
                <div key={content} className="flex items-start gap-3">
                  {icon}
                  {href ? (
                    <a href={href} className="font-lora text-sm text-cream/50 hover:text-gold transition-colors leading-relaxed">{content}</a>
                  ) : (
                    <p className="font-lora text-sm text-cream/50 leading-relaxed">{content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gold/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-cinzel text-[9px] tracking-[2px] text-gold/30 uppercase">
            © {new Date().getFullYear()} {settings.salon_name || "Lonaz Luxe Salon"}. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Privacy","Terms"].map(l => (
              <Link key={l} href={`/${l.toLowerCase()}`}
                className="font-cinzel text-[8px] tracking-[2px] text-gold/30 hover:text-gold transition-colors uppercase">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
