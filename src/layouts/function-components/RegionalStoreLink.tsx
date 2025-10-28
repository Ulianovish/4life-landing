import React, { useEffect, useState } from "react";
import {
  detectUserRegion,
  buildStoreUrl,
  getRegionConfig,
} from "@/lib/utils/regionalStore";

interface RegionalStoreLinkProps {
  className?: string;
}

const RegionalStoreLink: React.FC<RegionalStoreLinkProps> = ({
  className = "btn btn-primary",
}) => {
  const [storeUrl, setStoreUrl] = useState("https://colombia.4life.com/MildredBriyitBarrero/shop/all");
  const [regionName, setRegionName] = useState("");

  useEffect(() => {
    // Detect user region
    const userRegion = detectUserRegion();
    const regionConfig = getRegionConfig(userRegion);

    // Build store URL
    const url = buildStoreUrl(userRegion);
    setStoreUrl(url);

    // Set region name for display
    if (regionConfig) {
      setRegionName(regionConfig.name);
    }
  }, []);

  return (
    <section className="section bg-gradient-to-b from-white to-gray-50">
      <div className="container">
        <div className="row justify-center text-center">
          <div className="lg:col-8">
            <h2 className="mb-4">Explora Nuestro Catálogo Completo</h2>
            <p className="mb-8 text-lg text-gray-600">
              Descubre todos nuestros productos de Transfer Factor y encuentra
              la solución perfecta para fortalecer tu sistema inmunológico.
            </p>
            <a
              className={className}
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={
                regionName
                  ? `Ver catálogo completo en ${regionName}`
                  : "Ver catálogo completo"
              }
            >
              <span className="text-lg font-semibold">
                Ver Catálogo Completo
              </span>
              <svg
                className="ml-2 inline h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            {regionName && (
              <p className="mt-4 text-sm text-gray-500">
                Tienda regional: <strong>{regionName}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="row mt-12 justify-center">
          <div className="col-6 md:col-3 text-center mb-6">
            <div className="text-3xl font-bold text-primary">✓</div>
            <p className="mt-2 text-sm text-gray-600">
              Envío Seguro
            </p>
          </div>
          <div className="col-6 md:col-3 text-center mb-6">
            <div className="text-3xl font-bold text-primary">✓</div>
            <p className="mt-2 text-sm text-gray-600">
              Garantía 4Life
            </p>
          </div>
          <div className="col-6 md:col-3 text-center mb-6">
            <div className="text-3xl font-bold text-primary">✓</div>
            <p className="mt-2 text-sm text-gray-600">
              Soporte 24/7
            </p>
          </div>
          <div className="col-6 md:col-3 text-center mb-6">
            <div className="text-3xl font-bold text-primary">✓</div>
            <p className="mt-2 text-sm text-gray-600">
              Pago Seguro
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegionalStoreLink;