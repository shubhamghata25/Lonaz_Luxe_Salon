"use client";
/**
 * FILE: frontend/components/admin/HeroMediaSection.jsx
 *
 * FIX: Upload was failing because:
 *  1. api.js was setting Content-Type: multipart/form-data WITHOUT boundary
 *     → now fixed in api.js (axios sets it automatically with FormData)
 *  2. File type was being detected before file was selected
 *     → now detected from file.type on the actual file object
 */
import { useState, useRef } from "react";
import { settingsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { Upload, Trash2, Image, Film, Loader } from "lucide-react";

export default function HeroMediaSection({ currentUrl, currentType, onSaved }) {
  const [file,      setFile]      = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [preview,   setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    // Detect type from MIME, not from extension guess
    const isVideo = f.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Select a file first"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Pass type as query param so backend Cloudinary storage uses correct resource_type
      // Do NOT set Content-Type header — axios handles it correctly with FormData
      const { data } = await settingsAPI.uploadHeroMedia(fd, mediaType);
      toast.success("Hero background saved!");
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      if (onSaved) onSaved(data);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove hero background and restore animated canvas?")) return;
    setRemoving(true);
    try {
      await settingsAPI.clearHeroMedia();
      toast.success("Restored to default animated background");
      if (onSaved) onSaved(null);
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  const activeUrl  = preview || currentUrl;
  const activeType = preview ? mediaType : (currentType || "image");

  return (
    <div className="glass-card p-5 rounded-sm">
      <div className="font-cinzel text-[10px] tracking-[3px] text-gold mb-2 uppercase">
        Homepage Hero Background
      </div>
      <p className="font-lora text-xs text-muted mb-4 leading-relaxed">
        Upload an image (JPG/PNG/WEBP) or video (MP4) to set the homepage background.
        Leave empty to use the default animated canvas.
      </p>

      {/* Preview */}
      {activeUrl && (
        <div className="mb-4 relative rounded-sm overflow-hidden border border-gold/20" style={{ paddingTop: "56.25%" }}>
          {activeType === "video" ? (
            <video src={activeUrl} muted autoPlay loop playsInline
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }} />
          ) : (
            <img src={activeUrl} alt="Hero background"
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}
              onError={e => { e.currentTarget.style.display = "none"; }} />
          )}
          {/* Rule-of-thirds grid overlay */}
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"linear-gradient(rgba(201,168,76,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.1) 1px,transparent 1px)",
            backgroundSize:"33.33% 33.33%",
            border:"2px dashed rgba(201,168,76,0.25)"
          }} />
          {/* Mobile preview indicator */}
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"rgba(201,168,76,0.15)", pointerEvents:"none" }} />
          <div className="absolute top-2 right-2">
            <span className="font-cinzel text-[8px] tracking-[2px] bg-forest-dark/80 text-gold px-2 py-1 rounded-sm uppercase">
              {preview ? "New — " : "Current — "}{activeType}
            </span>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="font-cinzel text-[7px] tracking-[1px] bg-black/60 text-cream/50 px-2 py-1 rounded-sm uppercase">
              16:9 Hero Preview · Image fills entire background
            </span>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gold/20 hover:border-gold/40 rounded-sm p-6 cursor-pointer transition-colors mb-4"
        style={{ background: "rgba(201,168,76,0.02)" }}>
        <div className="flex gap-3 text-gold/50">
          <Image size={22} />
          <Film size={22} />
        </div>
        <div className="text-center">
          <div className="font-cinzel text-[10px] tracking-[2px] text-cream/70">
            {file ? file.name : "Click to choose image or video"}
          </div>
          <div className="font-lora text-xs text-muted mt-1">
            JPG · PNG · WEBP · MP4 · max 100 MB
          </div>
        </div>
        <input ref={inputRef} type="file" className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/mov,video/webm"
          onChange={handleFileChange} />
      </label>

      <div className="flex gap-3">
        <button onClick={handleUpload} disabled={!file || uploading}
          className="btn-gold flex items-center gap-2 flex-1 justify-center disabled:opacity-40">
          {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Save Hero Background"}
        </button>
        {(currentUrl || preview) && (
          <button onClick={handleRemove} disabled={removing}
            className="btn-outline flex items-center gap-2 px-4 disabled:opacity-40"
            style={{ borderColor: "rgba(198,40,40,0.4)", color: "#ef9a9a" }}>
            {removing ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
