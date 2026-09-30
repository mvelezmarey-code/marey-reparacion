import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#e6e8ec";

export default function Home({ tecnico, onOpenBatch, onNuevoBatch, onVerHistorial, onVerEstadisticas, onVerReparaciones, onVerAsistente, onSalir }) {
  const [batches, setBatches] = useState([]);
  const [progreso, setProgreso] = useState({}); // batch_id -> { hechas, total }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarBatches();
  }, []);

  async function cargarBatches() {
    setLoading(true);
    const { data } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const lista = data || [];
    setBatches(lista);

    const activos = lista.filter((b) => b.estado === "abierto" || b.estado === "recibido");
    const ids = activos.map((b) => b.id);
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("batch_items")
        .select("batch_id, cantidad_declarada")
        .in("batch_id", ids);
      const { data: uni } = await supabase
        .from("unidades")
        .select("batch_id")
        .in("batch_id", ids);
      const mapa = {};
      ids.forEach((id) => (mapa[id] = { hechas: 0, total: 0 }));
      (items || []).forEach((it) => { mapa[it.batch_id].total += it.cantidad_declarada || 0; });
      (uni || []).forEach((u) => { if (mapa[u.batch_id]) mapa[u.batch_id].hechas += 1; });
      setProgreso(mapa);
    } else {
      setProgreso({});
    }
    setLoading(false);
  }

  const batchesActivos = batches.filter((b) => b.estado === "abierto" || b.estado === "recibido");
  const historialCount = batches.filter((b) => b.estado === "pendiente_revision" || b.estado === "cerrado").length;
  const inicial = (tecnico || "?").trim().charAt(0).toUpperCase();

  const shellStyle = {
    height: "100dvh",
    maxWidth: 480,
    margin: "0 auto",
    padding: "22px 20px calc(18px + env(safe-area-inset-bottom))",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#fff",
    color: TEXT,
    WebkitFontSmoothing: "antialiased",
  };
  const num = {
    width: 30, height: 30, borderRadius: 15, background: NAVY, color: "#fff",
    fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  const cardBase = {
    flex: 1, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: 18,
    boxShadow: "0 2px 8px rgba(16,32,53,0.05)", textAlign: "left", cursor: "pointer",
  };
  const accion = {
    display: "flex", alignItems: "center", gap: 12, background: "#fff",
    border: `1px solid ${LINE}`, borderRadius: 14, padding: "15px 16px", cursor: "pointer",
    boxShadow: "0 1px 3px rgba(16,32,53,0.04)", width: "100%", textAlign: "left",
  };

  function Conector() {
    return <div style={{ flex: 1, width: 2, background: LINE, margin: "6px 0", minHeight: 12 }} />;
  }

  return (
    <div style={shellStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Hola,</p>
          <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{tecnico}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={cargarBatches} aria-label="Actualizar" style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loading ? "rotate(180deg)" : "none", transition: "transform .4s ease" }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <button onClick={onSalir} style={{ fontSize: 12, fontWeight: 600, padding: "9px 15px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 20, color: MUTED }}>Cambiar</button>
        </div>
      </div>

      {/* Timeline 1-2-3 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minHeight: 0, overflowY: "auto" }}>
        {/* Paso 1 */}
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={num}>1</div>
            <Conector />
          </div>
          <button onClick={onNuevoBatch} style={{ ...cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nueva transferencia</p>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: MUTED }}>Recibir mercancía para reparar</p>
            </div>
            <span style={{ color: "#c4cbd4", fontSize: 22 }}>›</span>
          </button>
        </div>

        {/* Paso 2 */}
        <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={num}>2</div>
            <Conector />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <p style={{ margin: "4px 0 10px", fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.4, textTransform: "uppercase" }}>Reparación en progreso</p>
            {loading ? (
              <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
            ) : batchesActivos.length === 0 ? (
              <div style={{ background: "#f7f9fc", borderRadius: 16, padding: 18 }}>
                <p style={{ margin: 0, fontSize: 13, color: MUTED }}>No tienes batches activos</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 0 }}>
                {batchesActivos.map((b) => {
                  const p = progreso[b.id] || { hechas: 0, total: 0 };
                  const pct = p.total > 0 ? Math.round((p.hechas / p.total) * 100) : 0;
                  return (
                    <button key={b.id} onClick={() => onOpenBatch(b)} style={{ background: "#eef4fb", border: `1.5px solid ${NAVY}`, borderRadius: 18, padding: 18, textAlign: "left", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: NAVY }}>Transferencia #{b.numero_transferencia}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, background: "#fff", borderRadius: 20, padding: "4px 10px" }}>En proceso</span>
                      </div>
                      <p style={{ margin: "8px 0 12px", fontSize: 13, color: "#3a6b96" }}>
                        {p.total > 0 ? `${p.hechas} de ${p.total} unidades reparadas` : "Toca para reparar unidades"}
                      </p>
                      <div style={{ height: 6, background: "#d7e3f2", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: NAVY, borderRadius: 3 }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Paso 3 */}
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={num}>3</div>
          </div>
          <button onClick={onVerHistorial} style={{ ...cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Historial de arreglados</p>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: MUTED }}>Batches completados y en revisión</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, background: "#eef4fb", borderRadius: 20, padding: "5px 12px" }}>{historialCount}</span>
          </button>
        </div>
      </div>

      {/* Accesos */}
      <div style={{ height: 1, background: LINE, margin: "20px 0 16px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onVerReparaciones} style={accion}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path></svg>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Reparaciones del equipo</span>
          <span style={{ color: "#c4cbd4", fontSize: 20 }}>›</span>
        </button>
        <button onClick={onVerEstadisticas} style={accion}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M7 14l4-4 3 3 5-6"></path></svg>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Estadísticas completas</span>
          <span style={{ color: "#c4cbd4", fontSize: 20 }}>›</span>
        </button>
        <button onClick={onVerAsistente} style={accion}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Videos y guías de reparación</span>
          <span style={{ color: "#c4cbd4", fontSize: 20 }}>›</span>
        </button>
      </div>
    </div>
  );
}
