import { useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];

export default function NuevoBatch({ onBack, onCreado }) {
  const [numero, setNumero] = useState("");
  const [items, setItems] = useState([{ modelo: MODELOS[0], cantidad: 1 }]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function agregarModelo() {
    setItems([...items, { modelo: MODELOS[0], cantidad: 1 }]);
  }
  function quitarModelo(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }
  function actualizar(i, campo, valor) {
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
    setError("");
    setGuardando(true);

    const { data: batch, error: errBatch } = await supabase
      .from("batches")
      .insert({ numero_transferencia: numero.trim(), estado: "recibido" })
      .select()
      .single();

    if (errBatch) {
      setError(errBatch.message);
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
            {MODELOS.map((m) => (
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

      {error && <p style={{ fontSize: 12, color: "#a32d2d", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={crear}
        disabled={guardando}
        style={{
          width: "100%", padding: 14, fontSize: 15, fontWeight: 600,
          background: "#185fa5", color: "#fff", border: "none", borderRadius: 12,
        }}
      >
        {guardando ? "Creando..." : "Confirmar recepción del batch"}
      </button>
    </div>
  );
}
