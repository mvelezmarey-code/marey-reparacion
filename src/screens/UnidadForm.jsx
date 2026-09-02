import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ScannerModal from "../components/ScannerModal";

const DECISIONES_QUE_REQUIEREN_NEW_SN = ["Refurbished", "Nuevo"];
const TOTAL_PASOS = 4;

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

  const requiereNewSn = DECISIONES_QUE_REQUIEREN_NEW_SN.includes(decision);

  function siguiente() {
    setError("");
    if (paso === 2 && !oldSnNa && !oldSn.trim()) {
      setError("Escanea el serial o marca que no tiene número de serie.");
      return;
    }
    if (paso === 3 && piezas.length === 0) {
      setError("Selecciona al menos una pieza dañada, o 'Ninguna'.");
      return;
    }
    if (paso === TOTAL_PASOS) {
      if (!decision) {
        setError("Selecciona una decisión.");
        return;
      }
      if (requiereNewSn && !newSn.trim()) {
        setError("Esta decisión requiere escanear el nuevo número de serie.");
        return;
      }
      setMostrarConfirmacion(true);
      return;
    }
    setPaso(paso + 1);
  }

  function anterior() {
    setError("");
    if (paso === 1) {
      onBack();
    } else {
      setPaso(paso - 1);
    }
  }

  async function guardar() {
    setGuardando(true);
    const { error: errInsert } = await supabase.from("unidades").insert({
      batch_id: batch.id,
      modelo_codigo: modelo,
      old_sn: oldSnNa ? null : oldSn.trim(),
      old_sn_na: oldSnNa,
      new_sn: requiereNewSn ? newSn.trim() : null,
      tecnico_nombre: tecnico,
      piezas_danadas: piezas,
      decision,
      started_at: startedAt,
    });
    setGuardando(false);
    if (errInsert) {
      setError(errInsert.message);
      setMostrarConfirmacion(false);
      return;
    }
    onGuardada();
  }

  const shellStyle = {
    height: "100vh",
    maxWidth: 420,
    margin: "0 auto",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };

  const botonPrimario = {
    width: "100%", padding: 16, fontSize: 15, fontWeight: 600,
    background: "#0f3d63", color: "#fff", border: "none", borderRadius: 14,
    letterSpacing: 0.2,
  };
  const botonSecundario = {
    width: "100%", padding: 14, fontSize: 14, fontWeight: 600,
    background: "#f4f3ee", color: "#333", border: "none", borderRadius: 14,
  };
  const chip = (activo) => ({
    padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500,
    border: activo ? "1.5px solid #0f3d63" : "1px solid #e4e2da",
    background: activo ? "#eaf0f7" : "#fff",
    color: activo ? "#0f3d63" : "#333",
  });

  if (escaneando) {
    return (
      <ScannerModal
        onClose={() => setEscaneando(null)}
        onScan={(texto) => {
          if (escaneando === "old") setOldSn(texto);
          if (escaneando === "new") setNewSn(texto);
          setEscaneando(null);
        }}
      />
    );
  }

  if (mostrarConfirmacion) {
    return (
      <div style={shellStyle}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: "0 0 20px", textAlign: "center" }}>¿Confirmas esta información?</p>
          <div style={{ background: "#f7f6f2", borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <Fila label="Modelo" valor={modelo} />
            <Fila label="Serial" valor={oldSnNa ? "Sin serial" : oldSn} />
            <Fila label="Piezas" valor={piezas.join(", ")} />
            <Fila label="Decisión" valor={decision} />
            {requiereNewSn && <Fila label="Nuevo SN" valor={newSn} ultimo />}
          </div>
          {error && <p style={{ fontSize: 13, color: "#a32d2d", marginBottom: 16, textAlign: "center" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setMostrarConfirmacion(false)} disabled={guardando} style={{ ...botonSecundario, flex: 1 }}>
              Revisar
            </button>
            <button onClick={guardar} disabled={guardando} style={{ ...botonPrimario, flex: 1 }}>
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={anterior} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 600 }}>PASO {paso} DE {TOTAL_PASOS}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: n <= paso ? "#0f3d63" : "#e4e2da" }} />
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {paso === 1 && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>¿Qué calentador es?</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>Solo modelos pendientes de este batch</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {modelosDisponibles.map((m) => (
                <button key={m.modelo_codigo} onClick={() => setModelo(m.modelo_codigo)} style={chip(modelo === m.modelo_codigo)}>
                  {m.modelo_codigo}
                </button>
              ))}
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Número de serie</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>Escanea el código con la cámara</p>
            <button
              onClick={() => setEscaneando("old")}
              disabled={oldSnNa}
              style={{
                width: "100%", padding: "32px 20px", borderRadius: 16, textAlign: "center",
                background: oldSnNa ? "#f4f3ee" : "#0f3d63", color: oldSnNa ? "#999" : "#fff",
                border: "none", marginBottom: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{oldSn ? oldSn : "Escanear código"}</p>
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#666" }}>
              <input type="checkbox" checked={oldSnNa} onChange={(e) => { setOldSnNa(e.target.checked); setOldSn(""); }} />
              No tiene número de serie
            </label>
          </>
        )}

        {paso === 3 && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>¿Qué está dañado?</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>Puedes seleccionar más de una</p>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
              {catalogoPiezas.map((p) => (
                <button key={p.nombre} onClick={() => togglePieza(p.nombre, p.es_ninguna)} style={chip(piezas.includes(p.nombre))}>
                  {p.nombre}
                </button>
              ))}
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>¿Qué se hizo con ella?</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>Selecciona la decisión final</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: requiereNewSn ? 20 : 0 }}>
              {catalogoDecisiones.map((d) => (
                <button key={d.decision} onClick={() => setDecision(d.decision)} style={chip(decision === d.decision)}>
                  {d.decision}
                </button>
              ))}
            </div>
            {requiereNewSn && (
              <button
                onClick={() => setEscaneando("new")}
                style={{
                  width: "100%", padding: "20px", borderRadius: 16, textAlign: "center",
                  background: "#0f3d63", color: "#fff", border: "none",
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{newSn ? newSn : "Escanear nuevo SN"}</p>
              </button>
            )}
          </>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: "#a32d2d", margin: "12px 0 0", textAlign: "center" }}>{error}</p>}

      <button onClick={siguiente} style={{ ...botonPrimario, marginTop: 20 }}>
        {paso === TOTAL_PASOS ? "Revisar y confirmar" : "Continuar"}
      </button>
    </div>
  );
}

function Fila({ label, valor, ultimo }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: ultimo ? "none" : "0.5px solid #e4e2da" }}>
      <span style={{ fontSize: 13, color: "#999" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{valor}</span>
    </div>
  );
}
