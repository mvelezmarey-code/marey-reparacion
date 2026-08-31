import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export function useTecnicoActual() {
  const [tecnico, setTecnicoState] = useState(() => localStorage.getItem("tecnico_actual"));
  const [esAdmin, setEsAdmin] = useState(() => localStorage.getItem("tecnico_es_admin") === "true");
  const [listaTecnicos, setListaTecnicos] = useState([]);

  useEffect(() => {
    cargarTecnicos();
  }, []);

  async function cargarTecnicos() {
    const { data } = await supabase
      .from("tecnicos")
      .select("nombre, es_admin")
      .eq("activo", true)
      .order("nombre");
    setListaTecnicos(data || []);
  }

  function setTecnico(nombre, admin) {
    if (nombre) {
      localStorage.setItem("tecnico_actual", nombre);
      localStorage.setItem("tecnico_es_admin", admin ? "true" : "false");
    } else {
      localStorage.removeItem("tecnico_actual");
      localStorage.removeItem("tecnico_es_admin");
    }
    setTecnicoState(nombre);
    setEsAdmin(!!admin);
  }

  return { tecnico, esAdmin, setTecnico, listaTecnicos };
}
