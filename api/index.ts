import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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
      console.error("[Proxy] Error: GAS_WEBAPP_URL no configurado.");
      return res.status(500).json({ 
        error: "Servidor no configurado. Falta GAS_WEBAPP_URL en los secretos." 
      });
    }

    try {
      const cleanGasUrl = gasUrl.trim();
      const separator = cleanGasUrl.includes("?") ? "&" : "?";
      const targetUrl = `${cleanGasUrl}${separator}action=getCliente&cliente=${encodeURIComponent(clientId)}&key=${encodeURIComponent(key as string)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segs

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await response.text();
        if (textError.includes("Google Accounts") || textError.includes("login")) {
          return res.status(502).json({ error: "Permisos: Configura GAS para 'Anyone'." });
        }
        return res.status(502).json({ error: "Google respondió con error (HTML)." });
      }

      const data = await response.json();
      if (response.status !== 200 || data.error) {
        return res.status(400).json({ error: data.error || "Error en Google Sheets" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Proxy] ERROR:", error.message);
      res.status(500).json({ error: `Connection failed: ${error.message}` });
    }
  });

  // API Request submission
  app.post("/api/request", async (req, res) => {
    const gasUrl = process.env.GAS_WEBAPP_URL;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!gasUrl) return res.status(500).json({ error: "GAS_WEBAPP_URL no configurada." });
    
    // Validación básica de email para evitar el error de GAS
    if (!adminEmail || !adminEmail.includes("@")) {
      console.error("[Proxy] ADMIN_EMAIL inválido o ausente:", adminEmail);
      return res.status(500).json({ 
        error: "Configuración incompleta: El ADMIN_EMAIL en los secretos debe ser un correo válido, no un número." 
      });
    }

    try {
      console.log(`[Proxy] Enviando solicitud a GAS para: ${req.body.cliente}`);
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitRequest",
          adminEmail: adminEmail,
          ...req.body
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy] ERROR en Solicitud:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // API Update key
  app.post("/api/update-key", async (req, res) => {
    const gasUrl = process.env.GAS_WEBAPP_URL;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!gasUrl) return res.status(500).json({ error: "GAS_WEBAPP_URL no configurada." });
    
    if (!adminEmail || !adminEmail.includes("@")) {
      return res.status(500).json({ 
        error: "Configuración incompleta: El ADMIN_EMAIL en los secretos debe ser un correo válido." 
      });
    }

    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateKey",
          adminEmail: adminEmail,
          ...req.body
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy] ERROR en Actualizar Llave:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Assets and SPA
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  // Only listen if NOT in a serverless environment (Vercel sets VERCEL=1)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// Handler for Vercel
const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  app(req, res);
};
