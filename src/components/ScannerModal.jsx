import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function ScannerModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [errorCam, setErrorCam] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [textoDetectado, setTextoDetectado] = useState(null);

  useEffect(() => {
    async function iniciarCamara() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setErrorCam(true);
      }
    }
    iniciarCamara();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function capturarYLeer() {
    if (!videoRef.current || !canvasRef.current) return;
    setProcesando(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const anchoRecorte = video.videoWidth * 0.85;
    const altoRecorte = video.videoHeight * 0.25;
    const x = (video.videoWidth - anchoRecorte) / 2;
    const y = (video.videoHeight - altoRecorte) / 2;

    canvas.width = anchoRecorte;
    canvas.height = altoRecorte;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, x, y, anchoRecorte, altoRecorte, 0, 0, anchoRecorte, altoRecorte);

    try {
      const resultado = await Tesseract.recognize(canvas, "eng", {
        tessedit_char_whitelist: "0123456789",
      });
      const soloDigitos = resultado.data.text.replace(/\D/g, "");
      setTextoDetectado(soloDigitos || "");
    } catch (e) {
      setTextoDetectado("");
    }
    setProcesando(false);
  }

  if (textoDetectado !== null) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
      }}>
        <p style={{ color: "#fff", fontSize: 15, marginBottom: 16, textAlign: "center" }}>
          {textoDetectado ? "Verifica el número detectado:" : "No se detectó ningún número. Escríbelo manualmente:"}
        </p>
        <input
          value={textoDetectado}
          onChange={(e) => setTextoDetectado(e.target.value.replace(/\D/g, ""))}
          autoFocus
          style={{ width: 260, padding: 14, fontSize: 18, textAlign: "center", borderRadius: 10, border: "none", marginBottom: 20 }}
        />
        <div style={{ display: "flex", gap: 10, width: 260 }}>
          <button
            onClick={() => setTextoDetectado(null)}
            style={{ flex: 1, padding: 12, background: "#555", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
          >
            Reintentar
          </button>
          <button
            onClick={() => onScan(textoDetectado)}
            disabled={!textoDetectado}
            style={{ flex: 1, padding: 12, background: textoDetectado ? "#0f3d63" : "#555", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
          >
            Usar número
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <p style={{ color: "#fff", fontSize: 14, marginBottom: 4, textAlign: "center" }}>Apunta al número impreso</p>
      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 16, textAlign: "center" }}>Encuadra los dígitos dentro del marco</p>

      {errorCam ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: "#fff", fontSize: 14, marginBottom: 16 }}>No se pudo acceder a la cámara.</p>
          <button onClick={onClose} style={{ padding: "12px 28px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}>
            Cerrar
          </button>
        </div>
      ) : (
        <>
          <div style={{ width: 320, height: 220, borderRadius: 16, overflow: "hidden", position: "relative", background: "#000" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline autoPlay />
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "85%", height: "25%", border: "2px solid #4ade80", borderRadius: 8,
            }} />
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <button
            onClick={capturarYLeer}
            disabled={procesando}
            style={{ marginTop: 20, padding: "14px 32px", background: "#0f3d63", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "none" }}
          >
            {procesando ? "Leyendo..." : "Capturar y leer"}
          </button>
          <button
            onClick={onClose}
            style={{ marginTop: 12, padding: "10px 24px", background: "transparent", color: "#fff", borderRadius: 10, fontSize: 13, border: "1px solid #666" }}
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
