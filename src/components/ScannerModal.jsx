export default function ScannerModal({ onScan, onClose }) {
  function abrirShortcut() {
    const callbackUrl = window.location.origin + window.location.pathname;
    const shortcutUrl = `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent("Escanear Marey")}&x-success=${encodeURIComponent(callbackUrl)}`;
    window.location.href = shortcutUrl;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20,
    }}>
      <p style={{ color: "#fff", fontSize: 16, marginBottom: 24, textAlign: "center" }}>
        Toca el botón para escanear
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
        Cancelar
      </button>
    </div>
  );
}
