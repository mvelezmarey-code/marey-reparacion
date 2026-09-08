import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function inicioSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - (dia === 0 ? 6 : dia - 1);
  return new Date(d.setDate(diff));
}

function formatoFecha(fecha) {
  return fecha.toISOString().split("T")[0];
}

function descargarCSV(nombreArchivo, filas) {
  const contenido = filas.map((fila) => fila.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reparaciones({ tecnico, onBack }) {
  const [pestana, setPestana] = useState("diario");
  const [fechaDia, setFechaDia] = useState(new Date());
  const [semanaBase, setSemanaBase] = useState(inicioSemana(new Date()));
  const [mes, setMes] = useState(new Date().getMonth());
  const [anioMensual, setAnioMensual] = useState(new Date().getFullYear());
  const [anioHistorico, setAnioHistorico] = useState(new Date().getFullYear());
  const [unidades, setUnidades] = useState([]);
  const [volumenAnual, setVolumenAnual] = useState([]);
  const [decisionesAnual, setDecisionesAnual] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [tecnicoDecision, setTecnicoDecision] = useState(null);

  useEffect(() => {
    if (pestana === "historico") {
      cargarHistorico();
    } else {
      cargarUnidades();
    }
  }, [pestana, fechaDia, semanaBase, mes, anioMensual, anioHistorico]);

  async function cargarHistorico() {
    setLoading(true);
    const { data: volumen } = await supabase
      .from("monthly_repair_volume")
      .select("*")
      .eq("year", anioHistorico)
      .order("month_num", { ascending: true });

    const { data: decisiones } = await supabase
      .from("repair_decision_breakdown")
      .select("*")
      .eq("year", anioHistorico);

    setVolumenAnual(volumen || []);
    setDecisionesAnual(decisiones || []);
    setLoading(false);
  }

  async function cargarUnidades() {
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
    } else {
      const inicio = new Date(anioMensual, mes, 1);
      const fin = new Date(anioMensual, mes + 1, 0);
      desde = formatoFecha(inicio);
      hasta = formatoFecha(fin);
    }

    const { data } = await supabase
      .from("unidades")
      .select("*")
      .gte("created_at", desde + "T00:00:00")
      .lte("created_at", hasta + "T23:59:59")
      .order("created_at", { ascending: true });

    setUnidades(data || []);
    setLoading(false);
  }

  const tecnicosUnicos = [...new Set(unidades.map((u) => u.tecnico_nombre || "Sin registrar"))];

  function columnasPara() {
    if (pestana === "semanal") return DIAS_SEMANA;
    if (pestana === "mensual") {
      const inicio = new Date(anioMensual, mes, 1);
      const fin = new Date(anioMensual, mes + 1, 0);
      const semanas = Math.ceil((fin.getDate() + inicio.getDay()) / 7);
      return Array.from({ length: semanas }, (_, i) => `Sem ${i + 1}`);
    }
    return ["Hoy"];
  }

  function indiceColumna(unidad) {
    const fecha = new Date(unidad.created_at);
    if (pestana === "semanal") {
      const dia = fecha.getDay();
      return dia === 0 ? 6 : dia - 1;
    }
    if (pestana === "mensual") {
      const inicioMes = new Date(anioMensual, mes, 1);
      return Math.floor((fecha.getDate() + inicioMes.getDay() - 1) / 7);
    }
    return 0;
  }

  const columnas = columnasPara();
  const tablaData = tecnicosUnicos.map((nombre) => {
    const valores = Array(columnas.length).fill(0);
    unidades
      .filter((u) => (u.tecnico_nombre || "Sin registrar") === nombre)
      .forEach((u) => {
        const idx = indiceColumna(u);
        if (idx >= 0 && idx < valores.length) valores[idx]++;
      });
    return { nombre, valores, total: valores.reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.total - a.total);

  const totalEquipo = unidades.length;
  const tuAporte = unidades.filter((u) => u.tecnico_nombre === tecnico).length;
  const totalesPorColumna = columnas.map((_, i) => tablaData.reduce((a, f) => a + f.valores[i], 0));

  function horasDe(nombre) {
    return unidades
      .filter((u) => (u.tecnico_nombre || "Sin registrar") === nombre)
      .map((u) => ({
        hora: new Date(u.created_at).toLocaleTimeString("es-PR", { hour: "2-digit", minute: "2-digit" }),
        modelo: u.modelo_codigo,
      }));
  }

  // Datos para la pestaña Histórico (desde las tablas nuevas)
  const tecnicosHistorico = [...new Set(volumenAnual.map((v) => v.technician))];
  const tablaHistorico = tecnicosHistorico.map((nombre) => {
    const valores = MESES_CORTOS.map((_, i) => {
      const fila = volumenAnual.find((v) => v.technician === nombre && v.month_num === i + 1);
      return fila ? fila.units : 0;
    });
    return { nombre, valores, total: valores.reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.total - a.total);

  const totalHistoricoPorMes = MESES_CORTOS.map((_, i) => tablaHistorico.reduce((a, f) => a + f.valores[i], 0));
  const totalHistoricoAnual = tablaHistorico.reduce((a, f) => a + f.total, 0);
  const tuAporteHistorico = tablaHistorico.find((f) => f.nombre === tecnico)?.total || 0;

  function decisionesDe(nombre) {
    return decisionesAnual
      .filter((d) => d.technician === nombre && Number(d.pct) > 0)
      .sort((a, b) => Number(b.pct) - Number(a.pct));
  }

  function exportar() {
    if (pestana === "diario") {
      const filas = [["Técnico", "Hora", "Modelo"]];
      tablaData.forEach((f) => {
        horasDe(f.nombre).forEach((h) => filas.push([f.nombre, h.hora, h.modelo]));
      });
      descargarCSV(`reparaciones_diario_${formatoFecha(fechaDia)}.csv`, filas);
    } else if (pestana === "historico") {
      const filas = [["Técnico", ...MESES_CORTOS, "Total"]];
      tablaHistorico.forEach((f) => filas.push([f.nombre, ...f.valores, f.total]));
      filas.push(["Total", ...totalHistoricoPorMes, totalHistoricoAnual]);
      descargarCSV(`reparaciones_historico_${anioHistorico}.csv`, filas);
    } else {
      const filas = [["Técnico", ...columnas, "Total"]];
      tablaData.forEach((f) => filas.push([f.nombre, ...f.valores, f.total]));
      filas.push(["Total", ...totalesPorColumna, totalEquipo]);
      descargarCSV(`reparaciones_${pestana}.csv`, filas);
    }
  }

  const tabStyle = (activa) => ({
    flex: 1, padding: 9, fontSize: 11, fontWeight: 600, border: "none", borderRadius: 9,
    background: activa ? "#0f3d63" : "transparent", color: activa ? "#fff" : "#999",
  });

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 20, background: "#f5f4f1", minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1, color: "#222" }}>Reparaciones</span>
        <button onClick={exportar} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff", fontSize: 12, fontWeight: 600, color: "#333" }}>
          Exportar
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#fff", padding: 4, borderRadius: 12 }}>
        <button onClick={() => setPestana("diario")} style={tabStyle(pestana === "diario")}>Diario</button>
        <button onClick={() => setPestana("semanal")} style={tabStyle(pestana === "semanal")}>Semanal</button>
        <button onClick={() => setPestana("mensual")} style={tabStyle(pestana === "mensual")}>Mensual</button>
        <button onClick={() => setPestana("historico")} style={tabStyle(pestana === "historico")}>Histórico</button>
      </div>

      {pestana === "diario" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() - 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>
            {fechaDia.toLocaleDateString("es-PR", { day: "numeric", month: "short" })}
          </span>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() + 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>›</button>
        </div>
      )}

      {pestana === "semanal" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setSemanaBase(new Date(semanaBase.getTime() - 7 * 86400000))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e4e2da", background: "#fff" }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>
            {semanaBase.toLocaleDateString("es-PR", { day: "numeric", month: "short" })}
          </span>
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
          {[2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}

      {pestana !== "historico" && (
        <div style={{ background: "#eaf0f7", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "#0f3d63", margin: 0, fontWeight: 600 }}>Total del equipo</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#0f3d63", margin: "4px 0 0" }}>{totalEquipo}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#0f3d63", margin: 0, fontWeight: 600 }}>Tu aporte</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#0f3d63", margin: "4px 0 0" }}>{tuAporte}</p>
          </div>
        </div>
      )}

      {pestana === "historico" && (
        <div style={{ background: "#eaf0f7", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "#0f3d63", margin: 0, fontWeight: 600 }}>Total del equipo {anioHistorico}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#0f3d63", margin: "4px 0 0" }}>{totalHistoricoAnual}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#0f3d63", margin: 0, fontWeight: 600 }}>Tu aporte</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#0f3d63", margin: "4px 0 0" }}>{tuAporteHistorico}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : pestana === "diario" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tablaData.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Sin reparaciones ese día.</p>}
          {tablaData.map((f) => {
            const esTu = f.nombre === tecnico;
            const abierto = expandido === f.nombre;
            return (
              <div key={f.nombre}>
                <button
                  onClick={() => setExpandido(abierto ? null : f.nombre)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 14px", background: esTu ? "#fdf0dc" : "#fff", borderRadius: 10, border: "none",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: esTu ? "#93650f" : "#222" }}>
                    {f.nombre}{esTu ? " (tú)" : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: esTu ? "#93650f" : "#0f3d63" }}>
                    {f.total} {abierto ? "▲" : "▼"}
                  </span>
                </button>
                {abierto && (
                  <div style={{ padding: "8px 10px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {horasDe(f.nombre).map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", fontSize: 12 }}>
                        <span style={{ color: "#999", fontWeight: 600 }}>{h.hora}</span>
                        <span style={{ color: "#666" }}>{h.modelo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : pestana === "historico" ? (
        <>
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", minWidth: 480 }}>
              <thead>
                <tr style={{ background: "#f5f4f1" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#666" }}>Técnico</td>
                  {MESES_CORTOS.map((c) => (
                    <td key={c} style={{ padding: "6px 6px", textAlign: "center", color: "#666" }}>{c}</td>
                  ))}
                  <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#666" }}>Total</td>
                </tr>
              </thead>
              <tbody>
                {tablaHistorico.map((f) => {
                  const esTu = f.nombre === tecnico;
                  const abierto = tecnicoDecision === f.nombre;
                  return (
                    <>
                      <tr
                        key={f.nombre}
                        onClick={() => setTecnicoDecision(abierto ? null : f.nombre)}
                        style={{ borderTop: "1px solid #f0efec", background: esTu ? "#fdf0dc" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: esTu ? "#93650f" : "#0f3d63" }}>
                          {f.nombre}{esTu ? " (tú)" : ""}
                        </td>
                        {f.valores.map((v, i) => (
                          <td key={i} style={{ textAlign: "center", color: esTu ? "#93650f" : "#222" }}>{v}</td>
                        ))}
                        <td style={{ textAlign: "center", fontWeight: 700, color: esTu ? "#93650f" : "#0f3d63" }}>{f.total}</td>
                      </tr>
                      {abierto && (
                        <tr>
                          <td colSpan={MESES_CORTOS.length + 2} style={{ padding: "8px 14px 12px", background: "#f9f8f5" }}>
                            <p style={{ fontSize: 11, color: "#999", fontWeight: 700, margin: "0 0 6px" }}>DECISIONES {anioHistorico}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {decisionesDe(f.nombre).map((d) => (
                                <span key={d.decision} style={{ fontSize: 11, padding: "4px 8px", background: "#fff", borderRadius: 8 }}>
                                  {d.decision} · {Number(d.pct)}%
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                <tr style={{ borderTop: "1px solid #f0efec", background: "#eaf0f7", fontWeight: 700 }}>
                  <td style={{ padding: "7px 10px", color: "#0f3d63" }}>Total</td>
                  {totalHistoricoPorMes.map((t, i) => (
                    <td key={i} style={{ textAlign: "center", color: "#0f3d63" }}>{t}</td>
                  ))}
                  <td style={{ textAlign: "center", color: "#0f3d63" }}>{totalHistoricoAnual}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "#999", textAlign: "center" }}>Toca un técnico para ver su desglose de decisiones</p>
        </>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", minWidth: columnas.length > 5 ? 480 : 320 }}>
            <thead>
              <tr style={{ background: "#f5f4f1" }}>
                <td style={{ padding: "7px 10px", fontWeight: 700, color: "#666" }}>Técnico</td>
                {columnas.map((c) => (
                  <td key={c} style={{ padding: "7px 8px", textAlign: "center", color: "#666" }}>{c}</td>
                ))}
                <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: "#666" }}>Total</td>
              </tr>
            </thead>
            <tbody>
              {tablaData.map((f) => {
                const esTu = f.nombre === tecnico;
                return (
                  <tr key={f.nombre} style={{ borderTop: "1px solid #f0efec", background: esTu ? "#fdf0dc" : "transparent" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: esTu ? "#93650f" : "#0f3d63" }}>
                      {f.nombre}{esTu ? " (tú)" : ""}
                    </td>
                    {f.valores.map((v, i) => (
                      <td key={i} style={{ textAlign: "center", color: esTu ? "#93650f" : "#222" }}>{v}</td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: 700, color: esTu ? "#93650f" : "#0f3d63" }}>{f.total}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "1px solid #f0efec", background: "#eaf0f7", fontWeight: 700 }}>
                <td style={{ padding: "7px 10px", color: "#0f3d63" }}>Total</td>
                {totalesPorColumna.map((t, i) => (
                  <td key={i} style={{ textAlign: "center", color: "#0f3d63" }}>{t}</td>
                ))}
                <td style={{ textAlign: "center", color: "#0f3d63" }}>{totalEquipo}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
