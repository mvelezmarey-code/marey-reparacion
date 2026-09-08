import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DECISIONES_QUE_REEMPLAZAN = ["Refurbished", "Nuevo", "PPKIT", "ECO-KIT", "ECO-KIT110", "Tripa"];
const DECISIONES_QUE_DESCARTAN = ["Descartar", "Dummy"];

function inicioSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - (dia === 0 ? 6 : dia - 1);
  return new Date(d.setDate(diff));
}

function formatoFecha(fecha) {
  return fecha.toISOString().split("T")[0];
}

function contarPiezas(unidades, filtroDecisiones) {
  const conteo = {};
  unidades
    .filter((u) => filtroDecisiones.includes(u.decision))
    .forEach((u) => {
      (u.piezas_danadas || []).forEach((p) => {
        conteo[p] = (conteo[p] || 0) + 1;
      });
    });
  return Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

function TablaPiezas({ titulo, nota, notaColor, filas }) {
  const total = filas.reduce((a, f) => a + f.cantidad, 0);
  return (
    <>
      <p style={{ fontSize: 12, color: "#999", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", margin: "16px 0 2px" }}>{titulo}</p>
      <p style={{ fontSize: 11, color: notaColor, margin: "0 0 8px" }}>{nota}</p>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f5f4f1" }}>
            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#666" }}>Pieza</td>
            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#666" }}>Cantidad</td>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={2} style={{ padding: "10px 12px", color: "#999" }}>Sin registros</td></tr>
          )}
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

export default function PiezasReporte({ onBack }) {
  const [pestana, setPestana] = useState("diario");
  const [fechaDia, setFechaDia] = useState(new Date());
  const [semanaBase, setSemanaBase] = useState(inicioSemana(new Date()));
  const [mes, setMes] = useState(new Date().getMonth());
  const [anioMensual, setAnioMensual] = useState(new Date().getFullYear());
  const [anioHistorico, setAnioHistorico] = useState(new Date().getFullYear());
  const [rangoDesde, setRangoDesde] = useState(formatoFecha(new Date(Date.now() - 14 * 86400000)));
  const [rangoHasta, setRangoHasta] = useState(formatoFecha(new Date()));
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [pestana, fechaDia, semanaBase, mes, anioMensual, anioHistorico, rangoDesde, rangoHasta]);

  async function cargar() {
    setLoading(true);
    let desde, hasta;

    if (pestana === "diario") {
      desde = formatoFecha(fechaDia);
      hasta = formatoFecha(fechaDia);
    } else if (pestana === "semanal") {
      const fin = new Date(semanaBase);
      fin.setDate(fin.getDate() + 6);
      desde = formatoFecha(semanaBase);
      hasta = formatoFecha(fin);
    } else if (pestana === "mensual") {
      const inicio = new Date(anioMensual, mes, 1);
      const fin = new Date(anioMensual, mes + 1, 0);
      desde = formatoFecha(inicio);
      hasta = formatoFecha(fin);
    } else if (pestana === "rango") {
      desde = rangoDesde;
      hasta = rangoHasta;
    } else {
      desde = `${anioHistorico}-01-01`;
      hasta = `${anioHistorico}-12-31`;
    }

    const { data } = await supabase
      .from("unidades")
      .select("piezas_danadas, decision, created_at")
      .gte("created_at", desde + "T00:00:00")
      .lte("created_at", hasta + "T23:59:59");

    setUnidades(data || []);
    setLoading(false);
  }

  const filasReemplazadas = contarPiezas(unidades, DECISIONES_QUE_REEMPLAZAN);
  const filasDescartadas = contarPiezas(unidades, DECISIONES_QUE_DESCARTAN);

  const tabStyle = (activa) => ({
    flex: 1, padding: "8px 4px", fontSize: 10, fontWeight: 600, border: "none", borderRadius: 9,
    background: activa ? "#0f3d63" : "transparent", color: activa ? "#fff" : "#999",
  });

  function etiquetaPeriodo() {
    if (pestana === "diario") return fechaDia.toLocaleDateString("es-PR", { day: "numeric", month: "short" });
    if (pestana === "semanal") {
      const fin = new Date(semanaBase);
      fin.setDate(fin.getDate() + 6);
      return `${semanaBase.toLocaleDateString("es-PR", { day: "numeric", month: "short" })} - ${fin.toLocaleDateString("es-PR", { day: "numeric", month: "short" })}`;
    }
    if (pestana === "mensual") return `${MESES[mes]} ${anioMensual}`;
    if (pestana === "rango") return `${new Date(rangoDesde).toLocaleDateString("es-PR", { day: "numeric", month: "short" })} - ${new Date(rangoHasta).toLocaleDateString("es-PR", { day: "numeric", month: "short" })}`;
    return `${anioHistorico}`;
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 20, background: "#f5f4f1", minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1, color: "#222" }}>Reporte de piezas</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#fff", padding: 4, borderRadius: 12 }}>
        <button onClick={() => setPestana("diario")} style={tabStyle(pestana === "diario")}>Diario</button>
        <button onClick={() => setPestana("semanal")} style={tabStyle(pestana === "semanal")}>Semanal</button>
        <button onClick={() => setPestana("mensual")} style={tabStyle(pestana === "mensual")}>Mensual</button>
        <button onClick={() => setPestana("historico")} style={tabStyle(pestana === "historico")}>Histórico</button>
        <button onClick={() => setPestana("rango")} style={tabStyle(pestana === "rango")}>Rango</button>
      </div>

      {pestana === "diario" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() - 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{etiquetaPeriodo()}</span>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() + 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>›</button>
        </div>
      )}

      {pestana === "semanal" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setSemanaBase(new Date(semanaBase.getTime() - 7 * 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{etiquetaPeriodo()}</span>
          <button onClick={() => setSemanaBase(new Date(semanaBase.getTime() + 7 * 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>›</button>
        </div>
      )}

      {pestana === "mensual" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={anioMensual} onChange={(e) => setAnioMensual(Number(e.target.value))} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      {pestana === "historico" && (
        <select value={anioHistorico} onChange={(e) => setAnioHistorico(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e4e2da", background: "#fff", marginBottom: 14 }}>
          {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}

      {pestana === "rango" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "#999", margin: "0 0 4px" }}>Desde</p>
            <input type="date" value={rangoDesde} onChange={(e) => setRangoDesde(e.target.value)} style={{ width: "100%", padding: 9, borderRadius: 10, border: "1px solid #e4e2da", fontSize: 12, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "#999", margin: "0 0 4px" }}>Hasta</p>
            <input type="date" value={rangoHasta} onChange={(e) => setRangoHasta(e.target.value)} style={{ width: "100%", padding: 9, borderRadius: 10, border: "1px solid #e4e2da", fontSize: 12, boxSizing: "border-box" }} />
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : (
        <>
          <TablaPiezas
            titulo="Piezas reemplazadas"
            nota={`${etiquetaPeriodo()} · estas sí consumen inventario`}
            notaColor="#2f5c17"
            filas={filasReemplazadas}
          />
          <TablaPiezas
            titulo="Piezas encontradas en unidades descartadas"
            nota={`${etiquetaPeriodo()} · solo diagnóstico`}
            notaColor="#93650f"
            filas={filasDescartadas}
          />
        </>
      )}
    </div>
  );
}
