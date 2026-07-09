import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Shopping Results",
  description: "Browse shopping recommendations",
};

export default function ShoppingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
