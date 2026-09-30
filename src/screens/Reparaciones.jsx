import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";
const TU_BG = "#fdf0dc";
const TU_TX = "#93650f";

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

function Flecha({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "izq" ? <path d="M15 18l-6-6 6-6"></path> : <path d="M9 18l6-6-6-6"></path>}
    </svg>
  );
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

  // ---- estilos premium ----
  const shellStyle = {
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const tabStyle = (activa) => ({
    flex: 1, padding: "9px 4px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 10,
    background: activa ? NAVY : "transparent", color: activa ? "#fff" : MUTED,
  });
  const navBtn = { width: 36, height: 36, borderRadius: 18, border: "none", background: SURF, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  const selectStyle = { flex: 1, padding: 12, borderRadius: 12, border: `1px solid #e6e8ec`, background: "#fff", fontSize: 14, color: TEXT };
  const th = { padding: "9px 8px", textAlign: "center", color: MUTED, fontWeight: 600, fontSize: 11 };
  const td = (esTu) => ({ padding: "9px 8px", textAlign: "center", color: esTu ? TU_TX : TEXT });

  return (
    <div style={shellStyle}>
      {/* Header fijo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Reparaciones del equipo</span>
        <button onClick={exportar} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: `1px solid #e6e8ec`, background: "#fff", fontSize: 12, fontWeight: 700, color: NAVY }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>
          Exportar
        </button>
      </div>

      {/* Tabs fijas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: SURF, padding: 4, borderRadius: 13, flexShrink: 0 }}>
        <button onClick={() => setPestana("diario")} style={tabStyle(pestana === "diario")}>Diario</button>
        <button onClick={() => setPestana("semanal")} style={tabStyle(pestana === "semanal")}>Semanal</button>
        <button onClick={() => setPestana("mensual")} style={tabStyle(pestana === "mensual")}>Mensual</button>
        <button onClick={() => setPestana("historico")} style={tabStyle(pestana === "historico")}>Histórico</button>
      </div>

      {/* Selector de periodo fijo */}
      {pestana === "diario" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() - 86400000))} aria-label="Día anterior" style={navBtn}><Flecha dir="izq" /></button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{fechaDia.toLocaleDateString("es-PR", { day: "numeric", month: "short" })}</span>
          <button onClick={() => setFechaDia(new Date(fechaDia.getTime() + 86400000))} aria-label="Día siguiente" style={navBtn}><Flecha dir="der" /></button>
        </div>
      )}

      {pestana === "semanal" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <button onClick={() => setSemanaBase(new Date(semanaBase.getTime() - 7 * 86400000))} aria-label="Semana anterior" style={navBtn}><Flecha dir="izq" /></button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Semana del {semanaBase.toLocaleDateString("es-PR", { day: "numeric", month: "short" })}</span>
          <button onClick={() => setSemanaBase(new Date(semanaBase.getTime() + 7 * 86400000))} aria-label="Semana siguiente" style={navBtn}><Flecha dir="der" /></button>
        </div>
      )}

      {pestana === "mensual" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexShrink: 0 }}>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={selectStyle}>
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={anioMensual} onChange={(e) => setAnioMensual(Number(e.target.value))} style={selectStyle}>
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      {pestana === "historico" && (
        <select value={anioHistorico} onChange={(e) => setAnioHistorico(Number(e.target.value))} style={{ ...selectStyle, width: "100%", flex: "none", marginBottom: 14, boxSizing: "border-box" }}>
          {[2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      )}

      {/* Tarjeta resumen fija */}
      {pestana !== "historico" ? (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", boxShadow: "0 2px 10px rgba(16,32,53,0.05)", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, fontWeight: 600 }}>Total del equipo</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: TEXT, margin: "4px 0 0" }}>{totalEquipo}</p>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: LINE }} />
          <div style={{ flex: 1, paddingLeft: 16 }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, fontWeight: 600 }}>Tu aporte</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "4px 0 0" }}>{tuAporte}</p>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", boxShadow: "0 2px 10px rgba(16,32,53,0.05)", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, fontWeight: 600 }}>Total del equipo {anioHistorico}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: TEXT, margin: "4px 0 0" }}>{totalHistoricoAnual}</p>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: LINE }} />
          <div style={{ flex: 1, paddingLeft: 16 }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, fontWeight: 600 }}>Tu aporte</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "4px 0 0" }}>{tuAporteHistorico}</p>
          </div>
        </div>
      )}

      {/* Área que scrollea por dentro */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
        ) : pestana === "diario" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tablaData.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>Sin reparaciones ese día.</p>}
            {tablaData.map((f) => {
              const esTu = f.nombre === tecnico;
              const abierto = expandido === f.nombre;
              return (
                <div key={f.nombre} style={{ background: esTu ? TU_BG : "#fff", border: `1px solid ${esTu ? "#f3e2c4" : LINE}`, borderRadius: 14, boxShadow: "0 2px 10px rgba(16,32,53,0.05)", overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandido(abierto ? null : f.nombre)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "transparent", border: "none", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: esTu ? TU_TX : TEXT }}>
                      {f.nombre}{esTu ? " (tú)" : ""}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: esTu ? TU_TX : NAVY }}>
                      {f.total}
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={esTu ? TU_TX : MUTED} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </button>
                  {abierto && (
                    <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                      {horasDe(f.nombre).map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 8px", fontSize: 12, borderTop: `1px solid ${esTu ? "#f3e2c4" : LINE}` }}>
                          <span style={{ color: MUTED, fontWeight: 600 }}>{h.hora}</span>
                          <span style={{ color: TEXT }}>{h.modelo}</span>
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
            <div style={{ overflowX: "auto", marginBottom: 12 }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "hidden", minWidth: 480 }}>
                <thead>
                  <tr style={{ background: SURF }}>
                    <td style={{ ...th, textAlign: "left", fontWeight: 700 }}>Técnico</td>
                    {MESES_CORTOS.map((c) => (<td key={c} style={th}>{c}</td>))}
                    <td style={{ ...th, fontWeight: 700 }}>Total</td>
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
                          style={{ borderTop: `1px solid ${LINE}`, background: esTu ? TU_BG : "transparent", cursor: "pointer" }}
                        >
                          <td style={{ padding: "9px 8px", fontWeight: 700, color: esTu ? TU_TX : NAVY }}>
                            {f.nombre}{esTu ? " (tú)" : ""}
                          </td>
                          {f.valores.map((v, i) => (<td key={i} style={td(esTu)}>{v}</td>))}
                          <td style={{ ...td(esTu), fontWeight: 800, color: esTu ? TU_TX : NAVY }}>{f.total}</td>
                        </tr>
                        {abierto && (
                          <tr>
                            <td colSpan={MESES_CORTOS.length + 2} style={{ padding: "10px 14px 14px", background: SURF }}>
                              <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: 0.4, margin: "0 0 8px" }}>DECISIONES {anioHistorico}</p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {decisionesDe(f.nombre).map((d) => (
                                  <span key={d.decision} style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 20, color: TEXT }}>
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
                  <tr style={{ borderTop: `1px solid ${LINE}`, background: "#eef4fb", fontWeight: 800 }}>
                    <td style={{ padding: "9px 8px", color: NAVY }}>Total</td>
                    {totalHistoricoPorMes.map((t, i) => (<td key={i} style={{ ...td(false), fontWeight: 800, color: NAVY }}>{t}</td>))}
                    <td style={{ ...td(false), fontWeight: 800, color: NAVY }}>{totalHistoricoAnual}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>Toca un técnico para ver su desglose de decisiones</p>
          </>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "hidden", minWidth: columnas.length > 5 ? 480 : 320 }}>
              <thead>
                <tr style={{ background: SURF }}>
                  <td style={{ ...th, textAlign: "left", fontWeight: 700, fontSize: 12 }}>Técnico</td>
                  {columnas.map((c) => (<td key={c} style={{ ...th, fontSize: 12 }}>{c}</td>))}
                  <td style={{ ...th, fontWeight: 700, fontSize: 12 }}>Total</td>
                </tr>
              </thead>
              <tbody>
                {tablaData.map((f) => {
                  const esTu = f.nombre === tecnico;
                  return (
                    <tr key={f.nombre} style={{ borderTop: `1px solid ${LINE}`, background: esTu ? TU_BG : "transparent" }}>
                      <td style={{ padding: "9px 8px", fontWeight: 700, color: esTu ? TU_TX : NAVY }}>
                        {f.nombre}{esTu ? " (tú)" : ""}
                      </td>
                      {f.valores.map((v, i) => (<td key={i} style={td(esTu)}>{v}</td>))}
                      <td style={{ ...td(esTu), fontWeight: 800, color: esTu ? TU_TX : NAVY }}>{f.total}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: `1px solid ${LINE}`, background: "#eef4fb", fontWeight: 800 }}>
                  <td style={{ padding: "9px 8px", color: NAVY }}>Total</td>
                  {totalesPorColumna.map((t, i) => (<td key={i} style={{ ...td(false), fontWeight: 800, color: NAVY }}>{t}</td>))}
                  <td style={{ ...td(false), fontWeight: 800, color: NAVY }}>{totalEquipo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
