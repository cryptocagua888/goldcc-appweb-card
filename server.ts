import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get("/api/health", (req, res) => {
      res.json({ 
        status: "ok", 
        env: {
          hasGasUrl: !!process.env.GAS_WEBAPP_URL,
          nodeEnv: process.env.NODE_ENV
        }
      });
    });

  // API Route to fetch client data via Google Apps Script Proxy
  app.get("/api/client/:id", async (req, res) => {
    const clientId = req.params.id;
    const key = req.query.key;
    const gasUrl = process.env.GAS_WEBAPP_URL;

    console.log(`[Proxy] Solicitud de datos para: ${clientId}`);

    if (!gasUrl || gasUrl.includes("YOUR_APPS_SCRIPT")) {
      console.error("[Proxy] Error: GAS_WEBAPP_URL no configurado correctamente.");
      return res.status(500).json({ 
        error: "Servidor no configurado. Falta la URL de Google Apps Script en los secretos." 
      });
    }

    try {
      // Limpiar la URL de posibles espacios accidentales
      const cleanGasUrl = gasUrl.trim();
      const separator = cleanGasUrl.includes("?") ? "&" : "?";
      const targetUrl = `${cleanGasUrl}${separator}action=getCliente&cliente=${encodeURIComponent(clientId)}&key=${encodeURIComponent(key as string)}`;
      
      console.log(`[Proxy] Llamando a GAS: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Criptocagua-Gold-App/1.0'
        }
      });

      console.log(`[Proxy] Respuesta de Google received. Status: ${response.status}`);

      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const textError = await response.text();
        console.error(`[Proxy] Error de Google (No-JSON): ${textError.substring(0, 500)}`);
        
        // Si es un error de redirección o login, informar al usuario
        if (textError.includes("Google Accounts") || textError.includes("login") || textError.includes("Service Login")) {
          return res.status(502).json({ 
            error: "Error de Permisos: Google Apps Script requiere iniciar sesión. Asegúrate de que la implementación esté configurada para 'Anyone' (Cualquiera)." 
          });
        }

        return res.status(502).json({ 
          error: `Google respondió con un error técnico. Revisa que el script esté bien instalado. (${textError.substring(0, 100)})` 
        });
      }

      const data = await response.json();
      console.log("[Proxy] JSON decodificado exitosamente.");

      if (response.status !== 200 || data.error) {
        console.warn(`[Proxy] Google devolvió un error lógico: ${data.error}`);
        return res.status(response.status).json({ error: data.error || "Error en el servidor de Google Sheets" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Proxy] ERROR CRÍTICO:", error);
      res.status(500).json({ 
        error: `Fallo de conexión total: ${error.message}. Verifica que la URL sea correcta y no tenga espacios.` 
      });
    }
  });

  // API Route to submit a general request (loan, withdrawal, third-party payment)
  app.post("/api/request", async (req, res) => {
    const gasUrl = process.env.GAS_WEBAPP_URL;
    if (!gasUrl) return res.status(500).json({ error: "GAS_WEBAPP_URL not configured" });

    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitRequest",
          adminEmail: process.env.ADMIN_EMAIL,
          ...req.body
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to update security key
  app.post("/api/update-key", async (req, res) => {
    const gasUrl = process.env.GAS_WEBAPP_URL;
    if (!gasUrl) return res.status(500).json({ error: "GAS_WEBAPP_URL not configured" });

    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateKey",
          adminEmail: process.env.ADMIN_EMAIL,
          ...req.body
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  } catch (startupError: any) {
    console.error("FATAL STARTUP ERROR:", startupError);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error("UNHANDLED STARTUP REJECTION:", err);
  process.exit(1);
});
