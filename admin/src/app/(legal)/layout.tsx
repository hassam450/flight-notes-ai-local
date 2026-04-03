import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flight Notes AI",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </div>
    </div>
  );
}
