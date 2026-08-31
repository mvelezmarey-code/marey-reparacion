import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Historial({ onBack, onVerResumen }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .in("estado", ["pendiente_revision", "cerrado"])
      .order("created_at", { ascending: false })
      .limit(50);
    setBatches(data || []);
    setLoading(false);
  }

  const estadoLabel = {
    pendiente_revision: "Pendiente de revisión",
    cerrado: "Cerrado",
  };
  const estadoBg = {
    pendiente_revision: "#fdf3e3",
    cerrado: "#eaf3de",
  };
  const estadoColor = {
    pendiente_revision: "#8a5a10",
    cerrado: "#3b6d11",
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Historial de producto arreglado</span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : batches.length === 0 ? (
        <p style={{ fontSize: 13, color: "#999" }}>Todavía no hay batches terminados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {batches.map((b) => (
            <div
              key={b.id}
              onClick={() => onVerResumen(b)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", background: "#fff", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>#{b.numero_transferencia}</span>
              <span style={{
                fontSize: 11, fontWeight: 500, color: estadoColor[b.estado],
                background: estadoBg[b.estado], borderRadius: 20, padding: "4px 10px",
              }}>
                {estadoLabel[b.estado]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
