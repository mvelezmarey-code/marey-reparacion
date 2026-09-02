import { useRef, useState } from "react";
import Tesseract from "tesseract.js";

const LARGO_SERIAL = 11;

export default function ScannerModal({ onScan, onClose }) {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [textoDetectado, setTextoDetectado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function abrirCamara() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  function reintentar() {
    setTextoDetectado(null);
    setPreviewUrl(null);
    setTimeout(() => abrirCamara(), 100);
  }

  async function manejarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setPreviewUrl(URL.createObjectURL(archivo));
    setProcesando(true);

    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const escala = Math.min(1600 / img.width, 2);
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gris = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        const valor = gris > 150 ? 255 : 0;
        data[i] = valor;
        data[i + 1] = valor;
        data[i + 2] = valor;
      }
      ctx.putImageData(imgData, 0, 0);

      try {
        const resultado = await Tesseract.recognize(canvas, "eng", {
          tessedit_char_whitelist: "0123456789",
        });
        const soloDigitos = resultado.data.text.replace(/\D/g, "").slice(0, LARGO_SERIAL);
        setTextoDetectado(soloDigitos || "");
      } catch (err) {
        setTextoDetectado("");
      }
      setProcesando(false);
    };
    img.src = URL.createObjectURL(archivo);
  }

  if (textoDetectado !== null) {
    const completo = textoDetectado.length === LARGO_SERIAL;
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
      }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={manejarFoto}
          style={{ display: "none" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {previewUrl && (
          <img src={previewUrl} alt="captura" style={{ width: 260, borderRadius: 10, marginBottom: 16, opacity: 0.7 }} />
        )}
        <p style={{ color: "#fff", fontSize: 15, marginBottom: 16, textAlign: "center" }}>
          {textoDetectado ? "Verifica el número:" : "No se detectó nada. Escríbelo:"}
        </p>
        <input
          value={textoDetectado}
          onChange={(e) => setTextoDetectado(e.target.value.replace(/\D/g, "").slice(0, LARGO_SERIAL))}
          autoFocus
          maxLength={LARGO_SERIAL}
          style={{ width: 260, padding: 14, fontSize: 18, textAlign: "center", borderRadius: 10, border: "none", marginBottom: 8 }}
        />
        <p style={{ fontSize: 12, color: completo ? "#4ade80" : "#f59e0b", marginBottom: 20 }}>
          {textoDetectado.length}/{LARGO_SERIAL} dígitos {completo ? "✓" : ""}
        </p>
        <div style={{ display: "flex", gap: 10, width: 260 }}>
          <button
            onClick={reintentar}
            style={{ flex: 1, padding: 12, background: "#555", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
          >
            Reintentar
          </button>
          <button
            onClick={() => onScan(textoDetectado)}
            disabled={!completo}
            style={{ flex: 1, padding: 12, background: completo ? "#0f3d63" : "#555", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
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
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={manejarFoto}
        style={{ display: "none" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {procesando ? (
        <p style={{ color: "#fff", fontSize: 15 }}>Leyendo número...</p>
      ) : (
        <>
          <p style={{ color: "#fff", fontSize: 16, marginBottom: 8, textAlign: "center" }}>Toma una foto clara del número</p>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 24, textAlign: "center", maxWidth: 260 }}>
            Acércate bien, con buena luz, y enfoca solo el número de {LARGO_SERIAL} dígitos
          </p>
          <button
            onClick={abrirCamara}
            style={{ padding: "16px 36px", background: "#0f3d63", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "none" }}
          >
            Abrir cámara
          </button>
          <button
            onClick={onClose}
            style={{ marginTop: 14, padding: "10px 24px", background: "transparent", color: "#fff", borderRadius: 10, fontSize: 13, border: "1px solid #666" }}
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
