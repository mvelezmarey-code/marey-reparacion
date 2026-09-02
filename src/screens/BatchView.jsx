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
    recibido: "#eef3fb",
    abierto: "#eef3fb",
    pendiente_revision: "#fdf3e3",
    cerrado: "#eaf3de",
  };
  const estadoColor = {
    recibido: "#185fa5",
    abierto: "#185fa5",
    pendiente_revision: "#8a5a10",
    cerrado: "#3b6d11",
  };

  if (mostrarCompletado) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "28px 24px", textAlign: "center", maxWidth: 320, margin: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 52, color: "#3b6d11" }}>✓</div>
          <p style={{ fontSize: 17, fontWeight: 600, margin: "14px 0 6px" }}>¡Batch completado!</p>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
            Reparaste todas las unidades de la transferencia #{batch.numero_transferencia}. Queda pendiente de revisión por el supervisor.
          </p>
          <button
            onClick={onBack}
            style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 600, background: "#185fa5", color: "#fff", border: "none", borderRadius: 10 }}
          >
            OK, volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>Número de transferencia #{batch.numero_transferencia}</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <span style={{
          fontSize: 12, fontWeight: 500, color: estadoColor[estadoActual],
          background: estadoBg[estadoActual], borderRadius: 20, padding: "4px 12px",
        }}>
          {estadoLabel[estadoActual]}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <p style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>CANTIDAD PRODUCTO POR ARREGLAR</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {progreso.map((p) => {
              const pct = Math.round((p.completadas / p.cantidad_declarada) * 100);
              return (
                <div key={p.modelo_codigo} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{p.modelo_codigo}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.pendientes === 0 ? "#3b6d11" : "#185fa5" }}>
                      {p.completadas}/{p.cantidad_declarada}
                    </span>
                  </div>
                  <div style={{ background: "#eee", borderRadius: 6, height: 6, overflow: "hidden" }}>
                    <div style={{ background: p.pendientes === 0 ? "#3b6d11" : "#185fa5", height: "100%", width: `${pct}%`, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {modelosDisponibles.length > 0 && (
            <button
              onClick={() => onRepararUnidad(batch, modelosDisponibles)}
              style={{
                width: "100%", padding: 14, fontSize: 15, fontWeight: 600, marginBottom: 20,
                background: "#185fa5", color: "#fff", border: "none", borderRadius: 12,
              }}
            >
              🔧 Comenzar reparación
            </button>
          )}

          <p style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>HISTORIAL DE REPARACIÓN</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {unidades.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Sin unidades reparadas todavía.</p>}
            {unidades.map((u) => (
              <div key={u.id} style={{ padding: 12, background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}>
                  <span>{u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}</span>
                  <span style={{ color: "#666", fontSize: 12 }}>{u.decision}</span>
                </div>
                <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>
                  {(u.piezas_danadas || []).join(", ")}
                  {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
