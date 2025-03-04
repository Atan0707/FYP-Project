import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import QueryProvider from "@/providers/query-provider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster as HotToaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WEMSP",
  description: "Will & Estate Management Solution Provider",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <NotificationProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <HotToaster position="top-right" />
          </NotificationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
