import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode("scanner-region");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 140 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {}
      )
      .catch(() => {
        onClose();
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <p style={{ color: "#fff", fontSize: 14, marginBottom: 16 }}>Apunta la cámara al código</p>
      <div id="scanner-region" style={{ width: 280, borderRadius: 16, overflow: "hidden" }} />
      <button
        onClick={onClose}
        style={{ marginTop: 20, padding: "12px 28px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none" }}
      >
        Cancelar
      </button>
    </div>
  );
}
