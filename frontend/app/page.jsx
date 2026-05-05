"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { servicesAPI, offersAPI, videosAPI, categoriesAPI, settingsAPI } from "@/lib/api";
import OfferSection from "@/components/sections/OfferSection";
import VideoSection from "@/components/sections/VideoSection";
import CategoryCard from "@/components/ui/CategoryCard";
import { ArrowRight, Star, Clock, Award, Scissors } from "lucide-react";

const TESTIMONIALS = [
  { name: "Priya Sharma",  role: "Regular Customer", av: "PS", text: "Lonaz Luxe transformed my look completely. The stylists are true artists who delivered beyond expectations." },
  { name: "Rohan Mehta",   role: "Monthly Member",   av: "RM", text: "Best beard sculpting in the city. The hot towel ritual is worth every rupee — I won't go anywhere else." },
  { name: "Ananya Iyer",   role: "Bridal Customer",  av: "AI", text: "My bridal package was absolutely flawless. Every detail was perfect. I cried happy tears in the mirror." },
  { name: "Karan Patel",   role: "Walk-in",          av: "KP", text: "Walked in on a whim, walked out a new person. The coloring is stunning and worth every penny." },
];

export default function HomePage() {
  const heroRef  = useRef(null);
  const aboutRef = useRef(null);

  const [services,   setServices]   = useState([]);
  const [offers,     setOffers]     = useState([]);
  const [videos,     setVideos]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [salonName,  setSalonName]  = useState("Lonaz Luxe Salon");
  const [settings,   setSettings]   = useState({});
  const [heroMedia,  setHeroMedia]  = useState(null); // { type: 'image'|'video', url: '...' }

  useEffect(() => {
    servicesAPI.list().then(r => setServices((r.data||[]).slice(0, 6))).catch(() => {});
    offersAPI.list().then(r => setOffers(r.data||[])).catch(() => {});
    videosAPI.list().then(r => setVideos(r.data||[])).catch(() => {});
    categoriesAPI.list().then(r => setCategories(r.data||[])).catch(() => {});
    settingsAPI.get().then(r => {
      const d = r.data || {};
      setSettings(d);
      if (d.salon_name) setSalonName(d.salon_name);
      // Try settings keys first (fast path)
      if (d.hero_media_url) {
        setHeroMedia({ url: d.hero_media_url, type: d.hero_media_type || "image" });
      } else {
        // Fallback: query hero_media table directly (covers case where
        // settings key is empty but hero_media row exists)
        settingsAPI.getHeroMedia().then(hRes => {
          if (hRes.data?.url) {
            setHeroMedia({ url: hRes.data.url, type: hRes.data.type || "image" });
          }
        }).catch(() => {});
      }
    }).catch(() => {
      // Settings failed entirely — still try hero_media table
      settingsAPI.getHeroMedia().then(hRes => {
        if (hRes.data?.url) {
          setHeroMedia({ url: hRes.data.url, type: hRes.data.type || "image" });
        }
      }).catch(() => {});
    });
  }, []);

  /* ── HERO CANVAS — only shown when no admin media ────────────────────────── */
  useEffect(() => {
    if (heroMedia?.url) return; // skip canvas if media exists
    const canvas = heroRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || 1200;
      canvas.height = canvas.offsetHeight || 680;
    };
    resize();
    window.addEventListener("resize", resize);

    const strands = Array.from({ length: 80 }, () => ({
      x: Math.random() * 1400, y: Math.random() * 700,
      len: 60 + Math.random() * 130, speed: 0.2 + Math.random() * 0.4,
      opacity: 0.015 + Math.random() * 0.04,
      color: Math.random() > 0.6 ? "#C9A84C" : "#1a5240",
      width: 0.4 + Math.random() * 1.5,
      curve: (Math.random() - 0.5) * 28,
    }));

    const drawScissors = (x, y, size, angle, alpha) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.globalAlpha = alpha; ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 0.8; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.lineTo(-size*.7,-size);
      ctx.moveTo(0,0); ctx.lineTo(size*.7,-size);
      ctx.moveTo(0,0); ctx.lineTo(-size*.4,size*.8);
      ctx.moveTo(0,0); ctx.lineTo(size*.4,size*.8);
      ctx.arc(-size*.55,-size*.7,size*.12,0,Math.PI*2);
      ctx.arc(size*.55,-size*.7,size*.12,0,Math.PI*2);
      ctx.stroke(); ctx.restore();
    };

    const frame = () => {
      t++;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = "#0a2a21"; ctx.fillRect(0,0,W,H);

      const g1 = ctx.createRadialGradient(W*.35,H*.45,0,W*.35,H*.45,W*.6);
      g1.addColorStop(0, "rgba(15,59,47,.6)"); g1.addColorStop(1, "rgba(10,42,33,0)");
      ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);

      strands.forEach(s => {
        s.y += s.speed;
        if (s.y > H + s.len) s.y = -s.len;
        ctx.save(); ctx.globalAlpha = s.opacity; ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width; ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + s.curve, s.y + s.len/2, s.x - s.curve*.5, s.y + s.len);
        ctx.stroke(); ctx.restore();
      });

      [{xr:.15,yr:.28,sz:14,sp:.003,al:.10},{xr:.78,yr:.18,sz:22,sp:.002,al:.07},
       {xr:.88,yr:.72,sz:11,sp:.004,al:.08},{xr:.10,yr:.78,sz:18,sp:.0025,al:.06}
      ].forEach((sp,i) => drawScissors(sp.xr*W, sp.yr*H, sp.sz, Math.sin(t*sp.sp+i)*.3, sp.al));

      animId = requestAnimationFrame(frame);
    };
    frame();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [heroMedia]);

  /* ── ABOUT CANVAS ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = aboutRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, at = 0;
    const resize = () => { canvas.width = canvas.offsetWidth || 500; canvas.height = canvas.offsetHeight || 480; };
    resize();
    window.addEventListener("resize", resize);
    const dots = Array.from({length:32},()=>({ x:Math.random()*500, y:Math.random()*500, r:.5+Math.random()*2.2, phase:Math.random()*Math.PI*2, speed:.008+Math.random()*.018 }));
    const frame = () => {
      at+=.01; const W=canvas.width,H=canvas.height;
      ctx.clearRect(0,0,W,H); ctx.fillStyle="#061a12"; ctx.fillRect(0,0,W,H);
      const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.6);
      g.addColorStop(0,"rgba(201,168,76,.06)"); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      dots.forEach(d=>{
        const x=(d.x+Math.sin(at*d.speed+d.phase)*14)%W;
        const y=(d.y+Math.cos(at*d.speed+d.phase)*10)%H;
        ctx.save(); ctx.globalAlpha=.2+Math.sin(at*d.speed*2+d.phase)*.15;
        ctx.fillStyle="#C9A84C"; ctx.beginPath(); ctx.arc(x,y,d.r,0,Math.PI*2); ctx.fill(); ctx.restore();
      });
      ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(at*.18);
      ctx.globalAlpha=.12; ctx.strokeStyle="#C9A84C"; ctx.lineWidth=.9; ctx.lineCap="round";
      const s=30;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-s*.7,-s); ctx.moveTo(0,0); ctx.lineTo(s*.7,-s);
      ctx.moveTo(0,0); ctx.lineTo(-s*.4,s*.8); ctx.moveTo(0,0); ctx.lineTo(s*.4,s*.8);
      ctx.arc(-s*.55,-s*.7,s*.12,0,Math.PI*2); ctx.arc(s*.55,-s*.7,s*.12,0,Math.PI*2);
      ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha=.5; ctx.font="bold 58px 'Courier New',monospace";
      ctx.fillStyle="#C9A84C"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("LL",W/2,H/2+2); ctx.restore();
      animId=requestAnimationFrame(frame);
    };
    frame();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  /* ── COUNTER ANIMATION ───────────────────────────────────────────────────── */
  useEffect(() => {
    const countTo = (id, target, suffix, delay) => {
      setTimeout(() => {
        let cur = 0; const el = document.getElementById(id); if (!el) return;
        const inc = Math.ceil(target/60);
        const ti = setInterval(() => {
          cur = Math.min(cur+inc, target); el.textContent = cur.toLocaleString()+suffix;
          if (cur >= target) clearInterval(ti);
        }, 22);
      }, delay);
    };
    setTimeout(() => {
      countTo("cnt1",5000,"+",0); countTo("cnt2",15,"+",300); countTo("cnt3",8,"+",600);
    }, 600);
  }, []);

  /* ── CYCLING HEADLINE ────────────────────────────────────────────────────── */
  useEffect(() => {
    const words = ["Meets Craft","Defines You","Tells Your Story","Meets Craft"];
    let wi = 0;
    const el = document.getElementById("cycleWord"); if (!el) return;
    const iv = setInterval(() => {
      el.style.transition = "opacity .35s, transform .35s";
      el.style.opacity = "0"; el.style.transform = "translateY(-12px)";
      setTimeout(() => {
        wi=(wi+1)%words.length; el.textContent=words[wi];
        el.style.transform="translateY(12px)";
        setTimeout(()=>{ el.style.opacity="1"; el.style.transform="translateY(0)"; },40);
      },360);
    }, 3200);
    return ()=>clearInterval(iv);
  },[]);

  /* ── PARTICLES ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = document.getElementById("heroParticles"); if (!container) return;
    const spawn = () => {
      const p = document.createElement("div");
      p.style.cssText = `position:absolute;width:2px;height:2px;background:#C9A84C;border-radius:50%;left:${Math.random()*100}%;bottom:0;opacity:0;animation:particleDrift ${3+Math.random()*4}s ease-out forwards`;
      container.appendChild(p); setTimeout(()=>p.remove(),7500);
    };
    const iv = setInterval(spawn,900);
    return ()=>clearInterval(iv);
  },[]);

  const SERVICES_FB = [
    {id:"1",icon:"✂️",name:"Signature Haircut",price:599,duration:45,description:"Precision cut tailored to your face shape."},
    {id:"2",icon:"🪒",name:"Beard Sculpting",price:399,duration:30,description:"Expert shaping and hot-towel ritual."},
    {id:"3",icon:"🎨",name:"Hair Coloring",price:1499,duration:90,description:"Full color, highlights, balayage or ombré."},
    {id:"4",icon:"💆",name:"Luxury Facial",price:999,duration:60,description:"Deep cleanse and hydration ritual."},
    {id:"5",icon:"🌿",name:"Hair Spa",price:799,duration:60,description:"Scalp massage and deep conditioning."},
    {id:"6",icon:"👑",name:"Bridal Package",price:4999,duration:180,description:"Head-to-toe prep for your perfect day."},
  ];
  const displayServices = services.length > 0 ? services : SERVICES_FB;

  const TICKER = ["Signature Haircut","Beard Sculpting","Hair Coloring","Luxury Facial","Hair Spa","Bridal Package","Book Online · Free","4.9 Star Rating"];

  return (
    <>
      <style>{`
        @keyframes particleDrift{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.6}90%{opacity:.25}100%{transform:translateY(-130px) translateX(18px);opacity:0}}
        @keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulsing{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.4)}70%{box-shadow:0 0 0 12px rgba(201,168,76,0)}}
        @keyframes lineGrow{from{width:0}to{width:48px}}
        .hero-line{animation:lineGrow .7s .8s forwards;width:0}
        .ha1{animation:fadeUp .8s .4s both}
        .ha2{animation:fadeUp .8s .6s both}
        .ha3{animation:fadeUp .8s .8s both}
        .ha4{animation:fadeUp .8s 1s both}
        .play-pulse{animation:pulsing 2s infinite}
        .svc-hover:hover{background:rgba(201,168,76,.05)!important;border-color:rgba(201,168,76,.35)!important;transform:translateY(-4px)}
        .svc-hover::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);transform:scaleX(0);transition:transform .4s}
        .svc-hover:hover::after{transform:scaleX(1)}
        .hero-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center}
        .hero-video-wrap{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}
        .hero-bg-video{position:absolute;top:50%;left:50%;width:100vw;height:100vh;min-width:177.78vh;min-height:56.25vw;transform:translate(-50%,-50%)}
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ position:"relative", height:"100svh", minHeight:580, maxHeight:900, overflow:"hidden", background:"#0a2a21" }}>

        {/* Background: video > image > canvas */}
        {heroMedia?.url && heroMedia.type === "video" ? (
          <div className="hero-video-wrap">
            <video
              className="hero-bg-video"
              src={heroMedia.url}
              autoPlay muted loop playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              preload="auto"
              style={{ filter:"brightness(0.55)" }}
            />
          </div>
        ) : heroMedia?.url && heroMedia.type === "image" ? (
          <img
            className="hero-bg-img"
            src={heroMedia.url}
            alt="Salon background"
            style={{ filter:"brightness(0.5)" }}
          />
        ) : (
          <canvas ref={heroRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block" }} />
        )}

        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(10,42,33,.75) 0%,rgba(15,59,47,.4) 50%,rgba(10,42,33,.55) 100%)" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.02) 3px,rgba(0,0,0,.02) 4px)", pointerEvents:"none" }} />
        <div id="heroParticles" style={{ position:"absolute", inset:0, pointerEvents:"none" }} />

        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 5%", paddingTop:"clamp(64px,10vh,90px)", paddingBottom:"clamp(40px,8vh,60px)" }}>
          <div className="ha1" style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <span className="hero-line" style={{ height:1, background:"#C9A84C", display:"inline-block" }} />
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:4, color:"#C9A84C", textTransform:"uppercase" }}>
              {salonName} · Premium Salon
            </span>
          </div>

          <h1 className="ha2" style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,6vw,78px)", fontWeight:700, lineHeight:1.1, marginBottom:12, maxWidth:680 }}>
            <span style={{ color:"#F5F0E8" }}>Where Style</span><br />
            <span id="cycleWord" style={{ color:"#C9A84C", fontStyle:"italic", display:"inline-block", minWidth:240, transition:"opacity .35s, transform .35s" }}>Meets Craft</span>
          </h1>

          <p className="ha3" style={{ fontFamily:"'Lora',serif", fontSize:"clamp(13px,1.5vw,15px)", color:"rgba(245,240,232,.65)", maxWidth:460, lineHeight:1.75, marginBottom:30 }}>
            A sanctuary of refinement where every cut, color, and ritual is a masterpiece crafted for you.
          </p>

          <div className="ha4" style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <Link href="/booking" style={{ background:"linear-gradient(135deg,#C9A84C,#A07A30)", color:"#fff", padding:"13px 28px", fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"2.5px", textTransform:"uppercase", textDecoration:"none", borderRadius:2, display:"inline-flex", alignItems:"center", gap:8 }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 0 24px rgba(201,168,76,.6)"}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
              Book Appointment <ArrowRight size={14} />
            </Link>
            <Link href="/services-menu" style={{ background:"transparent", color:"rgba(245,240,232,.8)", border:"1px solid rgba(245,240,232,.25)", padding:"12px 24px", fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"2px", textTransform:"uppercase", textDecoration:"none", borderRadius:2 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#C9A84C";e.currentTarget.style.color="#C9A84C"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(245,240,232,.25)";e.currentTarget.style.color="rgba(245,240,232,.8)"}}>
              Explore Services
            </Link>
          </div>

          {/* Stats row — shown on ALL screens below buttons */}
          <div style={{ display:"flex", gap:0, marginTop:24, borderTop:"1px solid rgba(201,168,76,.15)", paddingTop:20, maxWidth:460 }}>
            {[{val:"5,000+",lbl:"Happy Clients"},{val:"8+",lbl:"Expert Stylists"},{val:"8+",lbl:"Years Running"}].map((s,i)=>(
              <div key={i} style={{ flex:1, textAlign:"center", borderRight: i<2 ? "1px solid rgba(201,168,76,.2)" : "none", padding:"0 12px" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(18px,3.5vw,26px)", fontWeight:700, color:"#C9A84C" }}>{s.val}</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(7px,1vw,9px)", letterSpacing:"1.5px", color:"rgba(245,240,232,.4)", textTransform:"uppercase", marginTop:3 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>



        <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, opacity:.5 }}>
          <div style={{ width:1, height:28, background:"linear-gradient(180deg,rgba(201,168,76,.5),transparent)" }} />
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:8, letterSpacing:"3px", color:"rgba(245,240,232,.3)", textTransform:"uppercase" }}>Scroll</span>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────── */}
      <div style={{ background:"rgba(10,42,33,0.95)", borderTop:"1px solid rgba(201,168,76,.12)", borderBottom:"1px solid rgba(201,168,76,.12)", padding:"10px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", whiteSpace:"nowrap", animation:"tickerScroll 24s linear infinite" }}>
          {[...TICKER,...TICKER].map((item,i)=>(
            <span key={i} style={{ fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"rgba(245,240,232,.3)", padding:"0 24px" }}>
              {item}<span style={{ color:"rgba(201,168,76,.45)", marginLeft:24 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── OFFERS — now ABOVE categories ──────────────────────── */}
      <OfferSection offers={offers} />

      {/* ── CATEGORIES ─────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-14 sm:py-20 container-pad" style={{ background:"rgba(15,59,47,.2)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <div className="section-label justify-center">
                <span className="gold-line"/><span>Browse By Category</span><span className="gold-line"/>
              </div>
              <h2 className="font-playfair text-[clamp(24px,4vw,44px)] font-bold text-cream">
                Who Are You <em className="text-gold">Booking For?</em>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {categories.map(cat => (
                <Link key={cat.id} href={`/services-menu?category=${cat.id}`}>
                  <CategoryCard category={cat} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 container-pad" style={{ background:"rgba(10,42,33,.7)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-label justify-center">
              <span className="gold-line"/><span>What We Offer</span><span className="gold-line"/>
            </div>
            <h2 className="font-playfair text-[clamp(24px,4vw,46px)] font-bold text-cream">
              Our <em className="text-gold">Services</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background:"rgba(201,168,76,.07)" }}>
            {displayServices.map((s,i)=>(
              <div key={s.id} className="svc-hover" style={{
                background: i===5 ? "linear-gradient(135deg,rgba(201,168,76,.06),rgba(15,59,47,.08))" : "rgba(10,42,33,.85)",
                padding:"26px 22px", cursor:"pointer", position:"relative", overflow:"hidden", transition:"all .3s",
              }}>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:"3px", color:"rgba(201,168,76,.35)", marginBottom:12 }}>0{i+1}</div>
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt={s.name}
                    onError={e => { e.currentTarget.style.display="none"; e.currentTarget.nextSibling.style.display="block"; }}
                    style={{ width:48, height:48, objectFit:"cover", borderRadius:4, marginBottom:10 }}
                  />
                ) : null}
                <div style={{ fontSize:30, marginBottom:10, display: s.image_url ? "none" : "block" }}>{s.icon}</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#F5F0E8", marginBottom:5 }}>{s.name}</h3>
                <p style={{ fontFamily:"'Lora',serif", fontSize:12, color:"rgba(245,240,232,.45)", lineHeight:1.6, marginBottom:12 }}>{s.description}</p>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#C9A84C" }}>₹{s.price}</span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:"2px", color:"rgba(245,240,232,.3)", textTransform:"uppercase" }}>{s.duration} min</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/services-menu" className="btn-outline">View All Services</Link>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────── */}
      <div style={{ padding:"26px 0", overflow:"hidden", background:"rgba(10,42,33,.9)", borderTop:"1px solid rgba(201,168,76,.07)", borderBottom:"1px solid rgba(201,168,76,.07)" }}>
        <div style={{ display:"flex", whiteSpace:"nowrap", animation:"tickerScroll 30s linear infinite" }}>
          {["Expert Stylists","·","Premium Products","·","On-Time Service","·","5,000+ Happy Clients","·","Book Online Free","·","4.9 Star Rating","·","8 Years of Excellence","·",
            "Expert Stylists","·","Premium Products","·","On-Time Service","·","5,000+ Happy Clients","·","Book Online Free","·","4.9 Star Rating","·","8 Years of Excellence","·",
          ].map((item,i)=>(
            <span key={i} style={{ fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:"3px", textTransform:"uppercase",
              color: item==="·" ? "rgba(201,168,76,.4)" : i%4===0 ? "rgba(201,168,76,.65)" : "rgba(245,240,232,.2)", padding:"0 18px" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      <section style={{ background:"rgba(10,42,33,.6)" }}>
        {/* Desktop: two columns — owner image left, text right */}
        <div className="hidden sm:grid" style={{ gridTemplateColumns:"1fr 1fr" }}>
          <div style={{ position:"relative", background:"#061a12", minHeight:480, overflow:"hidden" }}>
            {settings?.owner_image_url ? (
              <img
                src={settings.owner_image_url}
                alt="Salon Owner"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}
              />
            ) : (
              <canvas ref={aboutRef} style={{ width:"100%", height:"100%", display:"block", position:"absolute", inset:0 }} />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, transparent 60%, rgba(10,42,33,0.4))" }} />
          </div>
          <div className="py-16 px-12" style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div className="section-label mb-3">
              <span className="gold-line"/><span>Our Philosophy</span>
            </div>
            <h2 className="font-playfair text-[clamp(22px,3vw,38px)] font-bold text-cream mb-4">
              Craft Over <em className="text-gold">Convention</em>
            </h2>
            <p className="font-lora text-sm text-cream/55 leading-[1.8] mb-5">
              At {salonName}, we believe a great haircut is more than scissors and skill — it's about understanding who you are and elevating it.
            </p>
            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:12 }}>
              {[
                "Every stylist trained at premier academies with 3+ years of experience",
                "Only dermatologically-tested luxury products — zero compromise",
                "Real-time online booking with instant confirmation emails",
                "Private consultation before every appointment — always free",
              ].map(item=>(
                <li key={item} style={{ display:"flex", alignItems:"flex-start", gap:10, fontFamily:"'Lora',serif", fontSize:13, color:"rgba(245,240,232,.6)", lineHeight:1.55 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#C9A84C", flexShrink:0, marginTop:6 }} />{item}
                </li>
              ))}
            </ul>
            <Link href="/contact" className="btn-gold mt-7 w-fit">Our Story →</Link>
          </div>
        </div>

        {/* Mobile: owner image on top, full width text below */}
        <div className="sm:hidden" style={{ width:"100%" }}>
          {settings?.owner_image_url && (
            <div style={{ width:"100%", height:280, overflow:"hidden", position:"relative" }}>
              <img
                src={settings.owner_image_url}
                alt="Salon Owner"
                style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}
              />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 50%, rgba(10,42,33,0.95))" }} />
            </div>
          )}
          <div className="px-6 py-10">
          <div className="section-label mb-3">
            <span className="gold-line"/><span>Our Philosophy</span>
          </div>
          <h2 className="font-playfair text-[clamp(26px,7vw,36px)] font-bold text-cream mb-4">
            Craft Over <em className="text-gold">Convention</em>
          </h2>
          <p className="font-lora text-sm text-cream/55 leading-[1.9] mb-5">
            At {salonName}, we believe a great haircut is more than scissors and skill — it's about understanding who you are and elevating it.
          </p>
          <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:14 }}>
            {[
              "Every stylist trained at premier academies with 3+ years of experience",
              "Only dermatologically-tested luxury products — zero compromise",
              "Real-time online booking with instant confirmation emails",
              "Private consultation before every appointment — always free",
            ].map(item=>(
              <li key={item} style={{ display:"flex", alignItems:"flex-start", gap:12, fontFamily:"'Lora',serif", fontSize:14, color:"rgba(245,240,232,.65)", lineHeight:1.6 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#C9A84C", flexShrink:0, marginTop:7 }} />{item}
              </li>
            ))}
          </ul>
          <Link href="/contact" className="btn-gold mt-7 w-fit">Our Story →</Link>
          </div>
        </div>
      </section>

      {/* ── WHY US ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 container-pad" style={{ background:"rgba(15,59,47,.25)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon:<Scissors size={26} className="text-gold"/>, title:"Expert Artisans", desc:"Our stylists are trained at premier academies with years of hands-on mastery." },
            { icon:<Award size={26} className="text-gold"/>, title:"Premium Products", desc:"We use only luxury, dermatologically-tested products for lasting results." },
            { icon:<Clock size={26} className="text-gold"/>, title:"On-Time Service", desc:"Respect for your time — we start on schedule, every single time." },
          ].map(({icon,title,desc})=>(
            <div key={title} className="glass-card p-7 text-center rounded-sm hover:border-gold/40 transition-all hover:-translate-y-1">
              <div className="flex justify-center mb-4">{icon}</div>
              <h3 className="font-cinzel text-[11px] tracking-[2px] text-cream mb-3 uppercase">{title}</h3>
              <p className="font-lora text-sm text-cream/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 container-pad" style={{ background:"rgba(10,42,33,.8)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-label justify-center">
              <span className="gold-line"/><span>Client Stories</span><span className="gold-line"/>
            </div>
            <h2 className="font-playfair text-[clamp(24px,4vw,44px)] font-bold text-cream">
              What Our Clients <em className="text-gold">Say</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TESTIMONIALS.map(t=>(
              <div key={t.name} className="luxury-card p-7 rounded-sm">
                <div style={{ color:"#C9A84C", fontSize:13, letterSpacing:3, marginBottom:12 }}>★★★★★</div>
                <p className="font-lora text-sm text-cream/80 leading-[1.75] font-italic mb-5 italic">"{t.text}"</p>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#C9A84C,#1a5240)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{t.av}</div>
                  <div>
                    <div className="font-cinzel text-[10px] tracking-[1px] text-cream">{t.name}</div>
                    <div className="font-lora text-xs text-cream/40">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTAGRAM VIDEOS ──────────────────────────────────────── */}
      <VideoSection videos={videos} />

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 container-pad text-center" style={{ background:"linear-gradient(135deg,rgba(10,42,33,.9),rgba(15,59,47,.8))", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center,rgba(201,168,76,.07) 0%,transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <div className="section-label justify-center mb-3">
            <span className="gold-line"/><span>Ready For A Change?</span><span className="gold-line"/>
          </div>
          <h2 className="font-playfair text-[clamp(28px,5vw,54px)] font-bold text-cream mb-3">
            Book Your <em className="text-gold">Appointment</em>
          </h2>
          <p className="font-lora text-sm text-cream/50 mb-9 max-w-md mx-auto leading-relaxed">
            Reserve your slot and step into a world of expert grooming and personal style.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:48 }}>
            <Link href="/booking" className="btn-gold !px-10 !py-4">Schedule Now →</Link>
            <a href="tel:+919096863511" className="btn-outline !px-8 !py-4">Call Us</a>
          </div>
        </div>
      </section>
    </>
  );
}
