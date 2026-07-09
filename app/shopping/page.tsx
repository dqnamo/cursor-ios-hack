"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Product {
  title: string;
  url: string;
  image?: string;
  description?: string;
}

export default function ShoppingMiniApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [theme, setTheme] = useState({
    bgColor: "#ffffff",
    textColor: "#000000",
    buttonColor: "#2481cc",
    buttonTextColor: "#ffffff",
  });

  useEffect(() => {
    // Initialize Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      // Set up Mini App
      tg.ready();
      tg.expand();

      // Apply Telegram theme
      const params = tg.themeParams;
      setTheme({
        bgColor: params.bg_color || "#ffffff",
        textColor: params.text_color || "#000000",
        buttonColor: params.button_color || "#2481cc",
        buttonTextColor: params.button_text_color || "#ffffff",
      });

      // Parse products from URL or initData
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const productsData = urlParams.get("products");

        if (productsData) {
          const parsed = JSON.parse(decodeURIComponent(productsData));
          setProducts(parsed);
        } else {
          // Fallback demo data
          setProducts([
            {
              title: "Everlane Organic Cotton Midi Dress",
              url: "https://www.everlane.com",
              image:
                "https://placehold.co/400x500/e8d5c4/8b7355?text=Everlane+Dress",
              description: "Sustainable organic cotton, classic silhouette",
            },
            {
              title: "Reformation Linen Wrap Dress",
              url: "https://www.thereformation.com",
              image:
                "https://placehold.co/400x500/f5ebe0/9d8b7a?text=Reformation+Dress",
              description: "Breathable linen, perfect for summer",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to parse products:", error);
      }
    }
  }, []);

  const handleProductClick = (url: string) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme.bgColor,
        color: theme.textColor,
        minHeight: "100vh",
        padding: "16px",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Shopping Results
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "16px",
        }}
      >
        {products.map((product) => (
          <button
            key={product.url}
            type="button"
            onClick={() => handleProductClick(product.url)}
            style={{
              backgroundColor:
                theme.bgColor === "#ffffff" ? "#f9f9f9" : "#1a1a1a",
              borderRadius: "12px",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.2s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "none",
              textAlign: "left",
              width: "100%",
              padding: "0",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {product.image && (
              <div
                style={{ position: "relative", width: "100%", height: "200px" }}
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            )}
            <div style={{ padding: "12px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  lineHeight: "1.3",
                  color: theme.textColor,
                }}
              >
                {product.title}
              </h3>
              {product.description && (
                <p
                  style={{
                    fontSize: "14px",
                    opacity: 0.7,
                    lineHeight: "1.4",
                    color: theme.textColor,
                  }}
                >
                  {product.description}
                </p>
              )}
              <div
                style={{
                  marginTop: "12px",
                  width: "100%",
                  padding: "10px",
                  backgroundColor: theme.buttonColor,
                  color: theme.buttonTextColor,
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                View Product
              </div>
            </div>
          </button>
        ))}
      </div>

      {products.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            opacity: 0.5,
          }}
        >
          <p>No products to display</p>
        </div>
      )}
    </div>
  );
}

// Extend Window type for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        openLink: (url: string) => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
      };
    };
  }
}
