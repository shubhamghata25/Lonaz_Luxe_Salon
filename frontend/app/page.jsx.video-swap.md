# How to swap canvas for a real MP4 video

Replace lines 26-27 in app/page.jsx (the <canvas> element inside the hero section):

FROM:
  <canvas ref={heroRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block" }} />

TO:
  <video
    autoPlay muted loop playsInline
    style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
  >
    <source src="/hero-video.mp4" type="video/mp4" />
  </video>

Then delete the entire first useEffect block (the hero canvas animation).
Place your video at: frontend/public/hero-video.mp4
