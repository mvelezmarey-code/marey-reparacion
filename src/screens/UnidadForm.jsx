 setOldSnNa(e.target.checked); setOldSn(""); }} />
        No tiene número de serie
      </label>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Piezas dañadas</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {catalogoPiezas.map((p) => (
          <button
            key={p.nombre}
            onClick={() => togglePieza(p.nombre, p.es_ninguna)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: piezas.includes(p.nombre) ? "1px solid #185fa5" : "0.5px solid #ddd",
              background: piezas.includes(p.nombre) ? "#eef3fb" : "#fff",
              color: piezas.includes(p.nombre) ? "#185fa5" : "#333",
            }}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Decisión</label>
      <select value={decision} onChange={(e) => setDecision(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 16, border: "0.5px solid #ddd", borderRadius: 8 }}>
        <option value="">Selecciona...</option>
        {catalogoDecisiones.map((d) => (
          <option key={d.decision} value={d.decision}>{d.decision}</option>
        ))}
      </select>

      {requiereNewSn && (
        <>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>New SN *</label>
          <input
            value={newSn}
            onChange={(e) => setNewSn(e.target.value)}
            placeholder="Escanear nuevo SN"
            style={{ width: "100%", padding: 10, marginBottom: 16, border: "0.5px solid #ddd", borderRadius: 8 }}
          />
        </>
      )}

      {error && <p style={{ fontSize: 12, color: "#a32d2d", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        style={{
