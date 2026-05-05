"use client";
import { useState, useEffect } from "react";
import { coursesAPI, paymentsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Lock, PlayCircle, Clock, BookOpen, Loader, CheckCircle, Tag } from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("ss_user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      // Load enrolled courses
      import("@/lib/api").then(({ usersAPI }) =>
        usersAPI.myCourses().then(r => setEnrolledIds((r.data||[]).map(c => c.id))).catch(() => {})
      );
    }
    coursesAPI.list()
      .then(r => setCourses(r.data||[]))
      .catch(() => toast.error("Failed to load courses"))
      .finally(() => setLoading(false));
  }, []);

  const handleBuyRazorpay = async (course) => {
    if (!user) { toast.error("Please login to purchase"); return; }
    // Create a dummy booking-less payment for course (simplified)
    toast("Razorpay integration: load SDK and open checkout with course price", { icon: "ℹ️" });
  };

  const handleAccessCourse = async (course) => {
    if (!user) { toast.error("Please login first"); return; }
    try {
      const { data } = await coursesAPI.access(course.id);
      toast.success(`Welcome to: ${data.title}`);
      if (data.video_url) window.open(data.video_url, "_blank");
    } catch (e) {
      toast.error(e.response?.data?.error || "Purchase required to access this course");
    }
  };

  const TAG_COLORS = { BESTSELLER: "#C9A84C", NEW: "#2E7D32", POPULAR: "#8B4513" };

  return (
    <div className="min-h-screen pt-[70px]">
      {/* Header */}
      <div className="py-20 px-6 text-center bg-gradient-to-b from-[#1a1a1a] to-[#161616] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <div className="section-label justify-center">
            <span className="gold-line" /><span>Learn From The Best</span><span className="gold-line" />
          </div>
          <h1 className="font-playfair text-[clamp(32px,5vw,60px)] font-bold text-cream mb-4">
            Professional <em className="text-gold not-italic">Courses</em>
          </h1>
          <p className="font-lora text-muted max-w-lg mx-auto leading-relaxed">
            Master the art of hair styling, grooming, and beauty with our expert-led courses. Transform your passion into a career.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="flex justify-center py-24"><Loader size={32} className="text-gold animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => {
              const isEnrolled = enrolledIds.includes(course.id);
              return (
                <div key={course.id} className="glass-card rounded-sm overflow-hidden group hover:border-gold/30 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-[#2C1810] to-[#3d2010] flex items-center justify-center overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }}
                      />
                    ) : (
                      <span className="text-7xl opacity-40">{course.tag === "BESTSELLER" ? "✂️" : course.tag === "NEW" ? "🎨" : "🪒"}</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
                    {course.tag && (
                      <div className="absolute top-4 left-4">
                        <span className="badge text-white text-[9px] px-3 py-1" style={{ background: TAG_COLORS[course.tag] || "#C9A84C" }}>
                          {course.tag}
                        </span>
                      </div>
                    )}
                    {isEnrolled && (
                      <div className="absolute top-4 right-4 bg-green-700/90 rounded-full p-1">
                        <CheckCircle size={16} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="font-playfair text-xl font-bold text-white leading-tight">{course.title}</div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <p className="font-lora text-sm text-muted leading-relaxed mb-4 flex-1">{course.description}</p>

                    <div className="flex items-center gap-5 mb-6">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-muted" />
                        <span className="font-cinzel text-[9px] tracking-widest text-muted">{course.duration_hrs}H</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={13} className="text-muted" />
                        <span className="font-cinzel text-[9px] tracking-widest text-muted">{course.lesson_count} LESSONS</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      {course.offer_price ? (
                        <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                          <span className="font-playfair text-2xl font-bold text-gold">₹{course.offer_price}</span>
                          <span className="font-lora text-sm text-muted line-through">₹{course.price}</span>
                          <span className="badge badge-gold" style={{ fontSize:"8px" }}>OFFER</span>
                        </div>
                      ) : (
                        <span className="font-playfair text-2xl font-bold text-gold">₹{course.price}</span>
                      )}
                      <span className="font-cinzel text-[9px] tracking-widest text-muted">ONE-TIME</span>
                    </div>

                    {isEnrolled ? (
                      <button onClick={() => handleAccessCourse(course)} className="btn-gold !py-3 flex items-center justify-center gap-2 !text-[10px]">
                        <PlayCircle size={15} /> Continue Learning
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleBuyRazorpay(course)} className="btn-gold !py-3 flex items-center justify-center gap-2 !text-[10px]">
                          <Lock size={13} /> Enroll — ₹{course.offer_price || course.price}
                        </button>
                        <p className="font-lora text-[11px] text-muted text-center">
                          Secure payment via UPI / Card
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "🎓", title: "Industry-Certified", desc: "Receive a certificate upon course completion recognised by top salons." },
            { icon: "🕐", title: "Learn at Your Pace", desc: "Lifetime access to all course content — revisit any lesson anytime." },
            { icon: "💬", title: "Expert Mentorship", desc: "Direct Q&A sessions with our master stylists and trainers." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass-card p-6 text-center rounded-sm">
              <div className="text-3xl mb-3">{icon}</div>
              <h4 className="font-cinzel text-[12px] tracking-[2px] text-cream mb-2 uppercase">{title}</h4>
              <p className="font-lora text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
