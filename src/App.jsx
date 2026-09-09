import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
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
import Reparaciones from "./screens/Reparaciones";
import PiezasReporte from "./screens/PiezasReporte";

const CLAVE_BATCH_ACTIVO = "app_batch_activo_temporal";
const CLAVE_MODELOS_FORM = "app_modelos_form_temporal";

export default function App() {
  const { tecnico, esAdmin, setTecnico } = useTecnicoActual();
  const [vista, setVista] = useState("home");
  const [batchActivo, setBatchActivo] = useState(null);
  const [modelosParaFormulario, setModelosParaFormulario] = useState([]);
  const [restaurando, setRestaurando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vieneDeEscaneo = params.has("result");

    if (vieneDeEscaneo) {
      const batchGuardado = localStorage.getItem(CLAVE_BATCH_ACTIVO);
      const modelosGuardados = localStorage.getItem(CLAVE_MODELOS_FORM);

      if (batchGuardado) {
        setBatchActivo(JSON.parse(batchGuardado));
        setModelosParaFormulario(modelosGuardados ? JSON.parse(modelosGuardados) : []);
        setVista("unidad");
      }
    }
    setRestaurando(false);
  }, []);

  useEffect(() => {
    if (batchActivo) {
      localStorage.setItem(CLAVE_BATCH_ACTIVO, JSON.stringify(batchActivo));
    }
    if (modelosParaFormulario.length > 0) {
      localStorage.setItem(CLAVE_MODELOS_FORM, JSON.stringify(modelosParaFormulario));
    }
  }, [batchActivo, modelosParaFormulario]);

  if (restaurando) {
    return null;
  }

  if (!tecnico) {
    return <SeleccionTecnico onSelect={setTecnico} />;
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
        onGuardada={() => {
          localStorage.removeItem(CLAVE_BATCH_ACTIVO);
          localStorage.removeItem(CLAVE_MODELOS_FORM);
          setVista("batch");
        }}
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

  if (vista === "reparaciones") {
    return <Reparaciones tecnico={tecnico} onBack={() => setVista(esAdmin ? "admin" : "home")} />;
  }

  if (vista === "piezas" && esAdmin) {
    return <PiezasReporte onBack={() => setVista("admin")} />;
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
        onVerReparaciones={() => setVista("reparaciones")}
        onVerPiezas={() => setVista("piezas")}
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
      onVerReparaciones={() => setVista("reparaciones")}
      onSalir={() => setTecnico(null)}
    />
  );
}
