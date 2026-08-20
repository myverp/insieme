import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insieme — film watchlist",
  description: "A shared film watchlist.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-center"
          closeButton
          toastOptions={{
            duration: 6000,
            classNames: {
              toast: "insieme-toast",
              actionButton: "insieme-toast-action",
              closeButton: "insieme-toast-close",
            },
          }}
        />
      </body>
    </html>
  );
}
