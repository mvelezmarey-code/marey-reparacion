import { useRef, useState } from "react";
import Tesseract from "tesseract.js";

const LARGO_SERIAL = 11;

export default function ScannerModal({ onScan, onClose }) {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [textoDetectado, setTextoDetectado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function abrirCamara() {
    inputRef.current?.click();
  }

  async function manejarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setPreviewUrl(URL.createObjectURL(archivo));
    setProcesando(true);

    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const escala = Math.min(1600 / img.width, 2);
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gris = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        const valor = gris > 150 ? 255 : 0;
        data[i] = valor;
        data[i + 1] = valor;
        data[i + 2] = valor;
      }
      ctx.putImageData(imgData, 0, 0);

      try {
        const resultado = await Tesseract.recognize(canvas, "eng", {
          tessedit_char_whitelist: "0123456789",
        });
        const soloDigitos = resultado.data.text.replace(/\D/g, "").slice(0, LARGO_SERIAL);
        setTextoDetectado(soloDigitos || "");
      } catch (err) {
        setTextoDetectado("");
      }
      setProcesando(false);
    };
    img.src = URL.createObjectURL(archivo);
  }

  if (textoDetectado !== null) {
    const completo = textoDetectado.length
    
