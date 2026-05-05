import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "./providers";

export const metadata = {
  title: "SmartSalon — Where Style Meets Craft",
  description: "Premium unisex hair salon in Mumbai. Book haircuts, coloring, beard sculpting, facials and more online.",
  keywords: "hair salon, haircut, beard, coloring, facial, Mumbai, unisex salon, SmartSalon",
  openGraph: {
    title: "SmartSalon — Where Style Meets Craft",
    description: "Premium unisex salon — Book your appointment today.",
    type: "website",
    images: [{ url: "/og-image.jpg" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#2C1810",
                color: "#F5F0E8",
                border: "1px solid rgba(201,168,76,0.3)",
                fontFamily: "Lora, serif",
              },
              success: { iconTheme: { primary: "#C9A84C", secondary: "#2C1810" } },
            }}
          />
          <Navbar />
          <main style={{ paddingTop: 70 }}>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
