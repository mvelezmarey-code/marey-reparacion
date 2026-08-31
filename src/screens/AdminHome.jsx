export default function AdminHome({ tecnico, onVerRevision, onVerEstadisticas, onVerLeaderboard, onSalir }) {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: "#666" }}>Admin · {tecnico}</span>
        <button onClick={onSalir} style={{ fontSize: 12, padding: "4px 8px", border: "0.5px solid #ddd", borderRadius: 8 }}>
          Cambiar
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={onVerRevision}
          style={{ padding: 18, fontSize: 15, fontWeight: 600, background: "#fdf3e3", border: "none", borderRadius: 12, textAlign: "left" }}
        >
          ⏳ Revisión de batches
        </button>
        <button
          onClick={onVerEstadisticas}
          style={{ padding: 18, fontSize: 15, fontWeight: 600, background: "#eef3fb", border: "none", borderRadius: 12, textAlign: "left" }}
        >
          📊 Estadísticas
        </button>
        <button
          onClick={onVerLeaderboard}
          style={{ padding: 18, fontSize: 15, fontWeight: 600, background: "#eaf3de", border: "none", borderRadius: 12, textAlign: "left" }}
        >
          🏆 Ranking de técnicos
        </button>
      </div>
    </div>
  );
}
