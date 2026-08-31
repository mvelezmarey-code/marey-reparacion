import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function BatchView({ batch, onBack, onRepararUnidad }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });

  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);
  const todoCompleto = modelosDisponibles.length === 0 && items.length > 0;

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>Batch #{batch.numero_transferencia}</span>
        <span style={{ fontSize: 11, color: "#185fa5", border: "0.5px solid #ddd", borderRadius: 8, padding: "2px 8px" }}>
          {batch.estado === "cerrado" ? "Cerrado" : todoCompleto ? "Pendiente de revisión" : "En proceso"}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <p style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 8 }}>PROGRESO</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {progreso.map((p) => (
              <div
                key={p.modelo_codigo}
                style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#f4f3ee", borderRadius: 8, fontSize: 13 }}
              >
                <span>{p.modelo_codigo}</span>
                <span style={{ color: p.pendientes === 0 ? "#3b6d11" : "#185fa5", fontWeight: 500 }}>
                  {p.completadas}/{p.cantidad_declarada}
                </span>
              </div>
            ))}
          </div>

          {modelosDisponibles.length > 0 && (
            <button
              onClick={() => onRepararUnidad(batch, modelosDisponibles)}
              style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 500, marginBottom: 18, border: "0.5px solid #185fa5", color: "#185fa5" }}
            >
              Reparar siguiente unidad
            </button>
          )}

          <p style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 8 }}>HISTORIAL</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {unidades.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Sin unidades reparadas todavía.</p>}
            {unidades.map((u) => (
              <div key={u.id} style={{ padding: 10, background: "#fff", border: "0.5px solid #eee", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}>
                  <span>{u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}</span>
                  <span style={{ color: "#666" }}>{u.decision}</span>
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
