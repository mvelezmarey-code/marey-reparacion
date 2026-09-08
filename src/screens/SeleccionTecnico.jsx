import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SeleccionTecnico({ onSelect }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  function agregarDigito(d) {
    if (pin.length >= 4) return;
    setError("");
    const nuevo = pin + d;
    setPin(nuevo);
    if (nuevo.length === 4) verificar(nuevo);
  }

  function borrar() {
    setError("");
    setPin(pin.slice(0, -1));
  }

  async function verificar(pinCompleto) {
    setVerificando(true);
    const { data, error: err } = await supabase
      .from("tecnicos")
      .select("nombre, es_admin")
      .eq("pin", pinCompleto)
      .eq("activo", true)
      .maybeSingle();

    setVerificando(false);

    if (err || !data) {
      setError("PIN incorrecto");
      setPin("");
      return;
    }
    onSelect(data.nombre, data.es_admin);
  }

  const teclaStyle = {
    width: 72, height: 72, borderRadius: "50%", fontSize: 24, fontWeight: 600,
    background: "#fff", border: "1px solid #e4e2da", color: "#222",
  };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      maxWidth: 420, margin: "0 auto", padding: 20, boxSizing: "border-box",
    }}>
      <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ingresa tu PIN</p>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 32 }}>4 dígitos</p>

      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < pin.length ? "#0f3d63" : "#e4e2da",
            }}
          />
        ))}
      </div>

      <p style={{ fontSize: 13, color: "#a32d2d", minHeight: 18, marginBottom: 16 }}>
        {verificando ? "Verificando..." : error}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => agregarDigito(String(n))} style={teclaStyle}>{n}</button>
        ))}
        <div />
        <button onClick={() => agregarDigito("0")} style={teclaStyle}>0</button>
        <button onClick={borrar} style={{ ...teclaStyle, fontSize: 18 }}>⌫</button>
      </div>
    </div>
  );
}
