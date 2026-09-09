export default function ScannerModal({ onScan, onClose }) {
  function abrirShortcut() {
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent("Escanear Marey")}`;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
    }}>
      <p style={{ color: "#fff", fontSize: 16, marginBottom: 8, textAlign: "center" }}>
        Toca para escanear
      </p>
      <p style={{ color: "#aaa", fontSize: 13, marginBottom: 24, textAlign: "center", maxWidth: 280 }}>
        Después de escanear, regresa a esta app tocando "Marey Reparación" abajo o deslizando hacia arriba
      </p>
      <button
        onClick={abrirShortcut}
        style={{ padding: "18px 40px", background: "#0f3d63", color: "#fff", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "none", marginBottom: 16 }}
      >
        Abrir escáner
      </button>
      <button
        onClick={onClose}
        style={{ padding: "12px 28px", background: "transparent", color: "#fff", borderRadius: 10, fontSize: 13, border: "1px solid #666" }}
      >
        Cancelar (pegar manualmente)
      </button>
    </div>
  );
}
