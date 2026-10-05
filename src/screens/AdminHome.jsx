import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

export default function AdminHome({ tecnico, onVerRevision, onVerEstadisticas, onVerLeaderboard, onVerReparaciones, onVerPiezas, onVerHistorial, onSalir }) {
  const [pendientes, setPendientes] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const inicial = (tecnico || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    cargarPendientes();
  }, []);

  async function cargarPendientes() {
    setRefrescando(true);
    const { count } = await supabase
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente_revision");
    setPendientes(count || 0);
    setRefrescando(false);
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

  return (
    <div style={shellStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: NAVY, color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{inicial}</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Administrador</p>
            <p style={{ margin: "1px 0 0", fontSize: 17, fontWeight: 700 }}>{tecnico}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={cargarPendientes} aria-label="Actualizar" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: refrescando ? "rotate(180deg)" : "none", transition: "transform .4s ease" }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <button onClick={onSalir} style={{ fontSize: 12, fontWeight: 600, padding: "9px 15px", background: SURF, border: "none", borderRadius: 20, color: MUTED }}>Cambiar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        {/* Hero: Revisión de batches */}
        <button onClick={onVerRevision} style={{ width: "100%", textAlign: "left", background: NAVY, border: "none", borderRadius: 20, padding: 22, marginBottom: 14, color: "#fff", boxShadow: "0 6px 18px rgba(15,61,99,0.22)", cursor: "pointer" }}>
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
