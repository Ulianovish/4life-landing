import React, { useEffect, useState } from "react";
import {
  detectUserRegion,
  buildProductUrl,
  getRegionConfig,
} from "@/lib/utils/regionalStore";

interface RegionalBuyButtonProps {
  productKey: string;
  label?: string;
  className?: string;
  fallbackUrl?: string;
}

const RegionalBuyButton: React.FC<RegionalBuyButtonProps> = ({
  productKey,
  label = "Comprar Ahora",
  className = "btn-blue block h-[48px] w-full rounded-[50px]",
  fallbackUrl = "https://colombia.4life.com/MildredBriyitBarrero/shop/all",
}) => {
  const [productUrl, setProductUrl] = useState(fallbackUrl);
  const [regionName, setRegionName] = useState("");

  useEffect(() => {
    // Detect user region
    const userRegion = detectUserRegion();
    const regionConfig = getRegionConfig(userRegion);

    // Build product URL
    const url = buildProductUrl(productKey, userRegion);
    setProductUrl(url);

    // Set region name for display
    if (regionConfig) {
      setRegionName(regionConfig.name);
    }
  }, [productKey]);

  return (
    <div className="text-center">
      <a
        className={className}
        href={productUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={regionName ? `Comprar en ${regionName}` : "Comprar ahora"}
      >
        {label}
      </a>
      {regionName && (
        <p className="mt-2 text-xs text-gray-500">
          Tienda para: <strong>{regionName}</strong>
        </p>
      )}
    </div>
  );
};

export default RegionalBuyButton;