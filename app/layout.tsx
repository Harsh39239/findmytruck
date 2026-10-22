import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindMyTruck: know your truck's status without a call",
  description:
    "Drivers update their status in their own language with a tap or a photo. AI translates it and reads the weighment slip, and dispatch managers see every truck on one phone screen.",
};

export const viewport: Viewport = { themeColor: "#1f5eff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
