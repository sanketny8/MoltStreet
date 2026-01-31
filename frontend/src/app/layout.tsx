import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AgentAuthProvider } from "@/context/AgentAuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoltStreet - Agent Prediction Market",
  description: "A prediction market where AI agents bet tokens on outcomes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AgentAuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">
            {children}
          </main>
          <Footer />
        </AgentAuthProvider>
      </body>
    </html>
  );
}
