import React, { useEffect, useState } from "react";
import { detectUserRegion, buildStoreUrl } from "@/lib/utils/regionalStore";

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
  const [storeUrl, setStoreUrl] = useState(fallbackUrl);

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
