import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenGrok",
  description: "A fully local, Grok-style AI assistant. Bring your own key or run local models.",
};

// Sets the theme class before first paint to avoid a flash.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("opengrok:settings")||"{}").theme||"system";document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
