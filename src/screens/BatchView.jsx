import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function BatchView({ batch, onBack, onRepararUnidad }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoActual, setEstadoActual] = useState(batch.estado);
  const [mostrarCompletado, setMostrarCompletado] = useState(false);

  useEffect(() => {
    cargar();
  }, [batch.id]);

  async function cargar() {
    setLoading(true);
    const { data: batchItems } = await supabase
      .from("batch_items")
      .select("modelo_codigo, cantidad_declarada")
      .eq("batch_id", batch.id);

    const { data: unidadesData } = await supabase
      .from("unidades")
      .select("*")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false });

    setItems(batchItems || []);
    setUnidades(unidadesData || []);
    setLoading(false);

    const declarado = (batchItems || []).reduce((a, i) => a + i.cantidad_declarada, 0);
    const completadas = (unidadesData || []).length;
    const completo = declarado > 0 && completadas >= declarado;

    if (completo && estadoActual !== "pendiente_revision" && estadoActual !== "cerrado") {
      await supabase.from("batches").update({ estado: "pendiente_revision" }).eq("id", batch.id);
      setEstadoActual("pendiente_revision");
      setMostrarCompletado(true);
    }
  }

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });

  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);

  const estadoLabel = {
    recibido: "En proceso",
    abierto: "En proceso",
    pendiente_revision: "Pendiente de revisión",
    cerrado: "Cerrado",
  };
  const estadoBg = {
    recibido: "#eaf0f7",
    abierto: "#eaf0f7",
    pendiente_revision: "#fdf0dc",
    cerrado: "#e6f0dd",
  };
  const estadoColor = {
    recibido: "#0f3d63",
    abierto: "#0f3d63",
    pendiente_revision: "#93650f",
    cerrado: "#2f5c17",
  };

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

  if (mostrarCompletado) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", textAlign: "center", maxWidth: 320, margin: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e6f0dd", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <div style={{ fontSize: 28, color: "#2f5c17", fontWeight: 700 }}>✓</div>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, margin: "18px 0 8px" }}>Batch completado</p>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px", lineHeight: 1.5 }}>
            Reparaste todas las unidades de la transferencia #{batch.numero_transferencia}. Queda pendiente de revisión por el supervisor.
          </p>
          <button
            onClick={onBack}
            style={{ width: "100%", padding: 14, fontSize: 14, fontWeight: 700, background: "#0f3d63", color: "#fff", border: "none", borderRadius: 12 }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1, color: "#222" }}>#{batch.numero_transferencia}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: estadoColor[estadoActual],
          background: estadoBg[estadoActual], borderRadius: 20, padding: "5px 12px",
        }}>
          {estadoLabel[estadoActual]}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#999", letterSpacing: 0.3, textTransform: "uppercase", margin: "0 0 10px" }}>
            Cantidad producto por arreglar
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {progreso.map((p) => {
              const pct = Math.round((p.completadas / p.cantidad_declarada) * 100);
              return (
                <div key={p.modelo_codigo} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>{p.modelo_codigo}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: p.pendientes === 0 ? "#2f5c17" : "#0f3d63" }}>
                      {p.completadas}/{p.cantidad_declarada}
                    </span>
                  </div>
                  <div style={{ background: "#eee", borderRadius: 6, height: 5, overflow: "hidden" }}>
                    <div style={{ background: p.pendientes === 0 ? "#2f5c17" : "#0f3d63", height: "100%", width: `${pct}%`, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {modelosDisponibles.length > 0 && (
            <button
              onClick={() => onRepararUnidad(batch, modelosDisponibles)}
              style={{
                width: "100%", padding: 15, fontSize: 15, fontWeight: 700, marginBottom: 16,
                background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14,
              }}
            >
              Comenzar reparación
            </button>
          )}

          <p style={{ fontSize: 12, fontWeight: 700, color: "#999", letterSpacing: 0.3, textTransform: "uppercase", margin: "0 0 10px" }}>
            Historial de reparación
          </p>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            {unidades.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Sin unidades reparadas todavía.</p>}
            {unidades.map((u) => (
              <div key={u.id} style={{ padding: 12, background: "#fff", borderRadius: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#222" }}>
                  <span>{u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}</span>
                  <span style={{ color: "#666", fontSize: 12, fontWeight: 500 }}>{u.decision}</span>
                </div>
                <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>
                  {(u.piezas_danadas || []).join(", ")}
                  {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
