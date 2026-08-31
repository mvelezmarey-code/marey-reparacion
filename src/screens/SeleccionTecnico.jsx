export default function SeleccionTecnico({ TECNICOS, onSelect }) {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 20px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, textAlign: "center", marginBottom: 20 }}>
        ¿Quién eres?
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TECNICOS.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            style={{
              padding: 18,
              fontSize: 16,
              fontWeight: 500,
              background: "#fff",
              border: "0.5px solid #ddd",
              borderRadius: 12,
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
