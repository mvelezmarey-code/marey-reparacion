import { useState } from "react";
import { supabase } from "../lib/supabase";
import FotoHoja from "../components/FotoHoja";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#e6e8ec";
const SURF = "#f7f9fc";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];

export default function NuevoBatch({ onBack, onCreado }) {
  const [numero, setNumero] = useState("");
  const [hojaUrl, setHojaUrl] = useState("");
  const [items, setItems] = useState([{ modelo: MODELOS[0], cantidad: 1 }]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  function modelosDisponiblesPara(indiceActual) {
    const yaUsados = items.filter((_, i) => i !== indiceActual).map((it) => it.modelo);
    return MODELOS.filter((m) => !yaUsados.includes(m));
  }

  function agregarModelo() {
    const usados = items.map((it) => it.modelo);
    const siguienteLibre = MODELOS.find((m) => !usados.includes(m));
    if (!siguienteLibre) {
      setError("Ya agregaste todos los modelos disponibles.");
      return;
    }
    setError("");
    setItems([...items, { modelo: siguienteLibre, cantidad: 1 }]);
  }

  function quitarModelo(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function actualizar(i, campo, valor) {
    if (campo === "modelo") {
      const yaUsado = items.some((it, idx) => idx !== i && it.modelo === valor);
      if (yaUsado) {
        setError("Ese modelo ya está agregado en este batch.");
        return;
      }
      setError("");
    }
    const copia = [...items];
    copia[i][campo] = valor;
    setItems(copia);
  }

  function validarYPedirConfirmacion() {
    if (!numero.trim()) {
      setError("Escribe el número de transferencia.");
      return;
    }
    if (items.some((it) => !it.cantidad || it.cantidad < 1)) {
      setError("Cada modelo necesita una cantidad válida.");
      return;
    }
    const modelosUnicos = new Set(items.map((it) => it.modelo));
    if (modelosUnicos.size !== items.length) {
      setError("No puedes repetir el mismo modelo dos veces.");
      return;
    }
    if (!hojaUrl) {
      setError("Toma la foto de la hoja de almacén (es obligatoria).");
      return;
    }
    setError("");
    setMostrarConfirmacion(true);
  }

  async function crear() {
    setGuardando(true);
    try {
      const { data: batch, error: errBatch } = await supabase
        .from("batches")
        .insert({ numero_transferencia: numero.trim(), estado: "abierto", hoja_inicial_url: hojaUrl })
        .select()
        .single();

      if (errBatch) {
        const mensaje = errBatch.message.includes("duplicate") || errBatch.message.includes("unique")
          ? "Ese número de transferencia ya existe. Usa uno distinto."
          : errBatch.message;
        setError(mensaje);
        setGuardando(false);
        setMostrarConfirmacion(false);
        return;
      }

      const rows = items.map((it) => ({
        batch_id: batch.id,
        modelo_codigo: it.modelo,
        cantidad_declarada: Number(it.cantidad),
      }));
      const { error: errItems } = await supabase.from("batch_items").insert(rows);

      if (errItems) {
        setError(errItems.message);
        setGuardando(false);
        setMostrarConfirmacion(false);
        return;
      }

      onCreado(batch);
    } catch (e) {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setGuardando(false);
      setMostrarConfirmacion(false);
    }
  }

  const totalUnidades = items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);

  const shellStyle = {
    height: "100dvh",
    maxWidth: 480,
    margin: "0 auto",
    padding: "18px 20px 0",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#fff",
    color: TEXT,
    overflow: "hidden",
    WebkitFontSmoothing: "antialiased",
  };
  const inputStyle = {
    width: "100%", padding: 14, border: `1px solid ${LINE}`, borderRadius: 13,
    boxSizing: "border-box", fontSize: 15, background: "#fff", color: TEXT,
  };
  const seccionLabel = {
    fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5,
    textTransform: "uppercase", margin: "0 0 10px",
  };
  const botonPrimario = {
    width: "100%", padding: 16, fontSize: 15, fontWeight: 700,
    background: NAVY, color: "#fff", border: "none", borderRadius: 14,
    boxShadow: "0 6px 18px rgba(15,61,99,0.22)",
  };

  if (mostrarConfirmacion) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,32,53,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 22, padding: 26, maxWidth: 340, boxShadow: "0 12px 34px rgba(0,0,0,0.22)" }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px", color: TEXT }}>¿Confirmas esta información?</p>
          <div style={{ background: SURF, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, margin: "0 0 10px", color: MUTED }}><strong style={{ color: TEXT }}>Transferencia:</strong> {numero}</p>
            {items.map((it, i) => (
              <p key={i} style={{ fontSize: 13, margin: "4px 0", color: MUTED }}>{it.modelo} · {it.cantidad} unidad(es)</p>
            ))}
            <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: NAVY }}>
                Total: {totalUnidades} unidad{totalUnidades !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: "#a32d2d", marginBottom: 16 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setMostrarConfirmacion(false)}
              disabled={guardando}
              style={{ flex: 1, padding: 14, fontSize: 14, fontWeight: 700, border: `1px solid ${LINE}`, borderRadius: 13, background: "#fff", color: TEXT }}
            >
              Revisar
            </button>
            <button onClick={crear} disabled={guardando} style={{ ...botonPrimario, flex: 1, padding: 14, boxShadow: "none" }}>
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      {/* Header fijo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Nueva transferencia</span>
      </div>

      {/* Área que scrollea por dentro */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
        <p style={seccionLabel}>Número de transferencia</p>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="TR-4900"
          style={{ ...inputStyle, marginBottom: 24 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <p style={{ ...seccionLabel, margin: 0 }}>Hoja de almacén</p>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#8a2d2d", background: "#fbe3e3", borderRadius: 10, padding: "3px 8px" }}>OBLIGATORIA</span>
        </div>
        <div style={{ marginBottom: 24 }}>
          <FotoHoja prefijo="hoja-inicial" etiqueta="Tomar foto de la hoja" onSubida={setHojaUrl} urlActual={hojaUrl || null} />
        </div>

        <p style={seccionLabel}>Productos que se van a reparar</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <select
                value={it.modelo}
                onChange={(e) => actualizar(i, "modelo", e.target.value)}
                style={{ ...inputStyle, flex: 2 }}
              >
                {modelosDisponiblesPara(i).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={it.cantidad}
                onChange={(e) => actualizar(i, "cantidad", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              {items.length > 1 && (
                <button onClick={() => quitarModelo(i)} aria-label="Quitar modelo" style={{ padding: "0 15px", borderRadius: 13, border: `1px solid ${LINE}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={agregarModelo} style={{ width: "100%", padding: 13, fontSize: 14, fontWeight: 600, borderRadius: 13, border: `1px dashed #c8d0da`, background: SURF, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Agregar modelo
        </button>
      </div>

      {/* Botón anclado abajo, siempre visible */}
      <div style={{ flexShrink: 0, paddingTop: 14, paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff" }}>
        {error && (
          <p style={{ fontSize: 13, color: "#a32d2d", background: "#fbeaea", padding: "10px 12px", borderRadius: 10, margin: "0 0 12px" }}>
            {error}
          </p>
        )}
        <button onClick={validarYPedirConfirmacion} style={botonPrimario}>
          Confirmar recepción del batch
        </button>
      </div>
    </div>
  );
}
