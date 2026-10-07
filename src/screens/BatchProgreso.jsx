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

function chipDecision(decision) {
  const d = String(decision || "");
  if (d === "Refurbished") return { bg: "#edf7ea", fg: "#2b5a1f" };
  if (d === "Descartar" || d === "Dummy") return { bg: "#fbe3e3", fg: "#8a2d2d" };
  return { bg: "#e7eef7", fg: NAVY };
}

export default function BatchProgreso({ batch, onBack }) {
  const [unidades, setUnidades] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), 10000);
    return () => clearInterval(t);
  }, [batch.id]);

  async function cargar(silent = false) {
    if (!silent) setLoading(true);
    const { data: items } = await supabase
      .from("batch_items")
      .select("cantidad_declarada")
      .eq("batch_id", batch.id);
    const { data: uni } = await supabase
      .from("unidades")
      .select("id, modelo_codigo, old_sn, new_sn, decision, tecnico_nombre, created_at")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false });
    setTotal((items || []).reduce((a, it) => a + (it.cantidad_declarada || 0), 0));
    setUnidades(uni || []);
    if (!silent) setLoading(false);
  }

  const hechas = unidades.length;
  const faltan = Math.max(0, total - hechas);
  const pct = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
  const ultima = unidades.length > 0 ? unidades[0].created_at : null;

  const porEmpleado = Object.values(
    unidades.reduce((acc, u) => {
      const n = String(u.tecnico_nombre || "Sin registrar").trim();
      if (!acc[n]) acc[n] = { nombre: n, cantidad: 0, decisiones: {} };
      acc[n].cantidad += 1;
      const d = u.decision || "Sin decisión";
      acc[n].decisiones[d] = (acc[n].decisiones[d] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));

  const maxEmpleado = porEmpleado.length > 0 ? porEmpleado[0].cantidad : 0;
  const ultimas = unidades.slice(0, 8);

  const seccion = { fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: MUTED, margin: "0 0 10px" };

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
            {/* Progreso general */}
            <div style={{ background: NAVY, borderRadius: 18, padding: "16px 18px", color: "#fff", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.8 }}>Progreso del batch</span>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{hechas} <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 600 }}>de {total}</span></span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85 }}>
                <span>Empezó {hora(batch.created_at)}</span>
                <span>Última actividad {haceTiempo(ultima)}</span>
              </div>
            </div>

            {/* Trabajo por empleado */}
            <p style={seccion}>Trabajo por empleado</p>
            {porEmpleado.length === 0 ? (
              <div style={{ background: SURF, borderRadius: 14, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: MUTED }}>Nadie ha registrado unidades todavía.</div>
            ) : (
              porEmpleado.map((e, i) => {
                const color = AVATAR_COLORES[i % AVATAR_COLORES.length];
                const ancho = total > 0 ? Math.round((e.cantidad / total) * 100) : (maxEmpleado > 0 ? Math.round((e.cantidad / maxEmpleado) * 100) : 0);
                return (
                  <div key={e.nombre} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 15, background: color, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{e.nombre.charAt(0).toUpperCase()}</div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.nombre}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{e.cantidad}</span>
                      <span style={{ fontSize: 11, color: MUTED, marginLeft: -4 }}>{e.cantidad === 1 ? "unidad" : "unidades"}</span>
                    </div>
                    <div style={{ height: 6, background: LINE, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${ancho}%`, height: "100%", background: color, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(e.decisiones).map(([d, n]) => {
                        const c = chipDecision(d);
                        return (
                          <span key={d} style={{ fontSize: 10.5, fontWeight: 700, color: c.fg, background: c.bg, borderRadius: 10, padding: "3px 8px" }}>{n} {d}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Faltan */}
            <div style={{ background: SURF, borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 16px" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Faltan por registrar</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{faltan} <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>de {total}</span></span>
            </div>

            {/* Últimas registradas */}
            <p style={seccion}>Últimas registradas</p>
            {ultimas.length === 0 ? (
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Sin unidades registradas.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ultimas.map((u) => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 12 }}>
                    <span style={{ color: "#98a1ae", fontWeight: 600, minWidth: 48 }}>{hora(u.created_at)}</span>
                    <span style={{ flex: 1, padding: "0 8px", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.modelo_codigo} · {u.old_sn || u.new_sn || "sin serial"}</span>
                    <span style={{ color: MUTED, flexShrink: 0 }}>{u.tecnico_nombre || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
