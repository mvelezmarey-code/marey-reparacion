import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function Estadisticas({ onBack }) {
  const [modelo, setModelo] = useState(MODELOS[0]);
  const [anio, setAnio] = useState(2026);
  const [piezas, setPiezas] = useState([]);
  const [decisiones, setDecisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [modelo, anio]);

  async function cargar() {
    setLoading(true);
    const { data: p } = await supabase
      .from("v_piezas_por_mes")
      .select("*")
      .eq("modelo_codigo", modelo)
      .eq("anio", anio);
    const { data: d } = await supabase
      .from("v_decisiones_por_mes")
      .select("*")
      .eq("modelo_codigo", modelo)
      .eq("anio", anio);
    setPiezas(p || []);
    setDecisiones(d || []);
    setLoading(false);
  }

  function pivotear(rows, campoNombre) {
    const nombres = [...new Set(rows.map((r) => r[campoNombre]))];
    return nombres.map((nombre) => {
      const porMes = Array(12).fill(0);
      let total = 0;
      rows.filter((r) => r[campoNombre] === nombre).forEach((r) => {
        porMes[r.mes - 1] = r.cantidad;
        total += r.cantidad;
      });
      return { nombre, porMes, total };
    });
  }

  const filasPiezas = pivotear(piezas, "pieza");
  const filasDecisiones = pivotear(decisiones, "decision");
  const totalesPorMesPiezas = Array(12).fill(0);
  filasPiezas.forEach((f) => f.porMes.forEach((v, i) => (totalesPorMesPiezas[i] += v)));
  const totalesPorMesDecisiones = Array(12).fill(0);
  filasDecisiones.forEach((f) => f.porMes.forEach((v, i) => (totalesPorMesDecisiones[i] += v)));

  function Tabla({ titulo, filas, totalesPorMes }) {
    return (
      <>
        <p style={{ fontSize: 11, color: "#999", fontWeight: 500, margin: "16px 0 6px" }}>{titulo}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ fontSize: 10, borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead>
              <tr style={{ background: "#f4f3ee" }}>
                <td style={{ padding: "4px 6px", textAlign: "left" }}>—</td>
                {MESES.map((m) => (
                  <td key={m} style={{ padding: "4px 6px", textAlign: "center" }}>{m}</td>
                ))}
                <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 500 }}>Total</td>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre} style={{ borderTop: "0.5px solid #eee" }}>
                  <td style={{ padding: "4px 6px", color: "#185fa5" }}>{f.nombre}</td>
                  {f.porMes.map((v, i) => (
                    <td key={i} style={{ padding: "4px 6px", textAlign: "center" }}>{v || 0}</td>
                  ))}
                  <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 500 }}>{f.total}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "0.5px solid #eee", background: "#f4f3ee", fontWeight: 500 }}>
                <td style={{ padding: "4px 6px" }}>Total</td>
                {totalesPorMes.map((v, i) => (
                  <td key={i} style={{ padding: "4px 6px", textAlign: "center" }}>{v}</td>
                ))}
                <td style={{ padding: "4px 6px", textAlign: "center" }}>
                  {totalesPorMes.reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Estadísticas</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={modelo} onChange={(e) => setModelo(e.target.value)} style={{ flex: 1, padding: 8, border: "0.5px solid #ddd", borderRadius: 8 }}>
          {MODELOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ flex: 1, padding: 8, border: "0.5px solid #ddd", borderRadius: 8 }}>
          {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <Tabla titulo="PIEZAS DAÑADAS POR MES" filas={filasPiezas} totalesPorMes={totalesPorMesPiezas} />
          <Tabla titulo="DECISIONES POR MES" filas={filasDecisiones} totalesPorMes={totalesPorMesDecisiones} />
        </>
      )}
    </div>
  );
}
