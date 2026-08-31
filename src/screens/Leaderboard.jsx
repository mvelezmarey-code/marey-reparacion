import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Leaderboard({ tecnico, onBack }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [anio, mes]);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("v_leaderboard_mensual")
      .select("*")
      .eq("anio", anio)
      .eq("mes", mes)
      .order("total_puntos", { ascending: false });
    setFilas(data || []);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "6px 10px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>Ranking de técnicos</span>
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          style={{ fontSize: 12, padding: "4px 6px", border: "0.5px solid #ddd", borderRadius: 8 }}
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m} {anio}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
      ) : filas.length === 0 ? (
        <p style={{ fontSize: 13, color: "#999" }}>Sin puntos registrados este mes.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filas.map((f, i) => (
            <div
              key={f.tecnico_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                background: i === 0 ? "#faeeda" : f.tecnico_id === tecnico ? "#eef3fb" : "#f4f3ee",
                fontWeight: i === 0 || f.tecnico_id === tecnico ? 500 : 400,
                fontSize: 13,
              }}
            >
              <span style={{ width: 18, color: "#999" }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{f.tecnico_id}</span>
              <span>{f.total_puntos} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
