import { useEffect, useRef, useState } from "react";

export default function ScannerModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const [errorCam, setErrorCam] = useState(false);
  const [noSoportado, setNoSoportado] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    if (!("BarcodeDetector" in window)) {
      setNoSoportado(true);
      return;
    }

    const detector = new window.BarcodeDetector({
      formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "qr_code"],
    });

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        detectarLoop();
      } catch (e) {
        setErrorCam(true);
      }
    }

    async function detectarLoop() {
      if (!activo || !videoRef.current) return;
      try {
        const codigos = await detector.detect(videoRef.current);
        if (codigos.length > 0 && activo) {
          activo = false;
          onScan(codigos[0].rawValue);
          return;
        }
      } catch (e) {
        // frame no válido todavía, seguir intentando
      }
      animRef.current = requestAnimationFrame(detectarLoop);
    }

    iniciar();

    return () => {
      activo = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [intento]);

  function reintentar() {
    setErrorCam(false);
    setIntento((n) => n + 1);
  }

  if (noSoportado) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
      }}>
        <p style={{ color: "#fff", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
          Tu navegador no soporta el escáner nativo. Actualiza Safari/iOS o escribe el número manualmente.
        </p>
        <button onClick={onClose} style={{ padding: "12px 28px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <p style={{ color: "#fff", fontSize: 14, marginBottom: 4, textAlign: "center" }}>Apunta la cámara al código</p>
      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 16, textAlign: "center" }}>Mantén el código recto y dentro del marco</p>

      {errorCam ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: "#fff", fontSize: 14, marginBottom: 16 }}>No se pudo acceder a la cámara.</p>
          <button onClick={reintentar} style={{ padding: "12px 28px", background: "#0f3d63", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none", marginRight: 10 }}>
            Reintentar
          </button>
          <button onClick={onClose} style={{ padding: "12px 28px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}>
            Cerrar
          </button>
        </div>
      ) : (
        <>
          <div style={{ width: 320, height: 220, borderRadius: 16, overflow: "hidden", position: "relative", background: "#000" }}>
            <video
              key={intento}
              ref={videoRef}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              muted
              playsInline
              autoPlay
            />
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "90%", height: 80, border: "2px solid #4ade80", borderRadius: 8,
            }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={reintentar}
              style={{ padding: "12px 24px", background: "#555", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
            >
              Reintentar
            </button>
            <button
              onClick={onClose}
              style={{ padding: "12px 24px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
