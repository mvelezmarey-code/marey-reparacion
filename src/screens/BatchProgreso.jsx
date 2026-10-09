import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";
const AVATAR_COLORES = [NAVY, "#2f6a9a", "#5a8fbd", "#8fb3d3", "#3f5f7a"];

function haceTiempo(iso) {
  if (!iso) return "sin actividad";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function hora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-PR", { hour: "numeric", minute: "2-digit" });
}

function contar(arr, fn) {
  const c = {};
  arr.forEach((x) => {
    const vals = fn(x);
    (Array.isArray(vals) ? vals : [vals]).forEach((v) => {
      if (!v) return;
      c[v] = (c[v] || 0) + 1;
    });
  });
  return Object.entries(c).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
}

function porEmpleado(unidades) {
  const m = {};
  unidades.forEach((u) => {
    const n = String(u.tecnico_nombre || "Sin registrar").trim();
    if (!m[n]) m[n] = { nombre: n, cantidad: 0, decisiones: {} };
    m[n].cantidad += 1;
    const d = u.decision || "Sin decisión";
    m[n].decisiones[d] = (m[n].decisiones[d] || 0) + 1;
  });
  return Object.values(m).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

function colorDecision(d) {
  if (d === "Refurbished") return { bg: "#edf7ea", fg: "#2b5a1f" };
  if (d === "Descartar" || d === "Dummy") return { bg: "#fbe3e3", fg: "#8a2d2d" };
  return { bg: "#e7eef7", fg: NAVY };
}

function Tag({ texto, decision }) {
  const c = colorDecision(decision);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, borderRadius: 9, padding: "3px 8px", whiteSpace: "nowrap" }}>
      {texto}
    </span>
  );
}

const estilos = {
  lbl: { fontSize: 11, fontWeight: 700, color: "#98a1ae", letterSpacing: 0.6, textTransform: "uppercase", margin: "0 0 8px" },
  card: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "4px 14px", marginBottom: 16 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 0", borderTop: "1px solid #f1f3f6" },
  rowFirst: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 0" },
  n: { fontSize: 15, fontWeight: 700, color: NAVY, minWidth: 28, textAlign: "right", flexShrink: 0 },
};

function Fila({ primera, children, alineaArriba }) {
  return <div style={{ ...(primera ? estilos.rowFirst : estilos.row), alignItems: alineaArriba ? "flex-start" : "center" }}>{children}</div>;
}

function Total({ valor }) {
  return (
    <div style={{ ...estilos.row, borderTop: "1px solid #dfe5ec" }}>
      <span style={{ fontWeight: 800, color: NAVY }}>Total</span>
      <span style={{ ...estilos.n, fontWeight: 800 }}>{valor}</span>
    </div>
  );
}

export default function BatchProgreso({ batch, onBack }) {
  const [unidades, setUnidades] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), 10000);
    return () => clearInterval(t);
  }, [batch.id]);

  async function cargar(silent = false) {
    if (!silent) setLoading(true);
    const { data: it } = await supabase
      .from("batch_items")
      .select("modelo_codigo, cantidad_declarada")
      .eq("batch_id", batch.id);
    const { data: uni } = await supabase
      .from("unidades")
      .select("id, modelo_codigo, old_sn, old_sn_na, new_sn, decision, piezas_danadas, tecnico_nombre, created_at")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false });
    setItems(it || []);
    setUnidades(uni || []);
    if (!silent) setLoading(false);
  }

  const total = items.reduce((a, i) => a + (i.cantidad_declarada || 0), 0);
  const hechas = unidades.length;
  const faltan = Math.max(0, total - hechas);
  const pct = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
  const ultima = unidades.length > 0 ? unidades[0].created_at : null;

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });
  const decisiones = contar(unidades, (u) => u.decision);
  const piezas = contar(unidades, (u) => u.piezas_danadas || []).filter((p) => p.nombre !== "Ninguna");
  const empleados = porEmpleado(unidades);
  const ultimas = unidades.slice(0, 8);

  return (
    <div style={{ height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0", display: "flex", flexDirection: "column", boxSizing: "border-box", background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Transferencia #{batch.numero_transferencia}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#2f7d32", background: "#e6f0dd", borderRadius: 20, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: "#2f7d32", display: "inline-block" }} />
          En progreso
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
        ) : (
          <>
            {/* Hero */}
            <div style={{ background: NAVY, borderRadius: 18, padding: "16px 18px", color: "#fff", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{hechas}</span>
                <span style={{ fontSize: 14, opacity: 0.8 }}>de {total} arreglados</span>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.14)", borderRadius: 20, padding: "5px 11px" }}>
                  {faltan === 0 ? "Completo" : `Faltan ${faltan}`}
                </span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 3 }} />
              </div>
              {decisiones.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {decisiones.map((d) => <Tag key={d.nombre} texto={`${d.cantidad} ${d.nombre}`} decision={d.nombre} />)}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}>
                <span>Empezó {hora(batch.created_at)}</span>
                <span>Última actividad {haceTiempo(ultima)}</span>
              </div>
            </div>

            {/* Por modelo */}
            <p style={estilos.lbl}>Por modelo</p>
            <div style={estilos.card}>
              {progreso.map((p, i) => {
                const w = p.cantidad_declarada > 0 ? Math.round((p.completadas / p.cantidad_declarada) * 100) : 0;
                return (
                  <Fila key={p.modelo_codigo} primera={i === 0}>
                    <span style={{ fontWeight: 600 }}>{p.modelo_codigo}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ height: 5, background: "#eef1f5", borderRadius: 3, overflow: "hidden", width: 90 }}>
                        <div style={{ height: "100%", width: `${w}%`, background: p.pendientes === 0 ? "#2f5c17" : NAVY, borderRadius: 3 }} />
                      </div>
                      <span style={{ ...estilos.n, color: p.pendientes === 0 ? "#2f5c17" : NAVY }}>{p.completadas}/{p.cantidad_declarada}</span>
                    </div>
                  </Fila>
                );
              })}
            </div>

            {/* Por empleado */}
            <p style={estilos.lbl}>Por empleado</p>
            <div style={estilos.card}>
              {empleados.length === 0 && <Fila primera><span style={{ color: MUTED, fontSize: 13 }}>Nadie ha registrado todavía</span></Fila>}
              {empleados.map((e, i) => (
                <Fila key={e.nombre} primera={i === 0} alineaArriba>
                  <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: AVATAR_COLORES[i % AVATAR_COLORES.length], color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {e.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{e.nombre}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {Object.entries(e.decisiones).map(([d, n]) => <Tag key={d} texto={`${n} ${d}`} decision={d} />)}
                      </div>
                    </div>
                  </div>
                  <span style={estilos.n}>{e.cantidad}</span>
                </Fila>
              ))}
              {empleados.length > 0 && <Total valor={hechas} />}
            </div>

            {/* Piezas */}
            <p style={estilos.lbl}>Piezas dañadas</p>
            <div style={estilos.card}>
              {piezas.length === 0 && <Fila primera><span style={{ color: MUTED, fontSize: 13 }}>Ninguna registrada todavía</span></Fila>}
              {piezas.map((p, i) => (
                <Fila key={p.nombre} primera={i === 0}>
                  <span>{p.nombre}</span>
                  <span style={estilos.n}>{p.cantidad}</span>
                </Fila>
              ))}
              {piezas.length > 0 && <Total valor={piezas.reduce((a, p) => a + p.cantidad, 0)} />}
            </div>

            {/* Últimas registradas */}
            <p style={estilos.lbl}>Últimas registradas</p>
            <div style={{ ...estilos.card, marginBottom: 0 }}>
              {ultimas.length === 0 && <Fila primera><span style={{ color: MUTED, fontSize: 13 }}>Sin unidades registradas.</span></Fila>}
              {ultimas.map((u, i) => (
                <Fila key={u.id} primera={i === 0}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.modelo_codigo} · {u.old_sn_na ? "sin serial" : (u.old_sn || u.new_sn || "sin serial")}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{hora(u.created_at)} · {u.tecnico_nombre || "—"}</div>
                  </div>
                  <Tag texto={u.decision || "Sin decisión"} decision={u.decision} />
                </Fila>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
