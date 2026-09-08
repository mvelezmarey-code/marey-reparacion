import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ScannerModal from "../components/ScannerModal";

const DECISIONES_QUE_REQUIEREN_NEW_SN = ["Refurbished", "Nuevo"];
const TOTAL_PASOS = 4;
const LARGO_SERIAL = 11;

export default function UnidadForm({ batch, modelosDisponibles, tecnico, onBack, onGuardada }) {
  const [paso, setPaso] = useState(1);
  const [modelo, setModelo] = useState(modelosDisponibles[0]?.modelo_codigo || "");
  const [oldSn, setOldSn] = useState("");
  const [oldSnNa, setOldSnNa] = useState(false);
  const [newSn, setNewSn] = useState("");
  const [piezas, setPiezas] = useState([]);
  const [decision, setDecision] = useState("");
  const [catalogoPiezas, setCatalogoPiezas] = useState([]);
  const [catalogoDecisiones, setCatalogoDecisiones] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [escaneando, setEscaneando] = useState(null);
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

  function limpiarSerial(valor) {
    return valor.replace(/\D/g, "").slice(0, LARGO_SERIAL);
  }

  const requiereNewSn = DECISIONES_QUE_REQUIEREN_NEW_SN.includes(decision);

  function siguiente() {
    setError("");
    if (paso === 2) {
      if (!oldSnNa) {
        if (!oldSn.trim()) {
          setError("Escanea el serial o marca que no tiene número de serie.");
