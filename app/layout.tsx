import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindMyTruck",
  description: "Know your truck's status without making a call.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
