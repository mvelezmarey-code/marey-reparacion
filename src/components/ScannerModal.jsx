import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

export default function ScannerModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [errorCam, setErrorCam] = useState(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    let activo = true;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current,
        (result, err, controls) => {
          controlsRef.current = controls;
          if (result && activo) {
            activo = false;
            onScan(result.getText());
            controls.stop();
          }
        }
      )
      .catch(() => {
        setErrorCam(true);
      });

    return () => {
      activo = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <p style={{ color: "#fff", fontSize: 14, marginBottom: 4, textAlign: "center" }}>Apunta la cámara al código de barras</p>
      <p style={{ color: "#aaa", fontSize: 12, marginBottom: 16, textAlign: "center" }}>Mantén el código recto y dentro del marco</p>

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
            <video
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
          <button
            onClick={onClose}
            style={{ marginTop: 20, padding: "12px 28px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
