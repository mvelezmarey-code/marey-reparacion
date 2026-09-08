import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function CierreDiario({ tecnico, onDesbloqueado }) {
  const inputRef = useRef(null);
  const [foto, setFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  function abrirCamara() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  function manejarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFoto(archivo);
    setPreviewUrl(URL.createObjectURL(archivo));
    setError("");
  }

  function nombreSeguro(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
  }

  async function confirmar() {
    if (!foto) return;
    setSubiendo(true);
    setError("");

    const hoy = new Date().toISOString().split("T")[0];
    const nombreArchivo = `${nombreSeguro(tecnico)}_${hoy}_${Date.now()}.jpg`;

    const { error: errUpload } = await supabase.storage
      .from("cierres-diarios")
      .upload(nombreArchivo, foto);

    if (errUpload) {
      setError("Error al subir foto: " + errUpload.message);
      setSubiendo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("cierres-diarios").getPublicUrl(nombreArchivo);

    const { error: errInsert } = await supabase.from("cierres_diarios").insert({
      tecnico_nombre: tecnico,
      fecha: hoy,
      foto_url: urlData.publicUrl,
    });

    setSubiendo(false);

    if (errInsert) {
      setError("Error al guardar: " + errInsert.message);
      return;
    }

    onDesbloqueado();
  }

  return (
    <div style={{
      height: "100vh", maxWidth: 420, margin: "0 auto", padding: 24,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      boxSizing: "border-box", background: "#f5f4f1",
    }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={manejarFoto} style={{ display: "none" }} />

      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fdf0dc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ width: 28, height: 28, border: "3px solid #93650f", borderRadius: 6 }} />
      </div>

      <p style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px", textAlign: "center", color: "#222" }}>Fin del día</p>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px", textAlign: "center" }}>{tecnico}</p>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 32px", textAlign: "center", maxWidth: 280 }}>
        Toma una foto de tu área recogida para desbloquear el sistema
      </p>

      {previewUrl && (
        <img src={previewUrl} alt="preview" style={{ width: 220, borderRadius: 14, marginBottom: 20 }} />
      )}

      {error && <p style={{ fontSize: 12, color: "#a32d2d", marginBottom: 16, textAlign: "center", padding: "0 10px" }}>{error}</p>}

      {!foto ? (
        <button
          onClick={abrirCamara}
          style={{ width: 260, padding: 16, fontSize: 15, fontWeight: 700, background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14 }}
        >
          Tomar foto
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, width: 260 }}>
          <button
            onClick={abrirCamara}
            disabled={subiendo}
            style={{ flex: 1, padding: 14, fontSize: 13, fontWeight: 700, background: "#fff", color: "#333", border: "1px solid #e4e2da", borderRadius: 14 }}
          >
            Repetir
          </button>
          <button
            onClick={confirmar}
            disabled={subiendo}
            style={{ flex: 1, padding: 14, fontSize: 13, fontWeight: 700, background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14 }}
          >
            {subiendo ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
