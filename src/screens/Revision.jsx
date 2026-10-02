import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const NAVY = "#0f3d63";
const TEXT = "#10151c";
const MUTED = "#6b7685";
const LINE = "#edf0f4";
const SURF = "#f7f9fc";

function colorDecision(d) {
  const t = (d || "").toLowerCase();
  if (t.includes("refurb")) return { c: "#2f5c17", b: "#e6f0dd" };
  if (t.includes("nuevo")) return { c: NAVY, b: "#eef4fb" };
  if (t.includes("descart")) return { c: "#8a2d2d", b: "#fbe3e3" };
  return { c: MUTED, b: "#f0f2f5" };
}

function fechaCorta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const hora = d.toLocaleTimeString("es-PR", { hour: "numeric", minute: "2-digit" });
  if (same(d, hoy)) return `Hoy ${hora}`;
  if (same(d, ayer)) return `Ayer ${hora}`;
  return `${d.toLocaleDateString("es-PR", { day: "numeric", month: "short" })} ${hora}`;
}

export default function Revision({ onBack }) {
  const [batches, setBatches] = useState([]);
  const [itemsPorBatch, setItemsPorBatch] = useState({});
  const [tecnicoPorBatch, setTecnicoPorBatch] = useState({});
  const [loading, setLoading] = useState(true);

  const [detalle, setDetalle] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [itemsDetalle, setItemsDetalle] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nota, setNota] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("batches")
      .select("id, numero_transferencia, estado, created_at")
      .eq("estado", "pendiente_revision")
      .order("created_at", { ascending: true });
    const lista = data || [];
    setBatches(lista);

    const ids = lista.map((b) => b.id);
    const mapaItems = {};
    const mapaTec = {};
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("batch_items")
        .select("batch_id, modelo_codigo, cantidad_declarada")
        .in("batch_id", ids);
      (items || []).forEach((it) => {
        (mapaItems[it.batch_id] = mapaItems[it.batch_id] || []).push(it);
      });

      const { data: uni } = await supabase
        .from("unidades")
        .select("batch_id, tecnico_nombre")
        .in("batch_id", ids);
      const setsTec = {};
      (uni || []).forEach((u) => {
        (setsTec[u.batch_id] = setsTec[u.batch_id] || new Set()).add(u.tecnico_nombre || "Sin registrar");
      });
      Object.keys(setsTec).forEach((id) => {
        mapaTec[id] = [...setsTec[id]];
      });
    }
    setItemsPorBatch(mapaItems);
    setTecnicoPorBatch(mapaTec);
    setLoading(false);
  }

  async function abrirDetalle(batch) {
    setDetalle(batch);
    setNota("");
    setCargandoDetalle(true);
    const { data: u } = await supabase
      .from("unidades")
      .select("*")
      .eq("batch_id", batch.id)
      .order("created_at", { ascending: true });
    const { data: it } = await supabase
      .from("batch_items")
      .select("modelo_codigo, cantidad_declarada")
      .eq("batch_id", batch.id);
    setUnidades(u || []);
    setItemsDetalle(it || []);
    setCargandoDetalle(false);
  }

  function volverLista() {
    setDetalle(null);
    setUnidades([]);
    setItemsDetalle([]);
    setNota("");
    cargar();
  }

  async function aprobar() {
    setProcesando(true);
    await supabase
      .from("batches")
      .update({
        estado: "cerrado",
        closed_at: new Date().toISOString(),
        revisado_at: new Date().toISOString(),
        nota_revision: nota.trim() || null,
      })
      .eq("id", detalle.id);
    setProcesando(false);
    volverLista();
  }

  async function devolver() {
    setProcesando(true);
    await supabase
      .from("batches")
      .update({
        estado: "abierto",
        revisado_at: new Date().toISOString(),
        nota_revision: nota.trim() || null,
      })
      .eq("id", detalle.id);
    setProcesando(false);
    volverLista();
  }

  const shellStyle = {
    height: "100dvh", maxWidth: 480, margin: "0 auto", padding: "18px 20px 0",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
    background: "#fff", color: TEXT, overflow: "hidden", WebkitFontSmoothing: "antialiased",
  };
  const backBtn = { width: 40, height: 40, borderRadius: 20, background: SURF, border: "none", display: "flex", alignItems: "center", justifyContent: "center" };
  const chip = (txt, strong) => ({
    fontSize: 12, fontWeight: strong ? 700 : 600,
    color: strong ? NAVY : TEXT, background: strong ? "#eef4fb" : SURF,
    borderRadius: 8, padding: "5px 10px",
  });

  function desglose(items) {
    return (items || []).map((it) => `${it.modelo_codigo} · ${it.cantidad_declarada}`);
  }
  function totalUnidades(items) {
    return (items || []).reduce((a, it) => a + (it.cantidad_declarada || 0), 0);
  }

  // ---------- VISTA DETALLE ----------
  if (detalle) {
    const totUnidades = totalUnidades(itemsDetalle);
    const tecs = tecnicoPorBatch[detalle.id] || [];
    return (
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
          <button onClick={volverLista} aria-label="Volver" style={backBtn}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Transferencia #{detalle.numero_transferencia}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#93650f", background: "#fdf0dc", borderRadius: 20, padding: "6px 12px" }}>Pendiente</span>
        </div>

        {cargandoDetalle ? (
          <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
              {/* Info */}
              <div style={{ background: SURF, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED }}>
                  {(tecs.length ? tecs.join(", ") : "Sin registrar")} · {fechaCorta(detalle.created_at)}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {desglose(itemsDetalle).map((t) => (<span key={t} style={{ ...chip("", false), background: "#fff" }}>{t}</span>))}
                  <span style={chip("", true)}>{totUnidades} unidades</span>
                </div>
              </div>

              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Unidades reparadas · {unidades.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {unidades.length === 0 && <p style={{ fontSize: 13, color: MUTED }}>Sin unidades registradas.</p>}
                {unidades.map((u) => {
                  const col = colorDecision(u.decision);
                  const serial = u.old_sn_na ? "sin serial" : u.old_sn;
                  return (
                    <div key={u.id} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 14px", boxShadow: "0 2px 10px rgba(16,32,53,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, fontWeight: 700 }}>
                        <span>{u.modelo_codigo} · {serial}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col.c, background: col.b, borderRadius: 12, padding: "3px 9px", flexShrink: 0 }}>{u.decision}</span>
                      </div>
                      <p style={{ margin: "5px 0 0", fontSize: 11, color: MUTED }}>
                        {(u.piezas_danadas || []).join(", ")}
                        {u.new_sn ? ` · nuevo SN: ${u.new_sn}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Nota al técnico */}
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Nota para el técnico (opcional)
              </p>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. Revisar el sellado de la unidad antes de cerrar…"
                rows={2}
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid #e6e8ec`, borderRadius: 13, padding: 13, fontSize: 14, color: TEXT, resize: "none", fontFamily: "inherit", marginBottom: 6 }}
              />
            </div>

            {/* Acciones ancladas */}
            <div style={{ flexShrink: 0, display: "flex", gap: 10, padding: "14px 0 calc(16px + env(safe-area-inset-bottom))", background: "#fff", borderTop: `1px solid #f2f4f7` }}>
              <button onClick={devolver} disabled={procesando} style={{ flex: 1, padding: 16, fontSize: 15, fontWeight: 700, border: "1px solid #e0b8b8", background: "#fff", color: "#8a2d2d", borderRadius: 14, opacity: procesando ? 0.6 : 1 }}>
                {procesando ? "..." : "Devolver"}
              </button>
              <button onClick={aprobar} disabled={procesando} style={{ flex: 1, padding: 16, fontSize: 15, fontWeight: 700, border: "none", background: NAVY, color: "#fff", borderRadius: 14, boxShadow: "0 6px 18px rgba(15,61,99,0.22)", opacity: procesando ? 0.6 : 1 }}>
                {procesando ? "Guardando..." : "Aprobar"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- VISTA LISTA ----------
  const totalPendientes = batches.length;
  const totalUds = batches.reduce((a, b) => a + totalUnidades(itemsPorBatch[b.id]), 0);

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={backBtn}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Revisión de batches</span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: MUTED }}>Cargando...</p>
      ) : batches.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: MUTED }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: SURF, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b3bac4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
          <p style={{ fontSize: 14 }}>No hay transferencias pendientes de revisión.</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18, flexShrink: 0 }}>
            <div style={{ flex: 1, background: NAVY, borderRadius: 16, padding: 16, color: "#fff", boxShadow: "0 6px 18px rgba(15,61,99,0.22)" }}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>{totalPendientes}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>pendiente{totalPendientes !== 1 ? "s" : ""}</p>
            </div>
            <div style={{ flex: 1, background: SURF, borderRadius: 16, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>{totalUds}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>unidades en total</p>
            </div>
          </div>

          {/* Tarjetas */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 12, paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
            {batches.map((b) => {
              const tecs = tecnicoPorBatch[b.id] || [];
              return (
                <div key={b.id} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: 18, boxShadow: "0 2px 10px rgba(16,32,53,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Transferencia #{b.numero_transferencia}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>
                        {(tecs.length ? tecs.join(", ") : "Sin registrar")} · {fechaCorta(b.created_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#93650f", background: "#fdf0dc", borderRadius: 20, padding: "6px 12px", flexShrink: 0 }}>Pendiente</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {desglose(itemsPorBatch[b.id]).map((t) => (<span key={t} style={chip("", false)}>{t}</span>))}
                    <span style={chip("", true)}>{totalUnidades(itemsPorBatch[b.id])} unidades</span>
                  </div>
                  <button onClick={() => abrirDetalle(b)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, fontSize: 14, fontWeight: 700, border: "none", background: NAVY, color: "#fff", borderRadius: 13 }}>
                    Revisar transferencia
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
