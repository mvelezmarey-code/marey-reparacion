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

  async function guardar() {
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
      return;
    }
    onGuardada();
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Reparar unidad</span>
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
        <input type="checkbox" checked={oldSnNa} onChange={(e) => {
