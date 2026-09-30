const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imagen, tipo } = await req.json();

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 40,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: tipo || "image/jpeg", data: imagen } },
              {
                type: "text",
                text: "Eres un lector OCR de precisión. En esta etiqueta hay un código de barras y, JUSTO DEBAJO, un número de serie impreso de EXACTAMENTE 11 dígitos. Léelo dígito por dígito con mucho cuidado: no confundas 0 con 8, 1 con 7, 5 con 6, 2 con Z, 3 con 8. Ignora cualquier otro número de la etiqueta (modelo, voltaje, amperaje, fechas). Responde ÚNICAMENTE con los 11 dígitos, sin espacios ni ningún otro texto. Si no puedes leerlos con total seguridad, responde NONE.",
              },
            ],
          },
        ],
      }),
    });

    const data = await resp.json();
    const texto = (data?.content?.[0]?.text ?? "").replace(/\s+/g, "");
    const coincidencia = texto.match(/\d{11}/);

    return new Response(
      JSON.stringify({ serial: coincidencia ? coincidencia[0] : "", crudo: texto }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ serial: "", error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
