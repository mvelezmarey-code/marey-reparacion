import { useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];

export default function NuevoBatch({ onBack, onCreado }) {
  const [numero, setNumero] = useState("");
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
    setError("");
    setMostrarConfirmacion(true);
  }

  async function crear() {
    setGuardando(true);
    try {
      const { data: batch, error: errBatch } = await supabase
        .from("batches")
        .insert({ numero_transferencia: numero.trim(), estado: "abierto" })
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
    height: "100vh",
    maxWidth: 420,
    margin: "0 auto",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#f5f4f1",
  };

  const inputStyle = {
    width: "100%", padding: 13, border: "1px solid #e4e2da", borderRadius: 12,
    boxSizing: "border-box", fontSize: 14, background: "#fff",
  };

  const botonPrimario = {
    width: "100%", padding: 16, fontSize: 15, fontWeight: 700,
    background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14,
  };

  if (mostrarConfirmacion) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, maxWidth: 320, margin: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <p style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px" }}>¿Confirmas esta información?</p>
          <div style={{ background: "#f5f4f1", borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, margin: "0 0 10px", color: "#666" }}><strong style={{ color: "#222" }}>Transferencia:</strong> {numero}</p>
            {items.map((it, i) => (
              <p key={i} style={{ fontSize: 13, margin: "4px 0", color: "#666" }}>{it.modelo} · {it.cantidad} unidad(es)</p>
            ))}
            <div style={{ borderTop: "1px solid #e4e2da", marginTop: 10, paddingTop: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#0f3d63" }}>
                Total: {totalUnidades} unidad{totalUnidades !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: "#a32d2d", marginBottom: 16 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setMostrarConfirmacion(false)}
              disabled={guardando}
              style={{ flex: 1, padding: 13, fontSize: 14, fontWeight: 700, border: "1px solid #e4e2da", borderRadius: 12, background: "#fff", color: "#333" }}
            >
              Revisar
            </button>
            <button onClick={crear} disabled={guardando} style={{ ...botonPrimario, flex: 1, padding: 13 }}>
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#222" }}>Nueva transferencia</span>
      </div>

      <p style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>Ingrese el número de transferencia</p>
      <input
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        placeholder="TR-4900"
        style={{ ...inputStyle, marginBottom: 24 }}
      />

      <p style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>Ingrese el número de productos que se van a reparar</p>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
              <button onClick={() => quitarModelo(i)} style={{ padding: "0 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff", color: "#999" }}>✕</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={agregarModelo} style={{ width: "100%", padding: 12, marginBottom: 20, fontSize: 13, fontWeight: 600, borderRadius: 12, border: "1px solid #e4e2da", background: "#fff", color: "#333" }}>
        + Agregar modelo
      </button>

      {error && (
        <p style={{ fontSize: 13, color: "#a32d2d", background: "#fbeaea", padding: "10px 12px", borderRadius: 10, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <button onClick={validarYPedirConfirmacion} style={botonPrimario}>
        Confirmar recepción del batch
      </button>
    </div>
  );
}
