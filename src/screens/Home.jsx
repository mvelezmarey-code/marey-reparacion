import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

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
      .select("id, numero_transferencia, estado, created_at, revisado_at, nota_revision")
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
  const num = (claro) => ({
    width: 34, height: 34, borderRadius: 17,
    background: claro ? "rgba(255,255,255,0.18)" : NAVY,
    color: "#fff", fontSize: 15, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  });
  const tarjeta = {
    background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: 18,
    boxShadow: "0 2px 10px rgba(16,32,53,0.05)", display: "flex", alignItems: "center", gap: 16,
    textAlign: "left", width: "100%", cursor: "pointer",
  };
  const tile = {
    flex: 1, background: SURF, border: "none", borderRadius: 16, padding: 16,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
  };

  return (
    <div style={shellStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: NAVY, color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{inicial}</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Técnico</p>
            <p style={{ margin: "1px 0 0", fontSize: 17, fontWeight: 700 }}>{tecnico}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={cargarBatches} aria-label="Actualizar" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loading ? "rotate(180deg)" : "none", transition: "transform .4s ease" }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
          <button onClick={onSalir} style={{ fontSize: 12, fontWeight: 600, padding: "9px 15px", background: SURF, border: "none", borderRadius: 20, color: MUTED }}>Cambiar</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minHeight: 0, overflowY: "auto" }}>
        {/* Paso 1 */}
        <button onClick={onNuevoBatch} style={tarjeta}>
          <div style={num(false)}>1</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nueva transferencia</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>Recibir mercancía para reparar</p>
          </div>
          <span style={{ color: "#c4cbd4", fontSize: 22 }}>›</span>
        </button>

        {/* Paso 2 */}
        {loading ? (
          <div style={{ ...tarjeta, cursor: "default", color: MUTED, fontSize: 13 }}>Cargando...</div>
        ) : batchesActivos.length === 0 ? (
          <div style={{ background: SURF, borderRadius: 18, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={num(false)}>2</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Reparación en progreso</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>No tienes batches activos</p>
            </div>
          </div>
        ) : (
          batchesActivos.map((b, i) => {
            const p = progreso[b.id] || { hechas: 0, total: 0 };
            const pct = p.total > 0 ? Math.round((p.hechas / p.total) * 100) : 0;
            const devuelto = b.revisado_at && (b.estado === "abierto" || b.estado === "recibido");

            if (devuelto) {
              return (
                <button key={b.id} onClick={() => onOpenBatch(b)} style={{ background: "#fff8ef", border: "1px solid #f0c67a", borderRadius: 18, padding: 20, boxShadow: "0 6px 18px rgba(176,120,15,0.14)", textAlign: "left", cursor: "pointer", color: TEXT }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 17, background: "#f0b429", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3a2a00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 5 5v2"></path></svg>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#93650f" }}>Devuelto por revisión</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 23, fontWeight: 700 }}>Transferencia #{b.numero_transferencia}</p>
                  {b.nota_revision ? (
                    <div style={{ marginTop: 12, background: "#fff", border: "1px solid #f3e2c4", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#93650f", textTransform: "uppercase", letterSpacing: 0.4 }}>Nota del supervisor</p>
                      <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45 }}>{b.nota_revision}</p>
                    </div>
                  ) : (
                    <p style={{ margin: "8px 0 0", fontSize: 14, color: "#93650f" }}>Toca para corregir y reenviar a revisión</p>
                  )}
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#93650f" }}>
                    Abrir y corregir
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93650f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
                  </div>
                </button>
              );
            }

            return (
              <button key={b.id} onClick={() => onOpenBatch(b)} style={{ background: NAVY, border: "none", borderRadius: 18, padding: 20, boxShadow: "0 6px 18px rgba(15,61,99,0.22)", color: "#fff", textAlign: "left", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={num(true)}>{i === 0 ? "2" : "•"}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.85 }}>Reparación en progreso</span>
                </div>
                <p style={{ margin: 0, fontSize: 23, fontWeight: 700 }}>Transferencia #{b.numero_transferencia}</p>
                <p style={{ margin: "8px 0 16px", fontSize: 14, opacity: 0.85 }}>
                  {p.total > 0 ? `${p.hechas} de ${p.total} unidades reparadas` : "Toca para reparar unidades"}
                </p>
                <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 3 }} />
                </div>
              </button>
            );
          })
        )}

        {/* Paso 3 */}
        <button onClick={onVerHistorial} style={tarjeta}>
          <div style={num(false)}>3</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Historial de arreglados</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>Completados y en revisión</p>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, background: "#eef4fb", borderRadius: 20, padding: "5px 12px" }}>{historialCount}</span>
        </button>
      </div>

      {/* Accesos rápidos */}
      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <button onClick={onVerReparaciones} style={tile}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path></svg>
          <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", color: TEXT, lineHeight: 1.25 }}>Reparaciones del equipo</span>
        </button>
        <button onClick={onVerAsistente} style={tile}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
          <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", color: TEXT, lineHeight: 1.25 }}>Videos y guías</span>
        </button>
      </div>
    </div>
  );
}
