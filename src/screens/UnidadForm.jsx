import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DECISIONES_QUE_REQUIEREN_NEW_SN = ["Refurbished", "Nuevo"];

export default function UnidadForm({ batch, modelosDisponibles, tecnico, onBack, onGuardada }) {
  const [modelo, setModelo] = useState(modelosDisponibles[0]?.modelo_codigo || "");
  const [oldSn, setOldSn] = useState("");
  const [oldSnNa, setOldSnNa] = useState(false);
  const [piezas, setPiezas] = useState([]);
  const [decision, setDecision] = useState("");
  const [newSn, setNewSn] = useState("");
  const [catalogoPiezas, setCatalogoPiezas] = useState([]);
  const [catalogoDecisiones, setCatalogoDecisiones] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const startedAt = useState(() => new Date().toISOString())[0];

  useEffect(() => {
    cargarCatalogo();
  }, [modelo]);

  async function cargarCatalogo() {
    const { data: piezasData } = await supabase
      .from("piezas_por_modelo")
      .select("nombre, es_ninguna")
      .eq("modelo_codigo", modelo);
    const { data: decisionesData } = await supabase
      .from("decisiones_por_modelo")
      .select("decision")
      .eq("modelo_codigo", modelo);

    setCatalogoPiezas(piezasData || []);
    setCatalogoDecisiones(decisionesData || []);
    setPiezas([]);
    setDecision("");
    setNewSn("");
  }

  function togglePieza(nombre, esNinguna) {
    if (esNinguna) {
      setPiezas(piezas.includes(nombre) ? [] : [nombre]);
      return;
    }
    setPiezas((prev) => {
      const sinNinguna = prev.filter((p) => {
        const info = catalogoPiezas.find((c) => c.nombre === p);
        return !info?.es_ninguna;
      });
      return sinNinguna.includes(nombre) ? sinNinguna.filter((p) => p !== nombre) : [...sinNinguna, nombre];
    });
  }

  const requiereNewSn = DECISIONES_QUE_REQUIEREN_NEW_SN.includes(decision);

  function validarYPedirConfirmacion() {
    if (!oldSnNa && !oldSn.trim()) {
      setError("Escanea el Old SN o marca que no tiene número de serie.");
      return;
    }
    if (piezas.length === 0) {
      setError("Selecciona al menos una pieza dañada (o 'Ninguna').");
      return;
    }
    if (!decision) {
      setError("Selecciona una decisión.");
      return;
    }
    if (requiereNewSn && !newSn.trim()) {
      setError("Esta decisión requiere escanear el nuevo número de serie.");
      return;
    }
    setError("");
    setMostrarConfirmacion(true);
  }

  async function guardar() {
    setGuardando(true);

    const { error: errInsert } = await supabase.from("unidades").insert({
      batch_id: batch.id,
      modelo_codigo: modelo,
      old_sn: oldSnNa ? null : oldSn.trim(),
      old_sn_na: oldSnNa,
      new_sn: requiereNewSn ? newSn.trim() : null,
      tecnico_nombre: tecnico,
      piezas_danadas: piezas,
      decision,
      started_at: startedAt,
    });

    setGuardando(false);

    if (errInsert) {
      setError(errInsert.message);
      setMostrarConfirmacion(false);
      return;
    }
    onGuardada();
  }

  if (mostrarConfirmacion) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 320, margin: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>¿Confirmas esta información?</p>
          <div style={{ background: "#f4f3ee", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Modelo:</strong> {modelo}</p>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Old SN:</strong> {oldSnNa ? "Sin serial" : oldSn}</p>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Piezas:</strong> {piezas.join(", ")}</p>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Decisión:</strong> {decision}</p>
            {requiereNewSn && <p style={{ fontSize: 13, margin: 0 }}><strong>New SN:</strong> {newSn}</p>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setMostrarConfirmacion(false)}
              disabled={guardando}
              style={{ flex: 1, padding: 12, fontSize: 14, fontWeight: 600, border: "0.5px solid #ddd", borderRadius: 10, background: "#fff" }}
            >
              No, revisar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              style={{ flex: 1, padding: 12, fontSize: 14, fontWeight: 600, background: "#185fa5", color: "#fff", border: "none", borderRadius: 10 }}
            >
              {guardando ? "Guardando..." : "Sí, confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8 }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Reparar unidad</span>
      </div>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Calentador</label>
      <select value={modelo} onChange={(e) => setModelo(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 4, border: "0.5px solid #ddd", borderRadius: 8 }}>
        {modelosDisponibles.map((m) => (
          <option key={m.modelo_codigo} value={m.modelo_codigo}>{m.modelo_codigo}</option>
        ))}
      </select>
      <p style={{ fontSize: 11, color: "#999", margin: "0 0 14px" }}>Solo modelos pendientes de este batch</p>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Old SN</label>
      <input
        value={oldSn}
        onChange={(e) => setOldSn(e.target.value)}
        disabled={oldSnNa}
        placeholder="Escanear o escribir"
        style={{ width: "100%", padding: 10, marginBottom: 6, border: "0.5px solid #ddd", borderRadius: 8 }}
      />
      <label style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <input type="checkbox" checked={oldSnNa} onChange={(e) => { setOldSnNa(e.target.checked); setOldSn(""); }} />
        No tiene número de serie
      </label>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Piezas dañadas</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {catalogoPiezas.map((p) => (
          <button
            key={p.nombre}
            onClick={() => togglePieza(p.nombre, p.es_ninguna)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: piezas.includes(p.nombre) ? "1px solid #185fa5" : "0.5px solid #ddd",
              background: piezas.includes(p.nombre) ? "#eef3fb" : "#fff",
              color: piezas.includes(p.nombre) ? "#185fa5" : "#333",
            }}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Decisión</label>
      <select value={decision} onChange={(e) => setDecision(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 16, border: "0.5px solid #ddd", borderRadius: 8 }}>
        <option value="">Selecciona...</option>
        {catalogoDecisiones.map((d) => (
          <option key={d.decision} value={d.decision}>{d.decision}</option>
        ))}
      </select>

      {requiereNewSn && (
        <>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>New SN *</label>
          <input
            value={newSn}
            onChange={(e) => setNewSn(e.target.value)}
            placeholder="Escanear nuevo SN"
            style={{ width: "100%", padding: 10, marginBottom: 16, border: "0.5px solid #ddd", borderRadius: 8 }}
          />
        </>
      )}

      {error && <p style={{ fontSize: 12, color: "#a32d2d", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={validarYPedirConfirmacion}
        style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 500, background: "#185fa5", color: "#fff", border: "none", borderRadius: 10 }}
      >
        Guardar y volver al batch
      </button>
    </div>
  );
}
