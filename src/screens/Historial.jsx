import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

const PERIODOS = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "rango", label: "Rango" },
];

export default function Historial({ onBack, onVerResumen }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [periodo, setPeriodo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    cargar();
  }, [periodo, desde, hasta]);

  function rangoFechas() {
    const now = new Date();
    if (periodo === "hoy") {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      return { desde: d.toISOString(), hasta: now.toISOString() };
    }
    if (periodo === "semana") {
      const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0);
      return { desde: d.toISOString(), hasta: now.toISOString() };
    }
    if (periodo === "mes") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { desde: d.toISOString(), hasta: now.toISOString() };
    }
    if (periodo === "rango" && desde && hasta) {
      return { desde: new Date(desde + "T00:00:00").toISOString(), hasta: new Date(hasta + "T23:59:59").toISOString() };
    }
    return null;
  }

  async function cargar() {
    setLoading(true);
    let query = supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .in("estado", ["pendiente_revision", "cerrado"])
      .order("created_at", { ascending: false })
      .limit(200);
    const r = rangoFechas();
    if (r) query = query.gte("created_at", r.desde).lte("created_at", r.hasta);
    const { data } = await query;
    setBatches(data || []);
    setLoading(false);
  }

  const estadoLabel = { pendiente_revision: "Pendiente de revisión", cerrado: "Cerrado" };
  const estadoBg = { pendiente_revision: "#fdf0dc", cerrado: "#e6f0dd" };
  const estadoColor = { pendiente_revision: "#93650f", cerrado: "#2f5c17" };

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

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? batches.filter((b) => String(b.numero_transferencia).toLowerCase().includes(q))
    : batches;

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
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const tabStyle = (activo) => ({
    flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 9,
    background: activo ? NAVY : "transparent", color: activo ? "#fff" : MUTED,
  });

  return (
    <div style={shellStyle}>
      {/* Header fijo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Historial de batches</span>
      </div>

      {/* Filtros de periodo */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: SURF, padding: 4, borderRadius: 12, flexShrink: 0 }}>
        {PERIODOS.map((p) => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} style={tabStyle(periodo === p.id)}>{p.label}</button>
        ))}
      </div>

      {/* Rango de fechas */}
      {periodo === "rango" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ flex: 1, padding: 11, border: `1px solid #e6e8ec`, borderRadius: 11, fontSize: 13, color: TEXT }} />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ flex: 1, padding: 11, border: `1px solid #e6e8ec`, borderRadius: 11, fontSize: 13, color: TEXT }} />
        </div>
      )}

      {/* Buscador por número de transferencia */}
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

      {loading ? (
        <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          {grupos.length === 0 && (
            <p style={{ fontSize: 14, color: MUTED, textAlign: "center", marginTop: 30 }}>
              {q ? `No hay transferencias con "${busqueda}".` : "No hay transferencias en este periodo."}
            </p>
          )}
          {grupos.map((g) => (
            <div key={g.clave} style={{ marginBottom: 22 }}>
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
