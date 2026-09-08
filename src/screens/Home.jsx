import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home({ tecnico, onOpenBatch, onNuevoBatch, onVerHistorial, onVerEstadisticas, onVerReparaciones, onSalir }) {
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

  const numeroCirculo = (activo) => ({
    width: 32, height: 32, borderRadius: "50%",
    background: activo ? "#0f3d63" : "#e4e2da",
    color: activo ? "#fff" : "#999",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  });

  const tarjeta = {
    flex: 1, textAlign: "left", padding: 16, background: "#fff",
    borderRadius: 16, border: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#222" }}>{tecnico}</span>
        <button
          onClick={onSalir}
          style={{ fontSize: 12, fontWeight: 600, padding: "8px 14px", background: "#fff", border: "1px solid #e4e2da", borderRadius: 10, color: "#666" }}
        >
          Cambiar
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={numeroCirculo(true)}>1</div>
            <button onClick={onNuevoBatch} style={tarjeta}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#222" }}>Registra una nueva transferencia</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999" }}>Recibir mercancía para reparar</p>
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
            <div style={numeroCirculo(batchesActivos.length > 0)}>2</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#999", letterSpacing: 0.3, textTransform: "uppercase" }}>
                Reparación en Progreso
              </p>
              {batchesActivos.length === 0 ? (
                <div style={{ ...tarjeta, flex: "none" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#999" }}>No tienes batches activos</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
                  {batchesActivos.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onOpenBatch(b)}
                      style={{
                        textAlign: "left", padding: 14, background: "#eaf0f7",
                        border: "1.5px solid #0f3d63", borderRadius: 14, flexShrink: 0,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f3d63" }}>
                        Transferencia #{b.numero_transferencia}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#0f3d63" }}>En proceso</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={numeroCirculo(historialCount > 0)}>3</div>
            <button onClick={onVerHistorial} style={tarjeta}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#222" }}>Historial de producto arreglado</p>
