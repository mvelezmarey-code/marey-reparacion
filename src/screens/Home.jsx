import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home({ tecnico, onOpenBatch, onNuevoBatch, onVerHistorial, onVerEstadisticas, onSalir }) {
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
      .limit(50);
    setBatches(data || []);
    setLoading(false);
  }

  const batchesActivos = batches.filter((b) => b.estado === "abierto" || b.estado === "recibido");
  const historialCount = batches.filter((b) => b.estado === "pendiente_revision" || b.estado === "cerrado").length;

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ textAlign: "center", fontSize: 10, color: "#ccc", marginBottom: 8 }}>BUILD v6-31ago-2145</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: "#666" }}>Hola, {tecnico}</span>
        <button onClick={onSalir} style={{ fontSize: 11, padding: "5px 10px", background: "transparent", border: "0.5px solid #ddd", borderRadius: 8 }}>
          Cambiar
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#185fa5", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>1</div>
            <button
              onClick={onNuevoBatch}
              style={{ flex: 1, textAlign: "left", padding: 16, background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "none" }}
            >
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Registra una nueva transferencia</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>Recibir mercancía para reparar</p>
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: batchesActivos.length > 0 ? "#185fa5" : "#fff", color: batchesActivos.length > 0 ? "#fff" : "#999",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0,
              border: batchesActivos.length > 0 ? "none" : "1px solid #ddd",
            }}>2</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#666", fontWeight: 600 }}>Reparación en Progreso</p>
              {batchesActivos.length === 0 ? (
                <div style={{ padding: 16, background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#999" }}>No tienes batches activos.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {batchesActivos.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onOpenBatch(b)}
                      style={{ textAlign: "left", padding: 14, background: "#eef3fb", border: "2px solid #185fa5", borderRadius: 14 }}
                    >
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#185fa5" }}>
                        Transferencia #{b.numero_transferencia}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#185fa5" }}>En proceso</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#fff", color: "#999",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0,
              border: "1px solid #ddd",
            }}>3</div>
            <button
              onClick={onVerHistorial}
              style={{ flex: 1, textAlign: "left", padding: 16, background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Historial de producto arreglado</p>
                <span style={{ fontSize: 11, color: "#666", background: "#f4f3ee", borderRadius: 20, padding: "3px 10px" }}>
                  {historialCount}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>Batches completados y en revisión</p>
            </button>
          </div>

          <button
            onClick={onVerEstadisticas}
            style={{ width: "100%", padding: 12, fontSize: 13, background: "#fff", border: "0.5px solid #ddd", borderRadius: 12 }}
          >
            📊 Ver estadísticas completas
          </button>
        </>
      )}
    </div>
  );
}
