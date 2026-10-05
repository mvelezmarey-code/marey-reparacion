import { useState } from "react";
import { supabase } from "../lib/supabase";

const LARGO_PIN = 3;

export default function SeleccionTecnico({ onSelect }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  function agregarDigito(d) {
    if (verificando) return;
    if (pin.length >= LARGO_PIN) return;
    setError("");
    const nuevo = pin + d;
    setPin(nuevo);
    if (nuevo.length === LARGO_PIN) verificar(nuevo);
  }

  function borrar() {
    if (verificando) return;
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

  const tecla = {
    width: 72, height: 72, borderRadius: "50%", fontSize: 27, fontWeight: 600,
    background: "#f7f9fc", border: "none", color: "#10151c", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      height: "100dvh", boxSizing: "border-box", background: "#fff", color: "#10151c",
      padding: "0 28px", display: "flex", flexDirection: "column", alignItems: "center",
      maxWidth: 420, margin: "0 auto", WebkitFontSmoothing: "antialiased",
    }}>
      {/* Marca */}
      <div style={{ marginTop: "min(88px, 11vh)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "#0f3d63", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(15,61,99,0.25)" }}>
          <span style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>M</span>
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 19, fontWeight: 800, color: "#10151c" }}>Marey · Reparación</p>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b7685" }}>Ingresa tu PIN — el mismo del ponchador</p>
      </div>

      {/* Puntos del PIN */}
      <div style={{ display: "flex", gap: 18, marginTop: 34 }}>
        {Array.from({ length: LARGO_PIN }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box",
              background: i < pin.length ? "#0f3d63" : "#fff",
              border: i < pin.length ? "none" : "2px solid #d7dde5",
            }}
          />
        ))}
      </div>

      {/* Estado */}
      <p style={{ fontSize: 13, color: "#a32d2d", minHeight: 18, margin: "16px 0 0" }}>
        {verificando ? "Verificando..." : error}
      </p>

      {/* Keypad */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 22, justifyContent: "center" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => agregarDigito(String(n))} style={tecla}>{n}</button>
        ))}
        <div style={{ width: 72, height: 72 }} />
        <button onClick={() => agregarDigito("0")} style={tecla}>0</button>
        <button onClick={borrar} aria-label="Borrar" style={{ ...tecla, background: "transparent" }}>
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#6b7685" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
        </button>
      </div>

      <p style={{ marginTop: "auto", marginBottom: "calc(34px + env(safe-area-inset-bottom))", fontSize: 12, color: "#98a1ae" }}>
        Son los {LARGO_PIN} dígitos de tu código de ponche
      </p>
    </div>
  );
}
