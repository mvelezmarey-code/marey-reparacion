import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Revision({ onBack, onVerResumen }) {
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
      .eq("estado", "pendiente_revision")
      .order("created_at", { ascending: true });
    setBatches(data || []);
    setLoading(false);
  }

  async function confirmarCierre(batch) {
    await supabase.from("batches").update({ estado: "cerrado", closed_at: new Date().toISOString() }).eq("id", batch.id);
    cargar();
  }

  async function regresarAbierto(batch) {
    await supabase.from("batches").update({ estado: "abierto" }).eq("id", batch.id);
    cargar();
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Revisión de batches</span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : batches.length === 0 ? (
        <p style={{ fontSize: 13, color: "#999" }}>No hay batches pendientes de revisión.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {batches.map((b) => (
            <div key={b.id} style={{ background: "#fff", border: "0.5px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>#{b.numero_transferencia}</span>
                <button onClick={() => onVerResumen(b)} style={{ fontSize: 11, padding: "4px 8px" }}>Ver detalle</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => regresarAbierto(b)}
                  style={{ flex: 1, padding: 8, fontSize: 12, border: "0.5px solid #a32d2d", color: "#a32d2d" }}
                >
                  Regresar
                </button>
                <button
                  onClick={() => confirmarCierre(b)}
                  style={{ flex: 1, padding: 8, fontSize: 12, border: "0.5px solid #185fa5", color: "#185fa5" }}
                >
                  Confirmar cierre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
