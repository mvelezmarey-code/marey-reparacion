import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

export default function Historial({ onBack, onVerResumen }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .in("estado", ["pendiente_revision", "cerrado"])
      .order("created_at", { ascending: false })
      .limit(50);
    setBatches(data || []);
    setLoading(false);
  }

  const estadoLabel = {
    pendiente_revision: "Pendiente de revisión",
    cerrado: "Cerrado",
  };
  const estadoBg = {
    pendiente_revision: "#fdf0dc",
    cerrado: "#e6f0dd",
  };
  const estadoColor = {
    pendiente_revision: "#93650f",
    cerrado: "#2f5c17",
  };

  const mismaFecha = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function etiquetaDia(fechaISO) {
    const d = new Date(fechaISO);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (mismaFecha(d, hoy)) return "Hoy";
    if (mismaFecha(d, ayer)) return "Ayer";
    const t = d.toLocaleDateString("es-PR", { weekday: "long", day: "numeric", month: "long" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function hora(fechaISO) {
    return new Date(fechaISO).toLocaleTimeString("es-PR", { hour: "numeric", minute: "2-digit" });
  }

  // Filtro por número de transferencia
  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? batches.filter((b) => String(b.numero_transferencia).toLowerCase().includes(q))
    : batches;

  // Agrupar por día (los batches ya vienen ordenados de más reciente a más viejo)
  const grupos = [];
  let actual = null;
  filtrados.forEach((b) => {
    const clave = etiquetaDia(b.created_at);
    if (!actual || actual.clave !== clave) {
      actual = { clave, items: [] };
      grupos.push(actual);
    }
    actual.items.push(b);
  });

  const shellStyle = {
    height: "100dvh",
    maxWidth: 480,
    margin: "0 auto",
    padding: "18px 20px 0",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#fff",
    color: TEXT,
    overflow: "hidden",
    WebkitFontSmoothing: "antialiased",
  };

  return (
    <div style={shellStyle}>
      {/* Header fijo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Historial de arreglados</span>
      </div>

      {/* Buscador por número de transferencia */}
      {!loading && batches.length > 0 && (
        <div style={{ position: "relative", marginBottom: 16, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            inputMode="numeric"
            placeholder="Buscar por número de transferencia"
            style={{ width: "100%", padding: "13px 40px 13px 42px", border: `1px solid #e6e8ec`, borderRadius: 13, boxSizing: "border-box", fontSize: 15, background: "#fff", color: TEXT }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} aria-label="Limpiar" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: 15, border: "none", background: SURF, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
      ) : batches.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: MUTED }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: SURF, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b3bac4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
          <p style={{ fontSize: 14 }}>Todavía no hay transferencias terminadas.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          {grupos.length === 0 && (
            <p style={{ fontSize: 14, color: MUTED, textAlign: "center", marginTop: 30 }}>
              No hay transferencias con "{busqueda}".
            </p>
          )}
          {grupos.map((g) => (
            <div key={g.clave} style={{ marginBottom: 22 }}>
              {/* Encabezado de día (división) */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 12px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase", flexShrink: 0 }}>{g.clave}</span>
                <div style={{ flex: 1, height: 1, background: LINE }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#98a1ae", flexShrink: 0 }}>{g.items.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onVerResumen(b)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "15px 16px", background: "#fff", border: `1px solid ${LINE}`,
                      borderRadius: 16, boxShadow: "0 2px 10px rgba(16,32,53,0.05)",
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Transferencia #{b.numero_transferencia}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>{hora(b.created_at)}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: estadoColor[b.estado], background: estadoBg[b.estado], borderRadius: 20, padding: "6px 12px", flexShrink: 0 }}>
                      {estadoLabel[b.estado]}
                    </span>
                    <span style={{ color: "#c4cbd4", fontSize: 22, flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
