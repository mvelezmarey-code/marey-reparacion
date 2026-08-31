import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function agrupar(arr, campo) {
  const conteo = {};
  arr.forEach((u) => {
    const valores = Array.isArray(u[campo]) ? u[campo] : [u[campo]];
    valores.forEach((v) => {
      if (!v) return;
      conteo[v] = (conteo[v] || 0) + 1;
    });
  });
  return Object.entries(conteo).map(([nombre, cantidad]) => ({ nombre, cantidad }));
}

function TablaPivot({ titulo, columnaLabel, filas }) {
  const total = filas.reduce((a, f) => a + f.cantidad, 0);
  return (
    <>
      <p style={{ fontSize: 11, color: "#999", fontWeight: 500, margin: "16px 0 6px" }}>{titulo}</p>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f4f3ee" }}>
            <td style={{ padding: "5px 8px" }}>{columnaLabel}</td>
            <td style={{ padding: "5px 8px", textAlign: "right" }}>Cantidad</td>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre} style={{ borderTop: "0.5px solid #eee" }}>
              <td style={{ padding: "5px 8px" }}>{f.nombre}</td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>{f.cantidad}</td>
            </tr>
          ))}
          <tr style={{ borderTop: "0.5px solid #eee", background: "#eef3fb", fontWeight: 500 }}>
            <td style={{ padding: "5px 8px", color: "#185fa5" }}>Total</td>
            <td style={{ padding: "5px 8px", textAlign: "right", color: "#185fa5" }}>{total}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function BatchResumen({ batch, onBack }) {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [batch.id]);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase.from("unidades").select("*").eq("batch_id", batch.id);
    setUnidades(data || []);
    setLoading(false);
  }

  const porModelo = agrupar(unidades, "modelo_codigo");
  const porPieza = agrupar(unidades, "piezas_danadas");
  const porDecision = agrupar(unidades, "decision");

  const conTiempo = unidades.filter((u) => u.tiempo_segundos != null);
  const promedioMin = conTiempo.length
    ? (conTiempo.reduce((a, u) => a + u.tiempo_segundos, 0) / conTiempo.length / 60).toFixed(1)
    : null;

  const estadoLabel = { recibido: "Recibido", abierto: "En proceso", pendiente_revision: "Pendiente de revisión", cerrado: "Cerrado" };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>Resumen #{batch.numero_transferencia}</span>
        <span style={{ fontSize: 11, color: "#3b6d11", background: "#eaf3de", borderRadius: 8, padding: "3px 8px" }}>
          {estadoLabel[batch.estado]}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <TablaPivot titulo="CALENTADORES POR MODELO" columnaLabel="Modelo" filas={porModelo} />
          <TablaPivot titulo="PIEZAS UTILIZADAS" columnaLabel="Pieza" filas={porPieza} />
          <TablaPivot titulo="DECISIONES" columnaLabel="Decisión" filas={porDecision} />

          <p style={{ fontSize: 11, color: "#999", fontWeight: 500, margin: "16px 0 6px" }}>TIEMPO DE REPARACIÓN</p>
          {promedioMin === null ? (
            <p style={{ fontSize: 12, color: "#999" }}>Sin datos de tiempo para este batch.</p>
          ) : (
            <div style={{ background: "#eef3fb", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#185fa5" }}>Tiempo de reparación promedio por unidad</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#185fa5" }}>{promedioMin} min</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
