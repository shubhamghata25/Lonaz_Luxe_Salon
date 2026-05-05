"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired")) toast.error("Session expired. Please login again.");
    }
  }, []);
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error("Email and password required");
    if (mode === "register" && !form.name) return toast.error("Name required");
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        const res = await authAPI.login({ email: form.email, password: form.password });
        data = res.data;
      } else {
        const res = await authAPI.register(form);
        data = res.data;
      }
      localStorage.setItem("ss_token", data.token);
      localStorage.setItem("ss_user", JSON.stringify(data.user));
      toast.success(`Welcome${data.user.name ? ", " + data.user.name : ""}!`);
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-[70px] flex items-center justify-center px-6 bg-gradient-to-br from-charcoal via-[#1a1a1a] to-[#2C1810]/20">
      <div className="glass-card p-10 max-w-md w-full rounded-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-cinzel text-2xl font-bold text-gold tracking-[5px]">SMART</div>
          <div className="font-cinzel text-[9px] tracking-[8px] text-muted mb-6">SALON</div>
          <h2 className="font-playfair text-2xl text-cream">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="font-lora text-sm text-muted mt-1">
            {mode === "login" ? "Sign in to manage your bookings" : "Join SmartSalon today"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex border border-gold/15 rounded-sm overflow-hidden mb-8">
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 font-cinzel text-[10px] tracking-[2px] uppercase transition-all ${
                mode === m ? "bg-gold text-charcoal" : "text-muted hover:text-cream"
              }`}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">FULL NAME *</label>
              <input className="salon-input" placeholder="Your name" value={form.name}
                onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            </div>
          )}
          <div>
            <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">EMAIL ADDRESS *</label>
            <input className="salon-input" type="email" placeholder="email@example.com" value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          {mode === "register" && (
            <div>
              <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">PHONE NUMBER</label>
              <input className="salon-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone}
                onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
            </div>
          )}
          <div>
            <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">PASSWORD *</label>
            <div className="relative">
              <input className="salon-input !pr-12" type={showPass ? "text" : "password"}
                placeholder={mode === "register" ? "Min 6 characters" : "Your password"}
                value={form.password}
                onChange={e => setForm(p => ({...p, password: e.target.value}))}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-cream">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-gold w-full mt-6 flex items-center justify-center gap-2">
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        {mode === "login" && (
          <p className="font-lora text-xs text-muted text-center mt-4">
            Admin? Use your admin credentials to access the dashboard.
          </p>
        )}

        <div className="mt-6 text-center">
          <span className="font-lora text-sm text-muted">
            {mode === "login" ? "New here? " : "Already have an account? "}
          </span>
          <button onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-cinzel text-[10px] tracking-[2px] text-gold hover:text-gold-light">
            {mode === "login" ? "CREATE ACCOUNT" : "SIGN IN"}
          </button>
        </div>
      </div>
    </div>
  );
}
