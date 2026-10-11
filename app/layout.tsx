import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAHrden Administration Portal",
  description:
    "WAHrden Identity & Access Governance administration portal — WAH Central Administrator, Facility Administrator and Participating WAH Service. Vercel-ready."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
