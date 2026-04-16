import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nelson Family Reunion 2027",
  description: "Vote on the destination for our family reunion!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#e8f0fe]">
        {children}
      </body>
    </html>
  );
}
