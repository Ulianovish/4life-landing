import React, { useState, useEffect, useRef } from "react";

// ⚠️ URL del Apps Script Web App publicado en bienestarhasugue@gmail.com.
// Reemplazar por la URL real una vez creada (ver instrucciones de setup).
// Mientras esté en PLACEHOLDER, el form mostrará un mensaje y no enviará.
const LEAD_CAPTURE_URL =
  "https://script.google.com/macros/s/PLACEHOLDER_REPLACE_ME/exec";

const PDF_URL = "/guias/guia-7-habitos.pdf";
const PDF_FILENAME = "Guia-7-Habitos-Vida-Saludable.pdf";

const COUNTRY_CODES: Array<{ code: string; label: string; flag: string }> = [
  { code: "+57", label: "Colombia", flag: "🇨🇴" },
  { code: "+52", label: "México", flag: "🇲🇽" },
  { code: "+1", label: "Estados Unidos", flag: "🇺🇸" },
  { code: "+34", label: "España", flag: "🇪🇸" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+56", label: "Chile", flag: "🇨🇱" },
  { code: "+51", label: "Perú", flag: "🇵🇪" },
  { code: "+593", label: "Ecuador", flag: "🇪🇨" },
  { code: "+58", label: "Venezuela", flag: "🇻🇪" },
  { code: "+507", label: "Panamá", flag: "🇵🇦" },
  { code: "+506", label: "Costa Rica", flag: "🇨🇷" },
  { code: "+591", label: "Bolivia", flag: "🇧🇴" },
  { code: "+598", label: "Uruguay", flag: "🇺🇾" },
  { code: "+595", label: "Paraguay", flag: "🇵🇾" },
  { code: "+503", label: "El Salvador", flag: "🇸🇻" },
  { code: "+502", label: "Guatemala", flag: "🇬🇹" },
  { code: "+504", label: "Honduras", flag: "🇭🇳" },
  { code: "+505", label: "Nicaragua", flag: "🇳🇮" },
  { code: "+1", label: "Puerto Rico", flag: "🇵🇷" },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

const LeadMagnetCTA: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [codigoPais, setCodigoPais] = useState("+57");
  const [telefono, setTelefono] = useState("");
  const [acepto, setAcepto] = useState(false);

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // Cerrar modal con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const resetForm = () => {
    setNombre("");
    setCorreo("");
    setCodigoPais("+57");
    setTelefono("");
    setAcepto(false);
    setStatus("idle");
    setErrorMessage("");
  };

  const triggerDownload = () => {
    // Disparar la descarga programáticamente
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    // Validación mínima
    if (!nombre.trim() || !correo.trim() || !telefono.trim()) {
      setErrorMessage("Por favor completa todos los campos.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo.trim())) {
      setErrorMessage("Revisa tu correo electrónico.");
      return;
    }
    if (!acepto) {
      setErrorMessage("Debes aceptar la política de privacidad.");
      return;
    }

    // Si la URL del Apps Script todavía es el placeholder, avisar.
    if (LEAD_CAPTURE_URL.includes("PLACEHOLDER_REPLACE_ME")) {
      setErrorMessage(
        "El formulario todavía no está conectado al sistema de leads. Por favor contacta directamente por WhatsApp."
      );
      return;
    }

    setStatus("submitting");

    const payload = {
      nombre: nombre.trim(),
      correo: correo.trim(),
      codigoPais,
      telefono: telefono.trim(),
      origen: "Lead Magnet - Guia 7 Habitos",
    };

    try {
      // text/plain para evitar preflight CORS con Google Apps Script
      await fetch(LEAD_CAPTURE_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      // Notificar a GTM para conversion tracking (si dataLayer existe)
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: "lead_magnet_submit",
          lead_origin: payload.origen,
        });
      }

      setStatus("success");
      // Disparar descarga después de un pequeño delay para que se vea el mensaje
      setTimeout(() => triggerDownload(), 600);
    } catch (err) {
      console.error("Lead capture error:", err);
      setStatus("error");
      setErrorMessage(
        "No pudimos enviar el formulario. Inténtalo de nuevo o escríbenos por WhatsApp."
      );
    }
  };

  return (
    <>
      {/* CTA Section */}
      <section className="section bg-gradient-to-r from-primary/10 via-white to-primary/10">
        <div className="container">
          <div className="row items-center justify-center">
            <div className="lg:col-10 text-center">
              <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                🎁 RECURSO GRATUITO
              </span>
              <h2 className="mb-4">
                Guía de 7 hábitos para una vida más saludable
              </h2>
              <p className="mb-8 text-lg text-gray-600">
                Descarga gratis nuestra guía con 7 hábitos sencillos que puedes
                empezar hoy mismo para mejorar tu bienestar diario, energía y
                vitalidad.
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn btn-primary lead-magnet-cta"
              >
                <span className="text-lg font-semibold">
                  Descargar Guía Gratis
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <p className="mt-4 text-sm text-gray-500">
                100% gratis · Sin spam · Recibe la guía al instante
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6"
          aria-modal="true"
          role="dialog"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (status !== "submitting") setOpen(false);
            }}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="bg-primary px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Descarga gratuita
                  </p>
                  <h3 className="mt-1 text-xl font-bold leading-tight text-white">
                    Guía de 7 hábitos para una vida más saludable
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "submitting") setOpen(false);
                  }}
                  aria-label="Cerrar"
                  className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                  disabled={status === "submitting"}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {status === "success" ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h4 className="mb-2 text-xl font-bold text-gray-900">
                    ¡Listo! Tu guía está descargando
                  </h4>
                  <p className="mb-6 text-gray-600">
                    Si la descarga no comenzó automáticamente,{" "}
                    <a
                      href={PDF_URL}
                      download={PDF_FILENAME}
                      className="font-semibold text-primary underline"
                    >
                      haz clic aquí
                    </a>{" "}
                    para descargarla.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTimeout(resetForm, 300);
                    }}
                    className="btn btn-primary"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Completa tus datos y recibe la guía al instante.
                  </p>

                  {/* Nombre */}
                  <div>
                    <label
                      htmlFor="lm-nombre"
                      className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lm-nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      placeholder="Tu nombre"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={status === "submitting"}
                    />
                  </div>

                  {/* Correo */}
                  <div>
                    <label
                      htmlFor="lm-correo"
                      className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Tu mejor correo <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lm-correo"
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      required
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={status === "submitting"}
                    />
                  </div>

                  {/* Teléfono con código de país */}
                  <div>
                    <label
                      htmlFor="lm-telefono"
                      className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={codigoPais}
                        onChange={(e) => setCodigoPais(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={status === "submitting"}
                        aria-label="Código de país"
                      >
                        {COUNTRY_CODES.map((c, idx) => (
                          <option key={`${c.code}-${idx}`} value={c.code}>
                            {c.flag} {c.code} {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        id="lm-telefono"
                        type="tel"
                        value={telefono}
                        onChange={(e) =>
                          setTelefono(e.target.value.replace(/[^\d]/g, ""))
                        }
                        required
                        placeholder="3001234567"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={status === "submitting"}
                      />
                    </div>
                  </div>

                  {/* Aceptación política */}
                  <div className="flex items-start gap-2">
                    <input
                      id="lm-acepto"
                      type="checkbox"
                      checked={acepto}
                      onChange={(e) => setAcepto(e.target.checked)}
                      className="mt-1"
                      disabled={status === "submitting"}
                    />
                    <label
                      htmlFor="lm-acepto"
                      className="text-xs text-gray-600"
                    >
                      Acepto la{" "}
                      <a
                        href="/politica-privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        política de privacidad
                      </a>{" "}
                      y autorizo el tratamiento de mis datos.
                    </label>
                  </div>

                  {/* Error */}
                  {errorMessage && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="btn btn-primary w-full disabled:opacity-60"
                  >
                    {status === "submitting"
                      ? "Enviando..."
                      : "Descargar Guía Gratis"}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    Tus datos están seguros. Nunca te enviaremos spam.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Hidden download link */}
          <a
            ref={downloadLinkRef}
            href={PDF_URL}
            download={PDF_FILENAME}
            style={{ display: "none" }}
            aria-hidden="true"
            tabIndex={-1}
          >
            download
          </a>
        </div>
      )}
    </>
  );
};

export default LeadMagnetCTA;
