import { useState } from "react";
import { useTecnicoActual } from "./lib/session";
import SeleccionTecnico from "./screens/SeleccionTecnico";
import Home from "./screens/Home";
import AdminHome from "./screens/AdminHome";
import NuevoBatch from "./screens/NuevoBatch";
import BatchView from "./screens/BatchView";
import UnidadForm from "./screens/UnidadForm";
import Estadisticas from "./screens/Estadisticas";
import BatchResumen from "./screens/BatchResumen";
import Revision from "./screens/Revision";
import Leaderboard from "./screens/Leaderboard";
import Historial from "./screens/Historial";

export default function App() {
  const { tecnico, esAdmin, setTecnico, listaTecnicos } = useTecnicoActual();
  const [vista, setVista] = useState("home");
  const [batchActivo, setBatchActivo] = useState(null);
  const [modelosParaFormulario, setModelosParaFormulario] = useState([]);

  if (!tecnico) {
    return <SeleccionTecnico listaTecnicos={listaTecnicos} onSelect={setTecnico} />;
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

  if (vista === "historial") {
    return (
      <Historial
        onBack={() => setVista(esAdmin ? "admin" : "home")}
        onVerResumen={(batch) => {
          setBatchActivo(batch);
          setVista("resumen");
        }}
      />
    );
  }

  if (vista === "resumen" && batchActivo) {
    return <BatchResumen batch={batchActivo} onBack={() => setVista("historial")} />;
  }

  if (vista === "estadisticas") {
    return <Estadisticas onBack={() => setVista(esAdmin ? "admin" : "home")} />;
  }

  if (vista === "revision") {
    return (
      <Revision
        onBack={() => setVista("admin")}
        onVerResumen={(batch) => {
          setBatchActivo(batch);
          setVista("resumen");
        }}
      />
    );
  }

  if (vista === "leaderboard") {
    return <Leaderboard tecnico={tecnico} onBack={() => setVista(esAdmin ? "admin" : "home")} />;
  }

  if (esAdmin && vista === "admin") {
    return (
      <AdminHome
        tecnico={tecnico}
        onVerRevision={() => setVista("revision")}
        onVerEstadisticas={() => setVista("estadisticas")}
        onVerLeaderboard={() => setVista("leaderboard")}
        onSalir={() => setTecnico(null)}
      />
    );
  }

  if (esAdmin) {
    setVista("admin");
    return null;
  }

  return (
    <Home
      tecnico={tecnico}
      onOpenBatch={(batch) => {
        setBatchActivo(batch);
        setVista("batch");
      }}
      onNuevoBatch={() => setVista("nuevo_batch")}
      onVerHistorial={() => setVista("historial")}
      onVerEstadisticas={() => setVista("estadisticas")}
      onSalir={() => setTecnico(null)}
    />
  );
}
