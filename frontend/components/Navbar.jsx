"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { settingsAPI } from "@/lib/api";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser]     = useState(null);
  const [settings, setSettings] = useState({ salon_name: "Lonaz Luxe Salon", logo_url: "" });
  const pathname = usePathname();

  useEffect(() => {
    const u = localStorage.getItem("ss_user");
    if (u) setUser(JSON.parse(u));
    settingsAPI.get().then(r => setSettings(r.data||[])).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
    setUser(null);
    window.location.href = "/";
  };

  const links = [
    { href: "/",              label: "Home" },
    { href: "/services-menu", label: "Services" },
    { href: "/booking",       label: "Book Now" },
    { href: "/courses",       label: "Courses" },
    { href: "/careers",       label: "Careers" },
    { href: "/contact",       label: "Contact" },
  ];

  const isActive = (href) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const salonName = settings.salon_name || "Lonaz Luxe Salon";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-forest-dark/98 shadow-xl shadow-black/40"
        : "bg-forest-dark/90"
    } backdrop-blur-xl border-b border-gold/10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-[70px]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={salonName}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <div className="flex flex-col leading-none">
              <span className="font-cinzel text-base sm:text-lg font-bold text-gold tracking-[4px] group-hover:text-gold-light transition-colors">
                LONAZ LUXE
              </span>
              <span className="font-cinzel text-[7px] tracking-[5px] text-gold/50 uppercase">SALON</span>
            </div>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`font-cinzel text-[10px] xl:text-[11px] tracking-[2px] uppercase transition-all duration-200
                ${href === "/booking"
                  ? "btn-gold !py-2 !px-4 !text-[9px] xl:!text-[10px] hover:!text-white"
                  : isActive(href)
                  ? "text-gold border-b border-gold pb-0.5"
                  : "text-cream/70 hover:text-gold"
                }`}>
              {label}
            </Link>
          ))}
        </div>

        {/* Auth — desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="font-cinzel text-[9px] tracking-widest text-gold/60 hidden xl:block truncate max-w-[120px]">
                {user.name}
              </span>
              {user.role === "admin" ? (
                <Link href="/admin" className="btn-outline !py-1.5 !px-3 !text-[9px] flex items-center gap-1">
                  <Shield size={11} /> Admin
                </Link>
              ) : (
                <Link href="/dashboard" className="btn-outline !py-1.5 !px-3 !text-[9px] flex items-center gap-1">
                  <LayoutDashboard size={11} /> Dashboard
                </Link>
              )}
              <button onClick={logout} className="text-gold/50 hover:text-red-400 transition-colors p-1">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-outline !py-2 !px-4 !text-[9px] flex items-center gap-1.5">
              <User size={12} /> Login
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="lg:hidden text-cream p-1" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-forest-dark border-t border-gold/10 px-5 py-6 flex flex-col gap-4">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`font-cinzel text-[11px] tracking-[3px] uppercase py-1.5 ${
                isActive(href) ? "text-gold" : "text-cream/70"
              }`}>
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gold/10">
            {user ? (
              <div className="flex flex-col gap-3">
                <span className="font-cinzel text-[9px] text-gold/60">{user.name}</span>
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="btn-outline !py-2 !px-4 !text-[10px] w-fit">
                  {user.role === "admin" ? "Admin Panel" : "My Dashboard"}
                </Link>
                <button onClick={logout} className="text-left font-cinzel text-[9px] tracking-widest text-gold/50">LOGOUT</button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}
                className="btn-gold !py-3 !text-[10px] w-full text-center block">
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
