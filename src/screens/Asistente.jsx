import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// Pantalla de ayuda: modelo -> problema -> video/guía + chat con AI.
// Se puede abrir de dos formas:
//   1. Desde Home (sin modelo): empieza pidiendo el modelo.
//   2. Desde el formulario de reparación (con modeloInicial): salta directo a los problemas.
export default function Asistente({ modeloInicial = "", serialInicial = "", onBack }) {
  const [modelo, setModelo] = useState(modeloInicial);
  const [modelos, setModelos] = useState([]);
  const [problemas, setProblemas] = useState([]);
  const [guiaTexto, setGuiaTexto] = useState("");
  const [problemaActivo, setProblemaActivo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat con el AI (se reinicia cada vez que cambia el problema)
  const [mensajes, setMensajes] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [fotoPendiente, setFotoPendiente] = useState(null); // { base64, tipo, preview }
  const [pensando, setPensando] = useState(false);
  const [errorChat, setErrorChat] = useState("");
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [modoOtro, setModoOtro] = useState(false); // chat libre, sin problema específico
  const inputFotoRef = useRef(null);
  const finChatRef = useRef(null);

  const vieneConModelo = Boolean(modeloInicial);
  const TOTAL_PASOS = vieneConModelo ? 2 : 3;

  const enSolucion = problemaActivo || modoOtro;
  let paso;
  if (enSolucion) paso = TOTAL_PASOS;
  else if (modelo) paso = TOTAL_PASOS - 1;
  else paso = 1;

  useEffect(() => {
    cargarModelos();
  }, []);

  useEffect(() => {
    if (modelo) cargarProblemas(modelo);
  }, [modelo]);

  useEffect(() => {
    setMensajes([]);
    setPregunta("");
    setFotoPendiente(null);
    setErrorChat("");
    setMostrarGuia(false);
  }, [problemaActivo, modoOtro]);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, pensando]);

  async function cargarModelos() {
    setLoading(true);
    const { data } = await supabase
      .from("asistente_modelo_guia")
      .select("modelo_codigo, guia_id")
      .order("modelo_codigo");
    setModelos(data || []);
    setLoading(false);
  }

  async function cargarProblemas(codigo) {
    setLoading(true);
    setProblemas([]);
    setGuiaTexto("");
    const { data: mapa } = await supabase
      .from("asistente_modelo_guia")
      .select("guia_id")
      .eq("modelo_codigo", codigo)
      .maybeSingle();
    if (!mapa) {
      setLoading(false);
      return;
    }
    const { data: guia } = await supabase
      .from("asistente_guias")
      .select("guia_texto")
      .eq("id", mapa.guia_id)
      .maybeSingle();
    const { data: lista } = await supabase
      .from("asistente_problemas")
      .select("id, orden, titulo, pieza, imagen_url, asistente_videos ( id, titulo, url )")
      .eq("guia_id", mapa.guia_id)
      .order("orden");
    setGuiaTexto(guia?.guia_texto || "");
    setProblemas(lista || []);
    setLoading(false);
  }

  function anterior() {
    if (problemaActivo || modoOtro) {
      setProblemaActivo(null);
      setModoOtro(false);
      return;
    }
    if (modelo && !vieneConModelo) {
      setModelo("");
      return;
    }
    onBack();
  }

  // Reduce la foto a máx 1024px para que sea barata de mandar al AI
  function procesarFoto(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1024;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const escala = MAX / Math.max(width, height);
            width = Math.round(width * escala);
            height = Math.round(height * escala);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ base64: dataUrl.split(",")[1], tipo: "image/jpeg", preview: dataUrl });
        };
        img.onerror = reject;
        img.src = lector.result;
      };
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      setFotoPendiente(await procesarFoto(archivo));
    } catch {
      setErrorChat("No se pudo leer la foto.");
    }
  }

  async function enviar(textoForzado) {
    const texto = (textoForzado ?? pregunta).trim();
    if (!texto && !fotoPendiente) return;
    if (pensando) return;

    const foto = fotoPendiente;
    const nuevoMensaje = { role: "user", content: texto || "¿Qué ves en esta foto?", foto: foto?.preview || null };
    const historial = [...mensajes, nuevoMensaje];

    setMensajes(historial);
    setPregunta("");
    setFotoPendiente(null);
    setErrorChat("");
    setPensando(true);

    const { data, error } = await supabase.functions.invoke("asistente-chat", {
      body: {
        modelo,
        problema: problemaActivo?.titulo || "",
        pieza: problemaActivo?.pieza || "",
        guia_texto: guiaTexto,
        piezas: problemas.map((p, i) => ({ n: i + 1, pieza: p.pieza })),
        mensajes: historial.map((m) => ({ role: m.role, content: m.content })),
        imagen: foto?.base64 || null,
        tipo: foto?.tipo || null,
      },
    });

    setPensando(false);

    if (error || !data?.respuesta) {
      setErrorChat("No pude responder ahora. Intenta de nuevo.");
      return;
    }

    // Si el AI pidió mostrar una pieza ([FOTO:N]), sacamos ese marcador del texto
    // y adjuntamos la imagen de esa pieza.
    let respuestaTexto = data.respuesta;
    let fotoPieza = null;
    const marca = respuestaTexto.match(/\[FOTO:\s*(\d+)\]/i);
    if (marca) {
      const idx = parseInt(marca[1], 10) - 1;
      if (problemas[idx]?.imagen_url) fotoPieza = problemas[idx].imagen_url;
      respuestaTexto = respuestaTexto.replace(marca[0], "").trim();
    }
    setMensajes((prev) => [...prev, { role: "assistant", content: respuestaTexto, fotoPieza }]);
  }

  const shellStyle = {
    height: "100vh",
    maxWidth: 420,
    margin: "0 auto",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#fff",
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
    padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500, textAlign: "left",
    border: activo ? "1.5px solid #0f3d63" : "1px solid #e4e2da",
    background: activo ? "#eaf0f7" : "#fff",
    color: activo ? "#0f3d63" : "#333",
  });
  const inputStyle = {
    flex: 1, padding: 12, border: "1px solid #e4e2da", borderRadius: 10, boxSizing: "border-box", fontSize: 14,
  };

  const encabezado = ["AYUDA", modelo || null, serialInicial ? `SN ${serialInicial}` : null]
    .filter(Boolean)
    .join(" · ");

  const lineasGuia = guiaTexto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={anterior} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e2da", background: "#fff" }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#999", fontWeight: 600 }}>{encabezado}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map((n) => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: n <= paso ? "#0f3d63" : "#e4e2da" }} />
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
        {/* PASO: modelo */}
        {!modelo && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>¿Qué calentador es?</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>Escoge el modelo que estás revisando</p>
            {loading ? (
              <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {modelos.map((m) => (
                  <button key={m.modelo_codigo} onClick={() => setModelo(m.modelo_codigo)} style={chip(false)}>
                    {m.modelo_codigo}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* PASO: problema */}
        {modelo && !problemaActivo && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>¿Qué le pasa al calentador?</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>
              {vieneConModelo ? "Tu reparación sigue igual; esto es solo consulta" : "Escoge el problema que más se parece"}
            </p>
            {loading ? (
              <p style={{ fontSize: 13, color: "#999" }}>Cargando...</p>
            ) : problemas.length === 0 ? (
              <p style={{ fontSize: 13, color: "#999" }}>Todavía no hay videos para este modelo.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {problemas.map((p, i) => (
                  <button key={p.id} onClick={() => setProblemaActivo(p)} style={{ ...chip(false), display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 12, background: "#0f3d63", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block" }}>{p.titulo}</span>
                      <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 2 }}>{p.pieza}</span>
                    </span>
                  </button>
                ))}
                <button onClick={() => setModoOtro(true)} style={{ ...chip(false), display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 12, background: "#f4f3ee", color: "#0f3d63", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block" }}>Otro / no está en la lista</span>
                    <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 2 }}>Pregúntale al asistente</span>
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        {/* PASO: solución (problema específico) o chat libre (Otro) */}
        {modoOtro && !problemaActivo && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Cuéntame qué tiene el calentador</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>Descríbelo o sube una foto y el asistente te ayuda ({modelo}).</p>
          </>
        )}

        {problemaActivo && (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>{problemaActivo.titulo}</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>Pieza a reemplazar: {problemaActivo.pieza}</p>

            {problemaActivo.asistente_videos?.url ? (
              <video
                key={problemaActivo.asistente_videos.url}
                controls
                playsInline
                preload="metadata"
                src={problemaActivo.asistente_videos.url}
                style={{ width: "100%", borderRadius: 16, background: "#000", marginBottom: 6 }}
              />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#f4f3ee", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#999" }}>Video no disponible todavía</span>
              </div>
            )}
            <p style={{ fontSize: 12, color: "#999", margin: "0 0 20px" }}>Toca el video para pantalla completa</p>

            {problemaActivo.imagen_url && (
              <>
                <p style={{ fontSize: 12, color: "#999", fontWeight: 600, margin: "0 0 8px" }}>CÓMO SE VE LA PIEZA DAÑADA</p>
                <img
                  src={problemaActivo.imagen_url}
                  alt={problemaActivo.pieza}
                  style={{ width: "100%", borderRadius: 16, background: "#f7f6f2", marginBottom: 20 }}
                />
              </>
            )}

            {lineasGuia.length > 0 && (
              <>
                <button
                  onClick={() => setMostrarGuia(!mostrarGuia)}
                  style={{ ...chip(mostrarGuia), width: "100%", marginBottom: 12, display: "flex", justifyContent: "space-between" }}
                >
                  <span>Guía oficial de reparación</span>
                  <span>{mostrarGuia ? "▴" : "▾"}</span>
                </button>
                {mostrarGuia && (
                  <div style={{ background: "#f7f6f2", borderRadius: 16, padding: "6px 20px", marginBottom: 20 }}>
                    {(() => {
                      let numero = 0;
                      return lineasGuia.map((linea, i) => {
                        const esTitulo = linea.startsWith("#");
                        if (esTitulo) {
                          numero = 0;
                          return (
                            <p key={i} style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.3, margin: "14px 0 4px" }}>
                              {linea.replace(/^#+\s*/, "")}
                            </p>
                          );
                        }
                        numero += 1;
                        return (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "0.5px solid #e4e2da" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f3d63", flexShrink: 0, minWidth: 16 }}>{numero}</span>
                            <span style={{ fontSize: 13, lineHeight: 1.45 }}>{linea}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}

          </>
        )}

        {enSolucion && (
          <>
            {/* CHAT CON EL AI */}
            <p style={{ fontSize: 12, color: "#999", fontWeight: 600, margin: "0 0 8px" }}>PREGÚNTALE AL ASISTENTE</p>

            {problemaActivo && mensajes.length === 0 && !pensando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                <button onClick={() => enviar("Explícame los pasos para hacer esta reparación.")} style={chip(false)}>
                  Explícame los pasos
                </button>
                <button onClick={() => enviar("¿Qué herramientas y precauciones necesito para esta reparación?")} style={chip(false)}>
                  ¿Qué herramientas y precauciones necesito?
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {mensajes.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%",
                    background: m.role === "user" ? "#0f3d63" : "#f4f3ee",
                    color: m.role === "user" ? "#fff" : "#222",
                    fontSize: 13,
                    lineHeight: 1.45,
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.foto && (
                    <img src={m.foto} alt="Foto enviada" style={{ display: "block", width: "100%", borderRadius: 10, marginBottom: 8 }} />
                  )}
                  {m.content}
                  {m.fotoPieza && (
                    <img src={m.fotoPieza} alt="Foto de la pieza" style={{ display: "block", width: "100%", borderRadius: 10, marginTop: 8, background: "#fff" }} />
                  )}
                </div>
              ))}
              {pensando && (
                <div style={{ alignSelf: "flex-start", background: "#f4f3ee", color: "#999", fontSize: 13, padding: "10px 14px", borderRadius: "14px 14px 14px 4px" }}>
                  Pensando...
                </div>
              )}
              {errorChat && <p style={{ fontSize: 12, color: "#a32d2d", margin: 0 }}>{errorChat}</p>}
              <div ref={finChatRef} />
            </div>

            {fotoPendiente && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <img src={fotoPendiente.preview} alt="Foto lista para enviar" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10 }} />
                <span style={{ flex: 1, fontSize: 12, color: "#666" }}>Foto lista. Escribe tu pregunta o envía.</span>
                <button onClick={() => setFotoPendiente(null)} style={{ fontSize: 12, padding: "6px 10px", background: "#f4f3ee", border: "none", borderRadius: 8, color: "#666" }}>
                  Quitar
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
                placeholder="Escribe tu pregunta..."
                style={inputStyle}
              />
              <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" onChange={elegirFoto} style={{ display: "none" }} />
              <button
                onClick={() => inputFotoRef.current?.click()}
                aria-label="Tomar foto"
                style={{ width: 44, height: 44, background: "#f4f3ee", border: "none", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>
              </button>
              <button
                onClick={() => enviar()}
                disabled={pensando}
                aria-label="Enviar"
                style={{ width: 44, height: 44, background: "#0f3d63", color: "#fff", border: "none", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {enSolucion ? (
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => { setProblemaActivo(null); setModoOtro(false); }} style={{ ...botonSecundario, flex: 1 }}>Otro problema</button>
          <button onClick={onBack} style={{ ...botonPrimario, flex: 1 }}>{vieneConModelo ? "Volver a reparar" : "Listo"}</button>
        </div>
      ) : null}
    </div>
  );
}
