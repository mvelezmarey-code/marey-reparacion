import { useState } from "react";
import { useTecnicoActual } from "./lib/session";
import SeleccionTecnico from "./screens/SeleccionTecnico";
import Home from "./screens/Home";
import NuevoBatch from "./screens/NuevoBatch";
import BatchView from "./screens/BatchView";
import UnidadForm from "./screens/UnidadForm";
import Estadisticas from "./screens/Estadisticas";
import BatchResumen from "./screens/BatchResumen";
import Revision from "./screens/Revision";
import Leaderboard from "./screens/Leaderboard";

export default function App() {
  const { tecnico, setTecnico, TECNICOS } = useTecnicoActual();
  const [vista, setVista] = useState("home");
  const [batchActivo, setBatchActivo] = useState(null);
  const [modelosParaFormulario, setModelosParaFormulario] = useState([]);

  if (!tecnico) {
    return <SeleccionTecnico TECNICOS={TECNICOS} onSelect={setTecnico} />;
  }

  if (vista === "nuevo_batch") {
    return (
      <NuevoBatch
        onBack={() => setVista("home")}
        onCreado={(batch) => {
          setBatchActivo(batch);
          setVista("batch");
        }}
      />
    );
  }

  if (vista === "batch" && batchActivo) {
    return (
      <BatchView
        batch={batchActivo}
        onBack={() => setVista("home")}
        onRepararUnidad={(batch, modelos) => {
          setModelosParaFormulario(modelos);
          setVista("unidad");
        }}
      />
    );
  }

  if (vista === "unidad" && batchActivo) {
    return (
      <UnidadForm
        batch={batchActivo}
        modelosDisponibles={modelosParaFormulario}
        tecnico={tecnico}
        onBack={() => setVista("batch")}
        onGuardada={() => setVista("batch")}
      />
    );
  }

  if (vista === "resumen" && batchActivo) {
    return <BatchResumen batch={batchActivo} onBack={() => setVista("home")} />;
  }

  if (vista === "estadisticas") {
    return <Estadisticas onBack={() => setVista("home")} />;
  }

  if (vista === "revision") {
    return (
      <Revision
        onBack={() => setVista("home")}
        onVerResumen={(batch) => {
          setBatchActivo(batch);
