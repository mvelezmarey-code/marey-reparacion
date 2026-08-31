import { useState } from "react";
import { supabase } from "../lib/supabase";

const MODELOS = ["PP110", "PP220", "ECO070", "ECO085", "ECO110", "GA5FLP", "GA6FLP", "GA10FLP", "GA16FLP"];

export default function NuevoBatch({ onBack, onCreado }) {
  const [numero, setNumero] = useState("");
  const [items, setItems] = useState([{ modelo: MODELOS[0], cantidad: 1 }]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  function modelosDisponiblesPara(indiceActual) {
    const yaUsados = items.filter((_, i) => i !== indiceActual).map((it) => it.modelo);
    return MODELOS.filter((m) => !yaUsados.includes(m));
  }

  function agregarModelo() {
    const usados = items.map((it) => it.modelo);
    const siguienteLibre = MODELOS.find((m) => !usados.includes(m));
    if (!siguienteLibre) {
      setError("Ya agregaste todos los modelos disponibles.");
      return;
    }
    setError("");
    setItems([...items, { modelo: siguienteLibre, cantidad: 1 }]);
  }

  function quitarModelo(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function actualizar(i, campo, valor) {
    if (campo === "modelo") {
      const yaUsado = items.some((it, idx) => idx !== i && it.modelo === valor);
      if (yaUsado) {
        setError("Ese modelo ya está agregado en este batch.");
        return;
      }
      setError("");
    }
    const copia = [...items];
    copia[i][campo] = valor;
    setItems(copia);
  }

  function validar() {
    if (!numero.trim()) {
      setError("Escribe el número de transferencia.");
      return false;
    }
    if (items.some((it) => !it.cantidad || it.cantidad < 1)) {
      setError("Cada modelo necesita una cantidad válida.");
      return false;
    }
    const modelosUnicos = new Set(items.map((it) => it.modelo));
    if (modelosUnicos.size !== items.length) {
      setError("No puedes repetir el mismo modelo dos veces.");
      return false;
    }
    setError("");
    return true;
  }

  function pedirConfirmacion() {
    if (validar()) {
      setMostrarConfirmacion(true);
    }
  }

  async function crear() {
    setGuardando(true);
    try {
      const { data: batch, error: errBatch } = await supabase
        .from("batches")
        .insert({ numero_transferencia: numero.trim(), estado: "recibido" })
        .select()
        .single();

      if (errBatch) {
        const mensaje = errBatch.message.includes("duplicate") || errBatch.message.includes("unique")
          ? "Ese número de transferencia ya existe. Usa uno distinto."
          : errBatch.message;
        setError(mensaje);
        setGuardando(false);
        setMostrarConfirmacion(false);
        return;
      }

      const rows = items.map((it) => ({
        batch_id: batch.id,
        modelo_codigo: it.modelo,
        cantidad_declarada: Number(it.cantidad),
      }));
      const { error: errItems } = await supabase.from("batch_items").insert(rows);

      if (errItems) {
        setError(errItems.message);
        setGuardando(false);
        setMostrarConfirmacion(false);
        return;
      }

      setGuardando(false);
      onCreado(batch);
    } catch (e) {
      console.error("Error creando batch:", e);
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
      setGuardando(false);
      setMostrarConfirmacion(false);
    }
  }

  const totalUnidades = items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);

  if (mostrarConfirmacion) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, maxWidth: 320, margin: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          <p style={{
