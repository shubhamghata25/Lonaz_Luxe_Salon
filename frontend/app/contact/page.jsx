"use client";
import { useState } from "react";
import { contactsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { MapPin, Phone, Mail, MessageCircle, Loader, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return toast.error("Name, email and message required");
    setSubmitting(true);
    try {
      await contactsAPI.send(form);
      setSent(true);
      toast.success("Message sent! We'll be in touch soon.");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919096863511";

  return (
    <div className="min-h-screen pt-[70px]">
      {/* Header */}
      <div className="py-20 px-6 text-center bg-gradient-to-b from-[#1a1a1a] to-[#161616] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <div className="section-label justify-center">
            <span className="gold-line" /><span>Get In Touch</span><span className="gold-line" />
          </div>
          <h1 className="font-playfair text-[clamp(32px,5vw,60px)] font-bold text-cream mb-4">
            <em className="text-gold not-italic">Contact</em> Us
          </h1>
          <p className="font-lora text-muted max-w-md mx-auto">
            We'd love to hear from you. Reach out for inquiries, bookings, or just to say hello.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-playfair text-2xl text-cream mb-6">Find Us</h3>
              <div className="space-y-5">
                {[
                  { icon: <MapPin size={18} className="text-gold mt-0.5" />, title: "Address", content: "Ayra realties building, near white house, near Taj Tayers, Dabha, Vayusena Nagar, Nagpur, Maharashtra 440023" },
                  { icon: <Phone size={18} className="text-gold" />, title: "Phone", content: "+91 90968 63511", href: "tel:+919096863511" },
                  { icon: <Mail size={18} className="text-gold" />, title: "Email", content: "hello@lonazluxe.in", href: "mailto:hello@lonazluxe.in" },
                ].map(({ icon, title, content, href }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">{icon}</div>
                    <div>
                      <div className="font-cinzel text-[10px] tracking-[2px] text-muted mb-1">{title}</div>
                      {href ? (
                        <a href={href} className="font-lora text-sm text-cream hover:text-gold transition-colors">{content}</a>
                      ) : (
                        <p className="font-lora text-sm text-cream whitespace-pre-line">{content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="glass-card p-6 rounded-sm">
              <h4 className="font-cinzel text-[11px] tracking-[3px] text-gold mb-4 uppercase">Opening Hours</h4>
              <div className="space-y-2">
                {[
                  ["Monday – Friday", "10:00 AM – 9:00 PM"],
                  ["Saturday", "10:00 AM – 9:00 PM"],
                  ["Sunday", "10:00 AM – 9:00 PM"],
                ].map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="font-lora text-sm text-muted">{day}</span>
                    <span className="font-lora text-sm text-cream">{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${whatsapp}?text=Hi%20Lonaz%20Luxe%20Salon%2C%20I%27d%20like%20to%20enquire%20about%20your%20services.`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-5 border border-green-700/30 rounded-sm bg-green-900/10 hover:bg-green-900/20 transition-colors group"
            >
              <MessageCircle size={22} className="text-green-400 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-cinzel text-[11px] tracking-[2px] text-cream">WHATSAPP US</div>
                <div className="font-lora text-xs text-muted">Quick replies, Mon–Sat</div>
              </div>
            </a>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="glass-card p-12 rounded-sm text-center h-full flex flex-col items-center justify-center">
                <CheckCircle size={56} className="text-gold mb-4" />
                <h3 className="font-playfair text-2xl text-cream mb-2">Message Sent!</h3>
                <p className="font-lora text-muted">We'll get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                  className="btn-outline !py-2 !px-8 mt-6 !text-[10px]">
                  Send Another
                </button>
              </div>
            ) : (
              <div className="glass-card p-8 rounded-sm">
                <h3 className="font-playfair text-2xl text-cream mb-6">Send A Message</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">YOUR NAME *</label>
                    <input className="salon-input" placeholder="Full name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">EMAIL *</label>
                    <input className="salon-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                  </div>
                  <div>
                    <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">PHONE</label>
                    <input className="salon-input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
                  </div>
                  <div>
                    <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">SUBJECT</label>
                    <input className="salon-input" placeholder="How can we help?" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} />
                  </div>
                </div>
                <div className="mb-6">
                  <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">MESSAGE *</label>
                  <textarea className="salon-input" rows={6} placeholder="Your message here..." value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} />
                </div>
                <button onClick={handleSubmit} disabled={submitting} className="btn-gold w-full flex items-center justify-center gap-2">
                  {submitting ? <Loader size={16} className="animate-spin" /> : null}
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Map — Google Maps embed (set NEXT_PUBLIC_MAPS_EMBED_URL in Vercel env vars) */}
        <div className="mt-12 rounded-sm overflow-hidden"
          style={{ height: "clamp(280px, 40vw, 420px)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.138!2d79.01528!3d21.16441!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd4ebddc8468447%3A0xb44664c2abd0a3e3!2sLonaz%20Luxe%20Salon!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Salon Location Map"
          />
        </div>
      </div>
    </div>
  );
}
