"use client";
import { useState, useEffect } from "react";
import { careersAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Briefcase, Clock, DollarSign, Upload, CheckCircle, Loader, X } from "lucide-react";

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyFor, setApplyFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resume, setResume] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", cover_letter: "" });

  useEffect(() => {
    careersAPI.jobs()
      .then(r => setJobs(r.data||[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async () => {
    if (!form.name || !form.email) return toast.error("Name and email required");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("job_title", applyFor.title);
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("experience", form.experience);
      fd.append("cover_letter", form.cover_letter);
      if (resume) fd.append("resume", resume);
      await careersAPI.apply(fd);
      setSubmitted(true);
      setApplyFor(null);
      toast.success("Application submitted!");
    } catch (e) {
      toast.error(e.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-[70px]">
      {/* Header */}
      <div className="py-20 px-6 text-center bg-gradient-to-b from-[#1a1a1a] to-[#161616] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <div className="section-label justify-center">
            <span className="gold-line" /><span>Join Our Team</span><span className="gold-line" />
          </div>
          <h1 className="font-playfair text-[clamp(32px,5vw,60px)] font-bold text-cream mb-4">
            Build Your <em className="text-gold not-italic">Career</em>
          </h1>
          <p className="font-lora text-muted max-w-lg mx-auto">
            We're always looking for passionate, skilled individuals who share our love for the craft and commitment to excellence.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {submitted && (
          <div className="glass-card p-6 rounded-sm flex items-center gap-4 mb-8 border-green-700/30">
            <CheckCircle size={24} className="text-green-400 shrink-0" />
            <div>
              <div className="font-cinzel text-[12px] tracking-widest text-cream mb-1">APPLICATION RECEIVED</div>
              <p className="font-lora text-sm text-muted">We'll review your application and get back to you within 3–5 business days.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24"><Loader size={32} className="text-gold animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="glass-card p-7 rounded-sm hover:border-gold/25 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-playfair text-xl text-cream mb-2">{job.title}</h3>
                    <p className="font-lora text-sm text-muted mb-3 leading-relaxed">{job.desc}</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Briefcase size={13} className="text-gold" />
                        <span className="font-cinzel text-[10px] tracking-widest text-muted">{job.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-gold" />
                        <span className="font-cinzel text-[10px] tracking-widest text-muted">{job.experience}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={13} className="text-gold" />
                        <span className="font-cinzel text-[10px] tracking-widest text-muted">{job.salary}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setApplyFor(job)} className="btn-gold !py-3 !px-7 !text-[10px] shrink-0">
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Culture */}
        <div className="mt-16 glass-card p-8 rounded-sm">
          <h3 className="font-playfair text-2xl text-cream mb-6">Why Work With Us?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["💼", "Competitive Salaries", "Industry-leading pay with performance incentives"],
              ["📚", "Continuous Training", "Regular workshops and skill development programs"],
              ["🏥", "Health Benefits", "Medical insurance for all full-time employees"],
              ["✨", "Creative Freedom", "Express your artistry in a supportive environment"],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <div className="font-cinzel text-[11px] tracking-[2px] text-cream mb-1">{title}</div>
                  <div className="font-lora text-sm text-muted">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {applyFor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-gold/20 rounded-sm p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-playfair text-2xl text-cream">Apply For</h3>
                <p className="font-cinzel text-[12px] tracking-widest text-gold">{applyFor.title}</p>
              </div>
              <button onClick={() => setApplyFor(null)} className="text-muted hover:text-cream">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "FULL NAME *", key: "name", type: "text", placeholder: "Your full name" },
                { label: "EMAIL *", key: "email", type: "email", placeholder: "email@example.com" },
                { label: "PHONE", key: "phone", type: "tel", placeholder: "+91 XXXXX XXXXX" },
                { label: "YEARS OF EXPERIENCE", key: "experience", type: "text", placeholder: "e.g. 3 years" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">{label}</label>
                  <input className="salon-input" type={type} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">COVER LETTER</label>
                <textarea className="salon-input" rows={4} placeholder="Tell us why you'd be a great fit..."
                  value={form.cover_letter} onChange={e => setForm(p => ({...p, cover_letter: e.target.value}))} />
              </div>
              <div>
                <label className="font-cinzel text-[10px] tracking-[2px] text-muted mb-2 block">RESUME (PDF/JPG)</label>
                <label className="flex items-center gap-3 cursor-pointer border border-gold/20 border-dashed rounded-sm p-4 hover:border-gold/40 transition-colors">
                  <Upload size={18} className="text-gold" />
                  <span className="font-lora text-sm text-muted">{resume ? resume.name : "Click to upload resume"}</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setResume(e.target.files[0])} />
                </label>
              </div>
              <button onClick={handleApply} disabled={submitting} className="btn-gold w-full flex items-center justify-center gap-2 mt-2">
                {submitting ? <Loader size={16} className="animate-spin" /> : null}
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
