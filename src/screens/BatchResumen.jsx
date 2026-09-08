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
      <p style={{ fontSize: 12, color: "#999", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", margin: "18px 0 8px" }}>{titulo}</p>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f5f4f1" }}>
            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#666" }}>{columnaLabel}</td>
            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#666" }}>Cantidad</td>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre} style={{ borderTop: "1px solid #f0efec" }}>
              <td style={{ padding: "8px 12px", color: "#222" }}>{f.nombre}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: "#222" }}>{f.cantidad}</td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid #f0efec", background: "#eaf0f7", fontWeight: 700 }}>
            <td style={{ padding: "8px 12px", color: "#0f3d63" }}>Total</td>
            <td style={{ padding: "8px 12px", textAlign: "right", color: "#0f3d63" }}>{total}</td>
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
    const { data } = await supabase
      .from("unidades")
      .select("*")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: true });
    setUnidades(data || []);
    setLoading(false);
  }

  const porModelo = agrupar(unidades, "modelo_codigo");
  const porDecision = agrupar(unidades, "decision");

  const modelosUnicos = [...new Set(unidades.map((u) => u.modelo_codigo))];
  const piezasPorModelo = modelosUnicos.map((modelo) => {
    const unidadesDeEsteModelo = unidades.filter((u) => u.modelo_codigo === modelo);
    const piezas = agrupar(unidadesDeEsteModelo, "piezas_danadas");
    return { modelo, piezas };
  });

  const porTecnico = Object.entries(
    unidades.reduce((acc, u) => {
      const nombre = u.tecnico_nombre || "Sin registrar";
      acc[nombre] = (acc[nombre] || 0) + 1;
      return acc;
    }, {})
  ).map(([nombre, cantidad]) => ({ nombre, cantidad }));

  const conTiempo = unidades.filter((u) => u.tiempo_segundos != null);
  const promedioMin = conTiempo.length
    ? (conTiempo.reduce((a, u) => a + u.tiempo_segundos, 0) / conTiempo.length / 60).toFixed(1)
    : null;

  const estadoLabel = { recibido: "En proceso", abierto: "En proceso", pendiente_revision: "Pendiente de revisión", cerrado: "Cerrado" };
  const estadoBg = { recibido: "#eaf0f7", abierto: "#eaf0f7", pendiente_revision: "#fdf0dc", cerrado: "#e6f0dd" };
  const estadoColor = { recibido: "#0f3d63", abierto: "#0f3d63", pendiente_revision: "#93650f", cerrado: "#2f5c17" };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 20, background: "#f5f4f1", minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1, color: "#222" }}>Resumen #{batch.numero_transferencia}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: estadoColor[batch.estado], background: estadoBg[batch.estado], borderRadius: 20, padding: "5px 12px" }}>
          {estadoLabel[batch.estado]}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <TablaPivot titulo="Calentadores por modelo" columnaLabel="Modelo" filas={porModelo} />

          <p style={{ fontSize: 12, color: "#999", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", margin: "18px 0 10px" }}>
            Piezas dañadas por modelo
          </p>
          {piezasPorModelo.map(({ modelo, piezas }) => (
            <div key={modelo} style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f3d63", margin: "0 0 8px" }}>{modelo}</p>
              {piezas.map((p) => (
                <div key={p.nombre} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid #f0efec" }}>
                  <span style={{ color: "#222" }}>{p.nombre}</span>
                  <span style={{ color: "#666" }}>{p.cantidad}</span>
                </div>
              ))}
            </div>
          ))}

          <TablaPivot titulo="Decisiones" columnaLabel="Decisión" filas={porDecision} />

          <p style={{ fontSize: 12, color: "#999", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", margin: "18px 0 8px" }}>
            Tiempo de reparación
          </p>
          {promedioMin === null ? (
            <p style={{ fontSize: 12, color: "#999" }}>Sin datos de tiempo para este batch.</p>
          ) : (
            <div style={{ background: "#eaf0f7", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#0f3d63" }}>Tiempo de reparación promedio por unidad</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f3d63" }}>{promedioMin} min</span>
            </div>
          )}

          <TablaPivot titulo="Total arreglado por técnico" columnaLabel="Técnico" filas={porTecnico} />

          <p style={{ fontSize: 12, color: "#999", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", margin: "18px 0 8px" }}>
            Historial por hora
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unidades.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Sin unidades registradas.</p>}
            {unidades.map((u) => {
              const hora = new Date(u.created_at).toLocaleTimeString("es-PR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fff", borderRadius: 10, fontSize: 12 }}>
                  <span style={{ color: "#999", fontWeight: 600, minWidth: 48 }}>{hora}</span>
                  <span style={{ flex: 1, color: "#222", padding: "0 8px" }}>{u.modelo_codigo}</span>
                  <span style={{ color: "#666" }}>{u.tecnico_nombre || "—"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
