import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// Toma una foto de la hoja de almacén, le estampa la fecha/hora encima,
// la sube al bucket "hojas-almacen" y devuelve el URL público por onSubida.
export default function FotoHoja({ prefijo = "hoja", etiqueta = "Tomar foto de la hoja", onSubida, urlActual = null }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [preview, setPreview] = useState(urlActual);
  const [error, setError] = useState("");

  function procesarConFecha(file) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const esc = MAX / Math.max(width, height);
            width = Math.round(width * esc);
            height = Math.round(height * esc);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Sello de fecha/hora (abajo a la izquierda)
          const sello = new Date().toLocaleString("es-PR", {
            day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
          });
          const fs = Math.max(16, Math.round(width * 0.035));
          ctx.font = `600 ${fs}px -apple-system, "Segoe UI", system-ui, sans-serif`;
          const pad = Math.round(fs * 0.6);
          const tw = ctx.measureText(sello).width;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, height - fs - pad * 2, tw + pad * 2, fs + pad * 2);
          ctx.fillStyle = "#fff";
          ctx.textBaseline = "top";
          ctx.fillText(sello, pad, height - fs - pad);

          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = reject;
        img.src = lector.result;
      };
      lector.onerror = reject;
      lector.readAsDataURL(file);
    });
  }

  async function elegir(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      const dataUrl = await procesarConFecha(file);
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${prefijo}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("hojas-almacen")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        setSubiendo(false);
        setError("No se pudo subir la foto. Intenta de nuevo.");
        return;
      }
      const { data: pub } = supabase.storage.from("hojas-almacen").getPublicUrl(path);
      setPreview(dataUrl);
      setSubiendo(false);
      onSubida(pub.publicUrl);
    } catch {
      setSubiendo(false);
      setError("No se pudo procesar la foto.");
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={elegir} style={{ display: "none" }} />
      {preview && (
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
          <img src={preview} alt="Hoja de almacén" style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "cover" }} />
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        style={{
          width: "100%", padding: preview ? 12 : 24, fontSize: 14, fontWeight: 700,
          border: preview ? "1px solid #e6e8ec" : "none",
          background: preview ? "#fff" : "#0f3d63",
          color: preview ? "#0f3d63" : "#fff",
          borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: subiendo ? 0.6 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={preview ? "#0f3d63" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>
        {subiendo ? "Subiendo..." : preview ? "Retomar foto" : etiqueta}
      </button>
      {error && <p style={{ fontSize: 12, color: "#a32d2d", margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
