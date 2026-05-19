import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Onix Platform — Marketing Dashboard",
  description: "Onix Real Estate Telegram marketing tizimi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(222 22% 12%)",
              color: "hsl(210 20% 98%)",
              border: "1px solid hsl(220 14% 18%)",
            },
          }}
        />
      </body>
    </html>
  );
}
