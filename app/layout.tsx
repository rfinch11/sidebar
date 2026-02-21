import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const hyperlegibleSans = localFont({
  src: [
    { path: "../public/fonts/HyperlegibleSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/HyperlegibleSans-Italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/HyperlegibleSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/HyperlegibleSans-MediumItalic.woff2", weight: "500", style: "italic" },
    { path: "../public/fonts/HyperlegibleSans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/HyperlegibleSans-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sidebar",
  description: "Your personal AI advisor — sidebar.coach",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${hyperlegibleSans.className} min-h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
