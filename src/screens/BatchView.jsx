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
  const faltan = Math.max(0, total - hechas);
  const pct = total > 0 ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
  const modelosDisponibles = progreso.filter((p) => p.pendientes > 0);
  const enProceso = estadoActual === "abierto" || estadoActual === "recibido";
  const puedeFinalizar = completo && enProceso;

  const decisiones = contar(unidades, (u) => u.decision);
  const piezas = contar(unidades, (u) => u.piezas_danadas || []).filter((p) => p.nombre !== "Ninguna");
  const empleados = porEmpleado(unidades);

  const estadoLabel = { recibido: "En proceso", abierto: "En proceso", pendiente_revision: "Pendiente de revisión", cerrado: "Cerrado" };
  const estadoBg = { recibido: "#eef4fb", abierto: "#eef4fb", pendiente_revision: "#fdf0dc", cerrado: "#e6f0dd" };
  const estadoColor = { recibido: NAVY, abierto: NAVY, pendiente_revision: "#93650f", cerrado: "#2f5c17" };

  const shellStyle = {
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const backBtn = { width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" };
  const footer = { flexShrink: 0, paddingTop: 12, paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: "#fff" };
  const botonPrimario = { width: "100%", padding: 16, fontSize: 15, fontWeight: 700, background: NAVY, color: "#fff", border: "none", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,61,99,0.22)" };

  // ----- bloques reutilizables -----
  const Hero = ({ mostrarFaltan = true }) => (
    <div style={{ background: NAVY, borderRadius: 18, padding: "16px 18px", color: "#fff", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{hechas}</span>
        <span style={{ fontSize: 14, opacity: 0.8 }}>de {total} arreglados</span>
        {mostrarFaltan && (
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.14)", borderRadius: 20, padding: "5px 11px" }}>
            {faltan === 0 ? "Completo" : `Faltan ${faltan}`}
          </span>
        )}
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden", marginBottom: decisiones.length ? 12 : 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 3 }} />
      </div>
      {decisiones.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {decisiones.map((d) => <Tag key={d.nombre} texto={`${d.cantidad} ${d.nombre}`} decision={d.nombre} />)}
        </div>
      )}
    </div>
  );

  const PorModelo = () => (
    <>
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
    </>
  );

  const PorEmpleado = () => (
    <>
      <p style={estilos.lbl}>Por empleado</p>
      <div style={estilos.card}>
        {empleados.length === 0 && <Fila primera><span style={{ color: MUTED, fontSize: 13 }}>Nadie ha registrado todavía</span></Fila>}
        {empleados.map((e, i) => (
          <Fila key={e.nombre} primera={i === 0} alineaArriba>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{e.nombre}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {Object.entries(e.decisiones).map(([d, n]) => <Tag key={d} texto={`${n} ${d}`} decision={d} />)}
              </div>
            </div>
            <span style={estilos.n}>{e.cantidad}</span>
          </Fila>
        ))}
        {empleados.length > 0 && <Total valor={hechas} />}
      </div>
    </>
  );

  const Piezas = () => (
    <>
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
    </>
  );

  const Historial = ({ titulo = "Historial de reparación", editable }) => (
    <>
      <p style={estilos.lbl}>{titulo}</p>
      <div style={{ ...estilos.card, marginBottom: 8 }}>
        {unidades.length === 0 && <Fila primera><span style={{ color: MUTED, fontSize: 13 }}>Sin unidades reparadas todavía.</span></Fila>}
        {unidades.map((u, i) => {
          const contenido = (
            <>
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.modelo_codigo} · {u.old_sn_na ? "sin serial" : u.old_sn}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(u.piezas_danadas || []).join(", ") || "Sin piezas"}
                  {u.tecnico_nombre ? ` · ${u.tecnico_nombre}` : ""}
                  {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Tag texto={u.decision || "Sin decisión"} decision={u.decision} />
                {editable && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                )}
              </div>
            </>
          );
          const base = { ...(i === 0 ? estilos.rowFirst : estilos.row), width: "100%", boxSizing: "border-box" };
          return editable ? (
            <button key={u.id} onClick={() => onEditarUnidad(u)} style={{ ...base, background: "transparent", border: "none", borderTop: i === 0 ? "none" : "1px solid #f1f3f6", cursor: "pointer", color: TEXT, padding: "11px 0" }}>{contenido}</button>
          ) : (
            <div key={u.id} style={base}>{contenido}</div>
          );
        })}
      </div>
    </>
  );

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

  // ---------- Pantalla: resumen antes de enviar ----------
  if (mostrarResumen) {
    return (
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
          <button onClick={() => setMostrarResumen(false)} aria-label="Volver" style={backBtn}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Resumen del batch</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, background: "#eef4fb", borderRadius: 20, padding: "6px 12px" }}>#{batch.numero_transferencia}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#e6f0dd", borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f5c17" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2f5c17" }}>{hechas} de {total} unidades listas</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3b6d2b" }}>Revisa que todo esté bien antes de enviar.</p>
            </div>
          </div>

          <PorModelo />
          <PorEmpleado />
          <Piezas />
          <Historial titulo={`Unidades (${unidades.length})`} editable={false} />

          <div style={{ background: "#fff7e6", border: "1px solid #f3dca6", borderRadius: 12, padding: "9px 12px", margin: "8px 0 8px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#7a5a12", lineHeight: 1.45 }}>¿Algo está mal? Vuelve atrás y toca el lápiz en la unidad para corregirla (te pedirá el motivo).</p>
          </div>
        </div>

        <div style={footer}>
          <button onClick={() => { setMostrarResumen(false); setHojaFinalUrl(""); setMostrarFinal(true); }} style={botonPrimario}>
            Todo correcto, enviar batch
          </button>
        </div>
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
            <p style={{ ...estilos.lbl, margin: 0 }}>Foto final de la hoja de almacén</p>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#8a2d2d", background: "#fbe3e3", borderRadius: 10, padding: "3px 8px" }}>OBLIGATORIA</span>
          </div>
          <FotoHoja prefijo={`hoja-final-${batch.id}`} etiqueta="Tomar foto final" onSubida={setHojaFinalUrl} urlActual={hojaFinalUrl || null} />
        </div>

        <div style={footer}>
          <button onClick={enviarRevisionFinal} disabled={!hojaFinalUrl || enviando} style={{ ...botonPrimario, opacity: (!hojaFinalUrl || enviando) ? 0.5 : 1 }}>
            {enviando ? "Enviando..." : "Enviar a revisión"}
          </button>
          {!hojaFinalUrl && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#98a1ae", textAlign: "center" }}>Se activa cuando ya tomaste la foto</p>}
        </div>
      </div>
    );
  }

  // ---------- Vista principal ----------
  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
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

            <Hero />
            <PorModelo />
            <PorEmpleado />
            <Piezas />
            <Historial editable={enProceso && typeof onEditarUnidad === "function"} />
          </div>

          {modelosDisponibles.length > 0 ? (
            <div style={footer}>
              <button onClick={() => onRepararUnidad(batch, modelosDisponibles)} style={botonPrimario}>Comenzar reparación</button>
            </div>
          ) : puedeFinalizar ? (
            <div style={footer}>
              <button onClick={() => setMostrarResumen(true)} style={botonPrimario}>Finalizar y enviar a revisión</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
