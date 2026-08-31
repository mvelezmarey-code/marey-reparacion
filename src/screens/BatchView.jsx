import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function BatchView({ batch, onBack, onRepararUnidad }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoActual, setEstadoActual] = useState(batch.estado);

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
    } else if (!completo && estadoActual === "recibido" && completadas > 0) {
      await supabase.from("batches").update({ estado: "abierto" }).eq("id", batch.id);
      setEstadoActual("abierto");
    }
  }

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });

  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);

  const estadoLabel = {
    recibido: "Recibido",
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

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "6px 10px", borderRadius: 8 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>#{batch.numero_transferencia}</span>
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
          <p style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>PROGRESO</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {progreso.map((p) => {
              const pct = Math.round((p.completadas / p.cantidad_declarada) * 100);
              return (
                <div
