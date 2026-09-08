import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DECISIONES_QUE_REEMPLAZAN = ["Refurbished", "Nuevo", "PPKIT", "ECO-KIT", "ECO-KIT110", "Tripa"];
const DECISIONES_QUE_DESCARTAN = ["Descartar", "Dummy"];

export default function Estadisticas({ onBack }) {
  const [modelo, setModelo] = useState(MODELOS[0]);
  const [anio, setAnio] = useState(2026);
  const [unidades, setUnidades] = useState([]);
  const [decisiones, setDecisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [modelo, anio]);

  async function cargar() {
    setLoading(true);
    const { data: unidadesData } = await supabase
      .from("unidades")
      .select("piezas_danadas, decision, created_at")
      .eq("modelo_codigo", modelo)
      .gte("created_at", `${anio}-01-01`)
      .lte("created_at", `${anio}-12-31`);

    const { data: decisionesData } = await supabase
      .from("v_decisiones_por_mes")
      .select("*")
      .eq("modelo_codigo", modelo)
      .eq("anio", anio);

    setUnidades(unidadesData || []);
    setDecisiones(decisionesData || []);
    setLoading(false);
  }

  function pivotearPiezas(filtroDecisiones) {
    const filtradas = unidades.filter((u) => filtroDecisiones.includes(u.decision));
    const nombresUnicos = new Set();
    filtradas.forEach((u) => (u.piezas_danadas || []).forEach((p) => nombresUnicos.add(p)));

    return [...nombresUnicos].map((nombre) => {
      const porMes = Array(12).fill(0);
      let total = 0;
      filtradas.forEach((u) => {
        if ((u.piezas_danadas || []).includes(nombre)) {
          const mes = new Date(u.created_at).getMonth();
          porMes[mes]++;
          total++;
        }
      });
      return { nombre, porMes, total };
    });
  }

  function pivotearDecisiones(rows) {
    const nombres = [...new Set(rows.map((r) => r.decision))];
    return nombres.map((nombre) => {
      const porMes = Array(12).fill(0);
      let total = 0;
      rows.filter((r) => r.decision === nombre).forEach((r) => {
        porMes[r.mes - 1] = r.cantidad;
        total += r.cantidad;
      });
      return { nombre, porMes, total };
    });
  }

  const filasReemplazadas = pivotearPiezas(DECISIONES_QUE_REEMPLAZAN);
  const filasDescartadas = pivotearPiezas(DECISIONES_QUE_DESCARTAN);
  const filasDecisiones = pivotearDecisiones(decisiones);

  function totalesPorMes(filas) {
    const totales = Array(12).fill(0);
    filas.forEach((f) => f.porMes.forEach((v, i) => (totales[i] += v)));
    return totales;
  }

  const totalesReemplazadas = totalesPorMes(filasReemplazadas);
  const totalesDescartadas = totalesPorMes(filasDescartadas);
  const totalesDecisiones = totalesPorMes(filasDecisiones);

  function Tabla({ titulo, nota, notaColor, filas, totalesPorMes: totales }) {
    return (
      <>
        <p style={{ fontSize: 11, color: "#999", fontWeight: 600, margin: "16px 0 2px" }}>{titulo}</p>
        {nota && <p style={{ fontSize: 11, color: notaColor, margin: "0 0 6px" }}>{nota}</p>}
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
              {filas.length === 0 && (
                <tr><td colSpan={14} style={{ padding: "8px 6px", color: "#999" }}>Sin registros</td></tr>
              )}
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
                {totales.map((v, i) => (
                  <td key={i} style={{ padding: "4px 6px", textAlign: "center" }}>{v}</td>
                ))}
                <td style={{ padding: "4px 6px", textAlign: "center" }}>
                  {totales.reduce((a, b) => a + b, 0)}
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
          <Tabla
            titulo="PIEZAS REEMPLAZADAS POR MES"
            nota="Estas sí consumen inventario"
            notaColor="#3b6d11"
            filas={filasReemplazadas}
            totalesPorMes={totalesReemplazadas}
          />
          <Tabla
            titulo="PIEZAS ENCONTRADAS EN UNIDADES DESCARTADAS"
            nota="Solo diagnóstico · no representa consumo de inventario"
            notaColor="#854f0b"
            filas={filasDescartadas}
            totalesPorMes={totalesDescartadas}
          />
          <Tabla
            titulo="DECISIONES POR MES"
            filas={filasDecisiones}
            totalesPorMes={totalesDecisiones}
          />
        </>
      )}
    </div>
  );
}
