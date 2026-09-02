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
          <div style={{ display: "flex", gap:
