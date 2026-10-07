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
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export default function AdminHome({ tecnico, onVerRevision, onVerProgreso, onVerEstadisticas, onVerLeaderboard, onVerReparaciones, onVerPiezas, onVerHistorial, onSalir }) {
  const [pendientes, setPendientes] = useState(null);
  const [enProgreso, setEnProgreso] = useState([]);
  const [progreso, setProgreso] = useState({}); // batch_id -> { hechas, total, tecnicos, ultima }
  const [refrescando, setRefrescando] = useState(false);
  const inicial = (tecnico || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), 10000);
    return () => clearInterval(t);
  }, []);

  async function cargar(silent = false) {
    if (!silent) setRefrescando(true);

    const { count } = await supabase
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_revision");
    setPendientes(count || 0);

    const { data: act } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .in("estado", ["abierto", "recibido"])
      .order("created_at", { ascending: false });
    const lista = act || [];
    const ids = lista.map((b) => b.id);
    const mapa = {};
    ids.forEach((id) => (mapa[id] = { hechas: 0, total: 0, tecnicos: [], ultima: null }));

    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("batch_items")
        .select("batch_id, cantidad_declarada")
        .in("batch_id", ids);
      const { data: uni } = await supabase
        .from("unidades")
        .select("batch_id, tecnico_nombre, created_at")
        .in("batch_id", ids);
      (items || []).forEach((it) => { if (mapa[it.batch_id]) mapa[it.batch_id].total += it.cantidad_declarada || 0; });
      (uni || []).forEach((u) => {
        const m = mapa[u.batch_id];
        if (!m) return;
        m.hechas += 1;
        const n = String(u.tecnico_nombre || "").trim();
        if (n && !m.tecnicos.includes(n)) m.tecnicos.push(n);
        if (!m.ultima || u.created_at > m.ultima) m.ultima = u.created_at;
      });
    }

    setEnProgreso(lista);
    setProgreso(mapa);
    if (!silent) setRefrescando(false);
  }

  const shellStyle = {
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "22px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const tile = {
    background: SURF, border: "none", borderRadius: 18, padding: 18, minHeight: 134,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    alignItems: "flex-start", textAlign: "left", cursor: "pointer",
  };
  const tileIcon = {
    width: 44, height: 44, borderRadius: 13, background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const tileLabel = { fontSize: 14, fontWeight: 700, lineHeight: 1.25, color: TEXT };
  const seccion = { fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: MUTED };

  return (
    <div style={shellStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: NAVY, color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{inicial}</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Administrador</p>
            <p style={{ margin: "1px 0 0", fontSize: 17, fontWeight: 700 }}>{tecnico}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => cargar()} aria-label="Actualizar" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: refrescando ? "rotate(180deg)" : "none", transition: "transform .4s ease" }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <button onClick={onSalir} style={{ fontSize: 12, fontWeight: 600, padding: "9px 15px", background: SURF, border: "none", borderRadius: 20, color: MUTED }}>Cambiar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>

        {/* En progreso ahora */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#2f7d32", display: "inline-block" }} />
            <span style={seccion}>En progreso ahora</span>
          </div>
          <span style={{ fontSize: 11, color: "#98a1ae" }}>se actualiza solo</span>
        </div>

        {enProgreso.length === 0 ? (
          <div style={{ background: SURF, borderRadius: 16, padding: "14px 16px", marginBottom: 14, fontSize: 13, color: MUTED }}>
            No hay batches en progreso ahora mismo.
          </div>
        ) : (
          enProgreso.map((b) => {
            const p = progreso[b.id] || { hechas: 0, total: 0, tecnicos: [], ultima: null };
            const pct = p.total > 0 ? Math.min(100, Math.round((p.hechas / p.total) * 100)) : 0;
            const nTec = p.tecnicos.length;
            return (
              <button key={b.id} onClick={() => onVerProgreso && onVerProgreso(b)} style={{ width: "100%", textAlign: "left", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 10px rgba(16,32,53,0.05)", marginBottom: 10, cursor: "pointer", color: TEXT }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Transferencia #{b.numero_transferencia}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{p.hechas} / {p.total}</span>
                </div>
                <div style={{ height: 6, background: LINE, borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: NAVY, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {p.tecnicos.slice(0, 4).map((n, i) => (
                      <div key={n} title={n} style={{ width: 24, height: 24, borderRadius: 12, background: AVATAR_COLORES[i % AVATAR_COLORES.length], color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", marginLeft: i === 0 ? 0 : -7 }}>
                        {n.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    <span style={{ fontSize: 12, color: MUTED, marginLeft: nTec > 0 ? 8 : 0 }}>
                      {nTec === 0 ? "Nadie ha registrado todavía" : nTec === 1 ? "1 técnico trabajando" : `${nTec} técnicos trabajando`}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#98a1ae" }}>{haceTiempo(p.ultima)}</span>
                </div>
              </button>
            );
          })
        )}

        {/* Hero: Revisión de batches */}
        <button onClick={onVerRevision} style={{ width: "100%", textAlign: "left", background: NAVY, border: "none", borderRadius: 20, padding: 22, margin: "6px 0 14px", color: "#fff", boxShadow: "0 6px 18px rgba(15,61,99,0.22)", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            </div>
            {pendientes === null ? null : pendientes > 0 ? (
              <span style={{ fontSize: 12, fontWeight: 700, background: "#f0b429", color: "#3a2a00", borderRadius: 20, padding: "6px 12px" }}>{pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.16)", color: "#fff", borderRadius: 20, padding: "6px 12px" }}>Al día</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Revisión de batches</p>
          <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.85 }}>
            {pendientes === null
              ? "Cargando..."
              : pendientes > 0
              ? `Hay ${pendientes} transferencia${pendientes !== 1 ? "s" : ""} esperando tu aprobación`
              : "No hay transferencias pendientes de aprobar"}
          </p>
        </button>

        {/* Resto en grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
          <button onClick={onVerReparaciones} style={tile}>
            <div style={tileIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path></svg></div>
            <span style={tileLabel}>Reparaciones del equipo</span>
          </button>
          <button onClick={onVerPiezas} style={tile}>
            <div style={tileIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><path d="M3.27 6.96L12 12.01l8.73-5.05"></path><path d="M12 22.08V12"></path></svg></div>
            <span style={tileLabel}>Reporte de piezas</span>
          </button>
          <button onClick={onVerHistorial} style={tile}>
            <div style={tileIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg></div>
            <span style={tileLabel}>Historial de batches</span>
          </button>
        </div>
      </div>
    </div>
  );
}
