import React, { createContext, useContext, useState, useEffect } from "react";

export type BrandMode = "nexus" | "energia";
export type ThemeColor = "sky" | "velvet";

export interface BrandConfig {
  mode: BrandMode;
  isEnergia: boolean;
  isNexus: boolean;
  appName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string;
  badgeText: string;
  badgeGradient: string;
}

interface BrandContextType {
  brandMode: BrandMode;
  setBrandMode: (mode: BrandMode) => void;
  toggleBrandMode: () => void;
  brand: BrandConfig;
  themeColor: ThemeColor;
  setThemeColor: (theme: ThemeColor) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem("sidebar_theme");
    return saved === "velvet" ? "velvet" : "sky";
  });

  const setThemeColor = (theme: ThemeColor) => {
    setThemeColorState(theme);
    localStorage.setItem("sidebar_theme", theme);
  };

  const [brandMode, setBrandModeState] = useState<BrandMode>(() => {
    const saved = localStorage.getItem("crm_brand_mode");
    if (saved === "energia" || saved === "nexus") {
      return saved;
    }
    const envMode = (import.meta.env.VITE_APP_MODE as string)?.toLowerCase();
    if (envMode === "energia" || envMode === "nexus") {
      return envMode;
    }
    // Default to energia since user is actively developing Energia CRM
    return "energia";
  });

  const setBrandMode = (mode: BrandMode) => {
    setBrandModeState(mode);
    localStorage.setItem("crm_brand_mode", mode);
  };

  const toggleBrandMode = () => {
    setBrandMode(brandMode === "energia" ? "nexus" : "energia");
  };

  useEffect(() => {
    if (brandMode === "energia") {
      document.documentElement.classList.add("brand-energia");
      document.title = "ENERGIA | Heavy Industrial Power & Fleet CRM";
    } else {
      document.documentElement.classList.remove("brand-energia");
      document.title = "Nexus CRM | Enterprise Sales OS";
    }
  }, [brandMode]);

  useEffect(() => {
    if (themeColor === "velvet") {
      document.documentElement.classList.add("theme-velvet");
      document.documentElement.classList.remove("theme-sky");
    } else {
      document.documentElement.classList.add("theme-sky");
      document.documentElement.classList.remove("theme-velvet");
    }
  }, [themeColor]);

  const brand: BrandConfig = brandMode === "energia"
    ? {
        mode: "energia",
        isEnergia: true,
        isNexus: false,
        appName: "ENERGIA CRM",
        tagline: "Heavy Industrial Power & Fleet",
        logoUrl: "/energia-logo-cropped.png",
        primaryColor: "#ED1A53",
        badgeText: "EN",
        badgeGradient: "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] shadow-[#ED1A53]/30",
      }
    : {
        mode: "nexus",
        isEnergia: false,
        isNexus: true,
        appName: "NEXUS CRM",
        tagline: "Enterprise Sales OS",
        logoUrl: null,
        primaryColor: "#2563EB",
        badgeText: "NX",
        badgeGradient: "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20",
      };

  return (
    <BrandContext.Provider value={{ brandMode, setBrandMode, toggleBrandMode, brand, themeColor, setThemeColor }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};

