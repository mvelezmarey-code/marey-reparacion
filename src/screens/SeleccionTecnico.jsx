export default function SeleccionTecnico({ listaTecnicos, onSelect }) {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 20px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, textAlign: "center", marginBottom: 20 }}>
        ¿Quién eres?
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listaTecnicos.map((t) => (
          <button
            key={t.nombre}
            onClick={() => onSelect(t.nombre, t.es_admin)}
            style={{
              padding: 18,
              fontSize: 16,
              fontWeight: 500,
              background: "#fff",
              border: "0.5px solid #ddd",
              borderRadius: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {t.nombre}
            {t.es_admin && (
              <span style={{ fontSize: 10, color: "#8a5a10", background: "#fdf3e3", padding: "3px 8px", borderRadius: 8 }}>
                ADMIN
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
