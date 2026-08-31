import { useState } from "react";

const TECNICOS = ["Willy Báez", "Kenneth", "Jean"];

export function useTecnicoActual() {
  const [tecnico, setTecnicoState] = useState(() => localStorage.getItem("tecnico_actual"));

  function setTecnico(valor) {
    if (valor) {
      localStorage.setItem("tecnico_actual", valor);
    } else {
      localStorage.removeItem("tecnico_actual");
    }
    setTecnicoState(valor);
  }

  return { tecnico, setTecnico, TECNICOS };
}
