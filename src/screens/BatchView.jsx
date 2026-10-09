import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import FotoHoja from "../components/FotoHoja";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

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

function chipDecision(d) {
  if (d === "Refurbished") return { bg: "#edf7ea", fg: "#2b5a1f" };
  if (d === "Descartar" || d === "Dummy") return { bg: "#fbe3e3", fg: "#8a2d2d" };
  return { bg: "#e7eef7", fg: NAVY };
}

function Tag({ decision }) {
  const c = chipDecision(decision);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, borderRadius: 10, padding: "4px 9px", whiteSpace: "nowrap" }}>
      {decision || "Sin decisión"}
    </span>
  );
}

function TablaPivot({ titulo, columna, filas, conTag = false }) {
  const total = filas.reduce((a, f) => a + f.cantidad, 0);
  return (
    <>
      <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 8px" }}>{titulo}</p>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: "0 2px 10px rgba(16,32,53,0.05)", overflow: "hidden", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: SURF }}>
              <th style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, padding: "9px 14px" }}>{columna}</th>
              <th style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: MUTED, padding: "9px 14px" }}>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={2} style={{ padding: "10px 14px", color: MUTED, borderTop: `1px solid ${LINE}` }}>Sin registros todavía</td></tr>
            )}
            {filas.map((f) => (
              <tr key={f.nombre}>
                <td style={{ padding: "9px 14px", borderTop: `1px solid ${LINE}` }}>{conTag ? <Tag decision={f.nombre} /> : f.nombre}</td>
                <td style={{ padding: "9px 14px", borderTop: `1px solid ${LINE}`, textAlign: "right", fontWeight: 600 }}>{f.cantidad}</td>
              </tr>
            ))}
            <tr style={{ background: "#eaf0f7" }}>
              <td style={{ padding: "9px 14px", borderTop: `1px solid ${LINE}`, color: NAVY, fontWeight: 800 }}>Total</td>
              <td style={{ padding: "9px 14px", borderTop: `1px solid ${LINE}`, textAlign: "right", color: NAVY, fontWeight: 800 }}>{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BatchView({ batch, onBack, onRepararUnidad, onEditarUnidad }) {
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoActual, setEstadoActual] = useState(batch.estado);
  const [esDevuelto, setEsDevuelto] = useState(false);
  const [notaRevision, setNotaRevision] = useState("");
  const [completo, setCompleto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [mostrarFinal, setMostrarFinal] = useState(false);
  const [hojaFinalUrl, setHojaFinalUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarCompletado, setMostrarCompletado] = useState(false);

  useEffect(() => {
    cargar();
    // Auto-refresh "en vivo": recarga silenciosa cada 10s
    const id = setInterval(() => cargar(true), 10000);
    return () => clearInterval(id);
  }, [batch.id]);

  async function cargar(silent = false) {
    if (!silent) setLoading(true);

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

    const declarado = (batchItems || []).reduce((a, i) => a + i.cantidad_declarada, 0);
    const completadas = (unidadesData || []).length;
    setCompleto(declarado > 0 && completadas >= declarado);

    if (!silent) setLoading(false);
  }

  async function enviarRevisionFinal() {
    if (!hojaFinalUrl) return;
    setEnviando(true);
    await supabase
      .from("batches")
      .update({ estado: "pendiente_revision", hoja_final_url: hojaFinalUrl })
      .eq("id", batch.id);
    setEnviando(false);
    setEstadoActual("pendiente_revision");
    setMostrarFinal(false);
    setMostrarCompletado(true);
  }

  const progreso = items.map((it) => {
    const completadas = unidades.filter((u) => u.modelo_codigo === it.modelo_codigo).length;
    return { ...it, completadas, pendientes: it.cantidad_declarada - completadas };
  });

  const total = items.reduce((a, i) => a + i.cantidad_declarada, 0);
  const hechas = unidades.length;
  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);
  const enProceso = estadoActual === "abierto" || estadoActual === "recibido";
  const puedeFinalizar = completo && enProceso;

  const porDecision = contar(unidades, (u) => u.decision);
  const porPieza = contar(unidades, (u) => u.piezas_danadas || []).filter((p) => p.nombre !== "Ninguna");
  const porTecnico = contar(unidades, (u) => u.tecnico_nombre || "Sin registrar");

  const estadoLabel = {
    recibido: "En proceso", abierto: "En proceso",
    pendiente_revision: "Pendiente de revisión", cerrado: "Cerrado",
  };
  const estadoBg = {
    recibido: "#eef4fb", abierto: "#eef4fb",
    pendiente_revision: "#fdf0dc", cerrado: "#e6f0dd",
  };
  const estadoColor = {
    recibido: NAVY, abierto: NAVY,
    pendiente_revision: "#93650f", cerrado: "#2f5c17",
  };

  const shellStyle = {
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const seccionLabel = { fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 8px" };
  const tarjeta = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: "0 2px 10px rgba(16,32,53,0.05)", flexShrink: 0 };
  const backBtn = { width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" };
  const footer = { flexShrink: 0, paddingTop: 12, paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff" };
  const botonPrimario = { width: "100%", padding: 16, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,61,99,0.22)" };

  // ---------- Modal: completado ----------
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
          <button onClick={onBack} style={{ width: "100%", padding: 15, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14 }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ---------- Pantalla: reporte completo / resumen antes de enviar ----------
  if (mostrarResumen) {
    return (
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
          <button onClick={() => setMostrarResumen(false)} aria-label="Volver" style={backBtn}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>{puedeFinalizar ? "Resumen del batch" : "Reporte hasta ahora"}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, background: "#eef4fb", borderRadius: 20, padding: "6px 12px" }}>#{batch.numero_transferencia}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: puedeFinalizar ? "#e6f0dd" : "#eef4fb", borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {puedeFinalizar ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f5c17" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l3 2"></path></svg>
              )}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: puedeFinalizar ? "#2f5c17" : NAVY }}>{hechas} de {total} unidades listas</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: puedeFinalizar ? "#3b6d2b" : MUTED }}>
                {puedeFinalizar ? "Revisa que todo esté bien antes de enviar el batch." : "El batch sigue en progreso. Esto se actualiza solo."}
              </p>
            </div>
          </div>

          <p style={seccionLabel}>Por modelo</p>
          <div style={{ ...tarjeta, padding: "4px 15px", marginBottom: 14 }}>
            {progreso.map((p, i) => (
              <div key={p.modelo_codigo} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}`, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{p.modelo_codigo}</span>
                <span style={{ fontWeight: 700, color: p.pendientes === 0 ? "#2f5c17" : NAVY }}>{p.completadas}/{p.cantidad_declarada}</span>
              </div>
            ))}
          </div>

          <TablaPivot titulo="Decisiones" columna="Decisión" filas={porDecision} conTag />
          <TablaPivot titulo="Piezas dañadas" columna="Pieza" filas={porPieza} />
          <TablaPivot titulo="Por técnico" columna="Técnico" filas={porTecnico} />

          <p style={seccionLabel}>Unidades ({unidades.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {unidades.map((u) => (
              <div key={u.id} style={{ ...tarjeta, padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(u.piezas_danadas || []).join(", ") || "Sin piezas"}{u.tecnico_nombre ? ` · ${u.tecnico_nombre}` : ""}
                  </p>
                </div>
                <Tag decision={u.decision} />
              </div>
            ))}
          </div>

          {puedeFinalizar && (
            <div style={{ background: "#fff7e6", border: "1px solid #f3dca6", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#7a5a12", lineHeight: 1.45 }}>
                ¿Algo está mal? Vuelve atrás y toca el lápiz en la unidad para corregirla (te pedirá el motivo).
              </p>
            </div>
          )}
        </div>

        {puedeFinalizar && (
          <div style={footer}>
            <button onClick={() => { setMostrarResumen(false); setHojaFinalUrl(""); setMostrarFinal(true); }} style={botonPrimario}>
              Todo correcto, enviar batch
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- Pantalla: foto final ----------
  if (mostrarFinal) {
    return (
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexShrink: 0 }}>
          <button onClick={() => { setMostrarFinal(false); setMostrarResumen(true); }} aria-label="Volver" style={backBtn}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Foto final de la hoja</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#e6f0dd", borderRadius: 16, padding: 16, marginBottom: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f5c17" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2f5c17" }}>Todas las unidades están listas</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#3b6d2b" }}>Toma la foto de la hoja marcada para enviar a revisión.</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
            <p style={{ ...seccionLabel, margin: 0 }}>Foto final de la hoja de almacén</p>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#8a2d2d", background: "#fbe3e3", borderRadius: 10, padding: "3px 8px" }}>OBLIGATORIA</span>
          </div>
          <FotoHoja prefijo={`hoja-final-${batch.id}`} etiqueta="Tomar foto final" onSubida={setHojaFinalUrl} urlActual={hojaFinalUrl || null} />
        </div>

        <div style={footer}>
          <button onClick={enviarRevisionFinal} disabled={!hojaFinalUrl || enviando} style={{ ...botonPrimario, opacity: (!hojaFinalUrl || enviando) ? 0.5 : 1 }}>
            {enviando ? "Enviando..." : "Enviar a revisión"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Vista principal ----------
  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={backBtn}>
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
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
            {esDevuelto && (
              <div style={{ background: "#fff8ef", border: "1px solid #f0c67a", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: notaRevision ? 10 : 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93650f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 5 5v2"></path></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#93650f" }}>Devuelto por el supervisor</span>
                </div>
                {notaRevision && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: TEXT }}>{notaRevision}</p>}
              </div>
            )}

            {/* Total grande */}
            <div style={{ background: NAVY, borderRadius: 16, padding: "14px 16px", color: "#fff", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.8 }}>Llevan en total</p>
                <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                  {hechas} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>de {total} arreglados</span>
                </p>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, opacity: 0.85, flexShrink: 0 }}>
                {progreso.map((p) => (
                  <div key={p.modelo_codigo}>{p.modelo_codigo} {p.completadas}/{p.cantidad_declarada}</div>
                ))}
              </div>
            </div>

            {/* Progreso por modelo */}
            <p style={seccionLabel}>Cantidad producto por arreglar</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {progreso.map((p) => {
                const pct = p.cantidad_declarada > 0 ? Math.round((p.completadas / p.cantidad_declarada) * 100) : 0;
                return (
                  <div key={p.modelo_codigo} style={{ ...tarjeta, padding: "12px 15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{p.modelo_codigo}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: p.pendientes === 0 ? "#2f5c17" : NAVY }}>{p.completadas}/{p.cantidad_declarada}</span>
                    </div>
                    <div style={{ background: SURF, borderRadius: 6, height: 6, overflow: "hidden" }}>
                      <div style={{ background: p.pendientes === 0 ? "#2f5c17" : NAVY, height: "100%", width: `${pct}%`, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pivots en vivo */}
            <TablaPivot titulo="Decisiones" columna="Decisión" filas={porDecision} conTag />
            <TablaPivot titulo="Piezas dañadas" columna="Pieza" filas={porPieza} />

            <button onClick={() => setMostrarResumen(true)} style={{ width: "100%", background: "transparent", border: "none", padding: "2px 2px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Ver reporte completo</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
            </button>

            {/* Historial con tags */}
            <p style={seccionLabel}>Historial de reparación</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 6 }}>
              {unidades.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>Sin unidades reparadas todavía.</p>}
              {unidades.map((u) => {
                const editable = enProceso && typeof onEditarUnidad === "function";
                const contenido = (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0, textAlign: "left" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {(u.piezas_danadas || []).join(", ") || "Sin piezas"}
                        {u.tecnico_nombre ? ` · ${u.tecnico_nombre}` : ""}
                        {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Tag decision={u.decision} />
                      {editable && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                      )}
                    </div>
                  </div>
                );
                return editable ? (
                  <button key={u.id} onClick={() => onEditarUnidad(u)} style={{ ...tarjeta, padding: "12px 13px", width: "100%", cursor: "pointer", display: "block", color: TEXT }}>{contenido}</button>
                ) : (
                  <div key={u.id} style={{ ...tarjeta, padding: "12px 13px" }}>{contenido}</div>
                );
              })}
            </div>
          </div>

          {/* Botón anclado abajo */}
          {modelosDisponibles.length > 0 ? (
            <div style={footer}>
              <button onClick={() => onRepararUnidad(batch, modelosDisponibles)} style={botonPrimario}>
                Comenzar reparación
              </button>
            </div>
          ) : puedeFinalizar ? (
            <div style={footer}>
              <button onClick={() => setMostrarResumen(true)} style={botonPrimario}>
                Finalizar y enviar a revisión
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
