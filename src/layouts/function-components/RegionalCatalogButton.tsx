import React, { useEffect, useState } from "react";
import {
  detectUserRegion,
  buildStoreUrl,
  TEMP_STORE_OVERRIDE,
} from "@/lib/utils/regionalStore";

interface RegionalCatalogButtonProps {
  label: string;
  className?: string;
  fallbackUrl?: string;
}

const RegionalCatalogButton: React.FC<RegionalCatalogButtonProps> = ({
  label,
  className = "btn-blue",
  fallbackUrl = "https://colombia.4life.com/MildredBriyitBarrero/shop/all",
}) => {
  const [storeUrl, setStoreUrl] = useState(TEMP_STORE_OVERRIDE ?? fallbackUrl);

  useEffect(() => {
    setStoreUrl(buildStoreUrl(detectUserRegion()));
  }, []);

  return (
    <a
      className={className}
      href={storeUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
};

export default RegionalCatalogButton;
