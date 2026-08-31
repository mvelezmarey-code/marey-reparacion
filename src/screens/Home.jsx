import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home({ tecnico, onOpenBatch, onVerResumen, onNuevoBatch, onVerEstadisticas, onSalir }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarBatches();
  }, []);

  async function cargarBatches() {
    setLoading(true);
    const { data } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    setBatches(data || []);
    setLoading(false);
  }

  const batchActual = batches.find((b) => b.estado === "abierto" || b.estado === "recibido");
  const historial = batches.filter((b) => b.id !== batchActual?.id);

  const estadoLabel = {
    recibido: "Recibido",
    abierto: "En proceso",
    pendiente_revision: "Pendiente de revisión",
    cerrado: "Cerrado",
  };
  const estadoColor = {
    recibido: "#185fa5",
    abierto: "#185fa5",
    pendiente_revision: "#854f0b",
    cerrado: "#3b6d11",
  };

  function abrirDeHistorial(b) {
    if (b.estado === "cerrado" || b.estado === "pendiente_revision") {
      onVerResumen(b);
    } else {
      onOpenBatch(b);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#666" }}>Hola, {tecnico}</span>
        <button onClick={onSalir} style={{ fontSize: 12, padding: "4px 8px", background: "transparent", border: "0.5px solid #ddd", borderRadius: 8 }}>
          Cambiar
        </button>
      </div>

      <button
        onClick={onNuevoBatch}
        style={{
          width: "100%",
          padding: 16,
          fontSize: 15,
          fontWeight: 600,
          background: "#185fa5",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        + Nueva transferencia
      </button>

      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>BATCH ACTUAL</p>
      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : batchActual ? (
        <div
          onClick={() => onOpenBatch(batchActual)}
          style={{
            background: "#eef3fb",
            border: "2px solid #185fa5",
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#185fa5" }}>#{batchActual.numero_transferencia}</span>
            <span style={{ fontSize: 11, color: "#185fa5", background: "#fff", borderRadius: 20, padding: "3px 10px" }}>
              {estadoLabel[batchActual.estado]}
            </span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>No tienes un batch activo.</p>
      )}

      <p style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>HISTORIAL</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {historial.map((b) => (
          <div
            key={b.id}
            onClick={() => abrirDeHistorial(b)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "#fff",
              borderRadius: 10,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ color: "#666" }}>#{b.numero_transferencia}</span>
            <span style={{ color: estadoColor[b.estado], fontSize: 11, fontWeight: 500 }}>{estadoLabel[b.estado]}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onVerEstadisticas}
        style={{ width: "100%", padding: 12, fontSize: 13, background: "#fff", border: "0.5px solid #ddd", borderRadius: 10 }}
      >
        Ver estadísticas completas
      </button>
    </div>
  );
}
