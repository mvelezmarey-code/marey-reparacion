import { useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];

export default function NuevoBatch({ onBack, onCreado }) {
  const [numero, setNumero] = useState("");
  const [items, setItems] = useState([{ modelo: MODELOS[0], cantidad: 1 }]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

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

  async function crear() {
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
    setGuardando(true);

    try {
      const { data: batch, error: errBatch } = await supabase
        .from("batches")
        .insert({ numero_transferencia: numero.trim(), estado: "recibido" })
        .select()
        .single();

      if (errBatch) {
        const mensaje = errBatch.message.includes("duplicate") || errBatch.message.includes("unique")
          ? "Ese número de transferencia ya existe. Usa uno distinto."
          : errBatch.message;
        setError(mensaje);
        setGuardando(false);
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
        return;
      }

      setGuardando(false);
      onCreado(batch);
    } catch (e) {
      console.error("Error creando batch:", e);
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Nueva transferencia</span>
      </div>

      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Ingrese el número de transferencia.</p>
      <input
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        placeholder="TR-4900"
        style={{ width: "100%", padding: 12, marginBottom: 20, border: "0.5px solid #ddd", borderRadius: 10 }}
      />

      <p style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>Ingrese el número de productos que se van a reparar.</p>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <select
            value={it.modelo}
            onChange={(e) => actualizar(i, "modelo", e.target.value)}
            style={{ flex: 2, padding: 10, border: "0.5px solid #ddd", borderRadius: 10 }}
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
            style={{ flex: 1, padding: 10, border: "0.5px solid #ddd", borderRadius: 10 }}
          />
          {items.length > 1 && (
            <button onClick={() => quitarModelo(i)} style={{ padding: "0 10px", borderRadius: 8 }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={agregarModelo} style={{ width: "100%", padding: 10, marginBottom: 20, fontSize: 13, borderRadius: 10 }}>
        + Agregar modelo
      </button>

      {error && (
        <p style={{ fontSize: 13, color: "#a32d2d", background: "#fbeaea", padding: "10px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <button
        onClick={crear}
        disabled={guardando}
        style={{
          width: "100%", padding: 14, fontSize: 15, fontWeight: 600,
          background: guardando ? "#8bb3d9" : "#185fa5", color: "#fff", border: "none", borderRadius: 12,
        }}
      >
        {guardando ? "Guardando..." : "Confirmar recepción del batch"}
      </button>
    </div>
  );
}
