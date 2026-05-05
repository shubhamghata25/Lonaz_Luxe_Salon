"use client";
/**
 * FILE: frontend/components/sections/VideoSection.jsx
 *
 * FIX: Instagram reels show only the video — no caption, no comments.
 * Using iframe with /embed (NOT /embed/captioned) gives reel-only view.
 * The blockquote approach always shows caption regardless of data-instgrm-captioned.
 * Direct iframe to /reel/{id}/embed is the cleanest solution.
 *
 * FIX: YouTube embeds unchanged.
 * FIX: Generic fallback for unknown URLs.
 */
import { useState } from "react";
import { Instagram, Play, ExternalLink, Loader } from "lucide-react";

// ── URL parsers ───────────────────────────────────────────────────────────────
function parseYouTube(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s]+)/);
  return m ? m[1] : null;
}
function parseInstagram(url) {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// ── YouTube card ──────────────────────────────────────────────────────────────
function YouTubeCard({ videoId, title }) {
  return (
    <div className="luxury-card rounded-sm overflow-hidden">
      <div className="relative overflow-hidden" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title={title || "YouTube video"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {title && (
        <div className="px-4 py-3">
          <p className="font-lora text-sm text-cream/70 truncate">{title}</p>
        </div>
      )}
    </div>
  );
}

// ── Instagram Reel card — video only, no caption/comments ────────────────────
function InstagramCard({ reelId, originalUrl, title }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a href={originalUrl} target="_blank" rel="noreferrer"
        className="luxury-card rounded-sm overflow-hidden flex flex-col items-center justify-center gap-4 p-8 hover:border-gold/40 transition-all group"
        style={{ minHeight: 400 }}>
        <Instagram size={40} className="text-gold/50 group-hover:text-gold transition-colors" />
        <div className="text-center">
          <div className="font-cinzel text-[10px] tracking-[3px] text-cream/60 uppercase mb-1">
            {title || "Instagram Reel"}
          </div>
          <div className="font-lora text-xs text-cream/35">Tap to watch on Instagram</div>
        </div>
        <div className="flex items-center gap-1.5 font-cinzel text-[9px] tracking-[2px] text-gold/50 group-hover:text-gold transition-colors uppercase">
          <ExternalLink size={12} /> Open Reel
        </div>
      </a>
    );
  }

  return (
    <div className="luxury-card rounded-sm overflow-hidden">
      {/*
        Use /reel/{id}/embed — shows ONLY the video player.
        Do NOT use /p/{id}/embed/captioned — that adds caption + comments.
        aspect-ratio ~9/16 for vertical reels; adjust to 4/5 for square-ish display.
      */}
      <div className="relative overflow-hidden w-full" style={{ paddingTop: "177.78%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.instagram.com/reel/${reelId}/embed/`}
          title={title || "Instagram Reel"}
          frameBorder="0"
          scrolling="no"
          allowTransparency
          allowFullScreen
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        {title && <p className="font-lora text-sm text-cream/70 truncate flex-1">{title}</p>}
        <a href={originalUrl} target="_blank" rel="noreferrer"
          className="font-cinzel text-[8px] tracking-[2px] text-gold/40 hover:text-gold uppercase flex items-center gap-1 transition-colors shrink-0">
          <Instagram size={10} /> Open
        </a>
      </div>
    </div>
  );
}

// ── Generic fallback ──────────────────────────────────────────────────────────
function GenericCard({ video }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer"
      className="luxury-card rounded-sm overflow-hidden group flex flex-col">
      {video.thumbnail_url && (
        <div className="relative h-48 overflow-hidden">
          <img src={video.thumbnail_url} alt={video.title || "Video"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { e.currentTarget.parentElement.style.display = "none"; }} />
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,42,33,0.45)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.2)", border: "2px solid #C9A84C" }}>
              <Play size={20} className="text-gold ml-1" />
            </div>
          </div>
        </div>
      )}
      <div className="p-4 flex items-center gap-2">
        <ExternalLink size={14} className="text-gold/50 shrink-0" />
        <span className="font-lora text-sm text-cream/60 truncate">{video.title || "Watch Video"}</span>
      </div>
    </a>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function VideoSection({ videos = [] }) {
  if (!videos.length) return null;
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ background: "rgba(15,59,47,0.3)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="section-label justify-center">
            <span className="gold-line" /><span>Follow Our Work</span><span className="gold-line" />
          </div>
          <h2 className="font-playfair text-[clamp(24px,4vw,42px)] font-bold text-cream">
            <em className="text-gold">Instagram</em> Reels
          </h2>
          <p className="font-lora text-sm text-cream/50 mt-2">
            Follow us for daily transformations and styling inspiration
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-sm sm:max-w-none mx-auto sm:mx-0">
          {videos.map(video => {
            const ytId = parseYouTube(video.url);
            if (ytId) return <YouTubeCard key={video.id} videoId={ytId} title={video.title} />;
            const igId = parseInstagram(video.url);
            if (igId) return <InstagramCard key={video.id} reelId={igId} originalUrl={video.url} title={video.title} />;
            return <GenericCard key={video.id} video={video} />;
          })}
        </div>
      </div>
    </section>
  );
}
