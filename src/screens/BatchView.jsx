import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

export default function BatchView({ batch, onBack, onRepararUnidad }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoActual, setEstadoActual] = useState(batch.estado);
  const [esDevuelto, setEsDevuelto] = useState(false);
  const [notaRevision, setNotaRevision] = useState("");
  const [mostrarCompletado, setMostrarCompletado] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    cargar();
  }, [batch.id]);

  async function cargar() {
    setLoading(true);

    // Estado real + info de revisión (por si fue devuelto por el supervisor)
    const { data: meta } = await supabase
      .from("batches")
      .select("estado, revisado_at, nota_revision")
      .eq("id", batch.id)
      .single();
    const estadoDb = meta?.estado || batch.estado;
    const devuelto = !!meta?.revisado_at && (estadoDb === "abierto" || estadoDb === "recibido");
    setEstadoActual(estadoDb);
    setEsDevuelto(devuelto);
    setNotaRevision(meta?.nota_revision || "");

    const { data: batchItems } = await supabase
      .from("batch_items")
      .select("modelo_codigo, cantidad_declarada")
      .eq("batch_id", batch.id);

    const { data: unidadesData } = await supabase
      .from("unidades")
      .select("*")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: false });

    setItems(batchItems || []);
    setUnidades(unidadesData || []);
    setLoading(false);

    const declarado = (batchItems || []).reduce((a, i) => a + i.cantidad_declarada, 0);
    const completadas = (unidadesData || []).length;
    const completo = declarado > 0 && completadas >= declarado;

    // Auto-enviar a revisión SOLO en la primera vez que se completa.
    // Si fue devuelto, NO rebota: el técnico decide cuándo reenviar.
    if (completo && !devuelto && estadoDb !== "pendiente_revision" && estadoDb !== "cerrado") {
      await supabase.from("batches").update({ estado: "pendiente_revision" }).eq("id", batch.id);
      setEstadoActual("pendiente_revision");
      setMostrarCompletado(true);
    }
  }

  async function reenviarRevision() {
    setReenviando(true);
    await supabase.from("batches").update({ estado: "pendiente_revision" }).eq("id", batch.id);
    setReenviando(false);
    setEstadoActual("pendiente_revision");
    setMostrarCompletado(true);
  }

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });

  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);

  const estadoLabel = {
    recibido: "En proceso",
    abierto: "En proceso",
    pendiente_revision: "Pendiente de revisión",
    cerrado: "Cerrado",
  };
  const estadoBg = {
    recibido: "#eef4fb",
    abierto: "#eef4fb",
    pendiente_revision: "#fdf0dc",
    cerrado: "#e6f0dd",
  };
  const estadoColor = {
    recibido: NAVY,
    abierto: NAVY,
    pendiente_revision: "#93650f",
    cerrado: "#2f5c17",
  };

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
  const seccionLabel = {
    fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5,
    textTransform: "uppercase", margin: "0 0 10px",
  };
  const tarjeta = {
    background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16,
    boxShadow: "0 2px 10px rgba(16,32,53,0.05)", flexShrink: 0,
  };

  if (mostrarCompletado) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,32,53,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 22, padding: "32px 28px", textAlign: "center", maxWidth: 340, boxShadow: "0 12px 34px rgba(0,0,0,0.22)" }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: "#e6f0dd", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2f5c17" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
          </div>
          <p style={{ fontSize: 19, fontWeight: 700, margin: "18px 0 8px", color: TEXT }}>Enviada a revisión</p>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px", lineHeight: 1.55 }}>
            La transferencia #{batch.numero_transferencia} quedó pendiente de revisión por el supervisor.
          </p>
          <button
            onClick={onBack}
            style={{ width: "100%", padding: 15, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14 }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      {/* Header fijo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Transferencia #{batch.numero_transferencia}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: estadoColor[estadoActual], background: estadoBg[estadoActual], borderRadius: 20, padding: "6px 13px" }}>
          {estadoLabel[estadoActual]}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
      ) : (
        <>
          {/* Área que scrollea por dentro */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
            {/* Aviso de devuelto por el supervisor */}
            {esDevuelto && (
              <div style={{ background: "#fff8ef", border: "1px solid #f0c67a", borderRadius: 16, padding: 16, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: notaRevision ? 10 : 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93650f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 5 5v2"></path></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#93650f" }}>Devuelto por el supervisor</span>
                </div>
                {notaRevision && (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: TEXT }}>{notaRevision}</p>
                )}
              </div>
            )}

            <p style={seccionLabel}>Cantidad producto por arreglar</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              {progreso.map((p) => {
                const pct = Math.round((p.completadas / p.cantidad_declarada) * 100);
                return (
                  <div key={p.modelo_codigo} style={{ ...tarjeta, padding: "13px 15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{p.modelo_codigo}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: p.pendientes === 0 ? "#2f5c17" : NAVY }}>
                        {p.completadas}/{p.cantidad_declarada}
                      </span>
                    </div>
                    <div style={{ background: SURF, borderRadius: 6, height: 6, overflow: "hidden" }}>
                      <div style={{ background: p.pendientes === 0 ? "#2f5c17" : NAVY, height: "100%", width: `${pct}%`, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={seccionLabel}>Historial de reparación</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 6 }}>
              {unidades.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>Sin unidades reparadas todavía.</p>}
              {unidades.map((u) => (
                <div key={u.id} style={{ ...tarjeta, padding: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>{u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}</span>
                    <span style={{ color: MUTED, fontSize: 12, fontWeight: 500 }}>{u.decision}</span>
                  </div>
                  <p style={{ fontSize: 11, color: MUTED, margin: "5px 0 0" }}>
                    {(u.piezas_danadas || []).join(", ")}
                    {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Botón anclado abajo, siempre visible */}
          {modelosDisponibles.length > 0 ? (
            <div style={{ flexShrink: 0, paddingTop: 14, paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff" }}>
              <button
                onClick={() => onRepararUnidad(batch, modelosDisponibles)}
                style={{ width: "100%", padding: 16, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,61,99,0.22)" }}
              >
                Comenzar reparación
              </button>
            </div>
          ) : esDevuelto ? (
            <div style={{ flexShrink: 0, paddingTop: 14, paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff" }}>
              <button
                onClick={reenviarRevision}
                disabled={reenviando}
                style={{ width: "100%", padding: 16, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,61,99,0.22)", opacity: reenviando ? 0.6 : 1 }}
              >
                {reenviando ? "Enviando..." : "Reenviar a revisión"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
