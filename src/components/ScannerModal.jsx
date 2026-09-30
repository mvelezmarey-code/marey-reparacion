import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// Toma una foto de la etiqueta, la manda a la Edge Function leer-serial
// (Claude Haiku) y devuelve los 11 dígitos por onScan.
export default function ScannerModal({ onClose, onScan }) {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState("inicio"); // inicio | leyendo | error
  const [preview, setPreview] = useState(null);
  const [mensaje, setMensaje] = useState("");

  // Reduce la foto a máx 1600px para que el OCR sea rápido y barato
  function procesarFoto(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 2400;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const escala = MAX / Math.max(width, height);
            width = Math.round(width * escala);
            height = Math.round(height * escala);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          resolve({ base64: dataUrl.split(",")[1], preview: dataUrl });
        };
        img.onerror = reject;
        img.src = lector.result;
      };
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setEstado("leyendo");
    setMensaje("Leyendo el número de serie...");
    try {
      const { base64, preview } = await procesarFoto(archivo);
      setPreview(preview);

      const { data, error } = await supabase.functions.invoke("leer-serial", {
        body: { imagen: base64, tipo: "image/jpeg" },
      });

      if (error) {
        setEstado("error");
        setMensaje("No se pudo conectar. Intenta de nuevo.");
        return;
      }
      if (data?.serial && data.serial.length === 11) {
        onScan({ serial: data.serial, modelo: data.modelo || "" });
        return; // el formulario cierra el modal y rellena el campo
      }
      setEstado("error");
      setMensaje("No pude leer los 11 dígitos con claridad. Toma la foto más de cerca y con buena luz, o escríbelo a mano.");
    } catch {
      setEstado("error");
      setMensaje("No se pudo leer la foto. Intenta de nuevo.");
    }
  }

  const shell = {
    position: "fixed", inset: 0, background: "#fff", zIndex: 1000,
    maxWidth: 420, margin: "0 auto", padding: 20,
    display: "flex", flexDirection: "column", boxSizing: "border-box",
  };
  const botonPrimario = {
    width: "100%", padding: 16, fontSize: 15, fontWeight: 600,
    background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14,
  };
  const botonSecundario = {
    width: "100%", padding: 14, fontSize: 14, fontWeight: 600,
    background: "#f4f3ee", color: "#333", border: "none", borderRadius: 14,
  };

  return (
    <div style={shell}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Número de serie</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16 }}>
        {preview && (
          <img src={preview} alt="Foto de la etiqueta" style={{ width: "100%", borderRadius: 16, maxHeight: 260, objectFit: "cover" }} />
        )}

        {estado === "leyendo" && (
          <p style={{ fontSize: 14, color: "#0f3d63", fontWeight: 600 }}>{mensaje}</p>
        )}

        {estado === "error" && (
          <p style={{ fontSize: 13, color: "#a32d2d", textAlign: "center", lineHeight: 1.5 }}>{mensaje}</p>
        )}

        {estado === "inicio" && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#eaf0f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0f3d63" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>
            </div>
            <p style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              Toma una foto clara de la etiqueta, enfocando el código de barras y los 11 dígitos.
            </p>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={elegirFoto} style={{ display: "none" }} />

      {estado === "leyendo" ? (
        <button disabled style={{ ...botonPrimario, opacity: 0.6 }}>Leyendo...</button>
      ) : (
        <>
          <button onClick={() => inputRef.current?.click()} style={{ ...botonPrimario, marginBottom: 10 }}>
            {estado === "error" ? "Tomar otra foto" : "Tomar foto"}
          </button>
          <button onClick={onClose} style={botonSecundario}>Escribir a mano</button>
        </>
      )}
    </div>
  );
}
