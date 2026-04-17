import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
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

  // API Route to fetch client data via Google Apps Script Proxy
  app.get("/api/client/:id", async (req, res) => {
    const clientId = req.params.id;
    const key = req.query.key;
    const gasUrl = process.env.GAS_WEBAPP_URL;

    if (!gasUrl || gasUrl === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
      return res.status(500).json({ 
        error: "Servidor no configurado. Falta GAS_WEBAPP_URL." 
      });
    }

    try {
      const targetUrl = `${gasUrl}?action=getCliente&cliente=${encodeURIComponent(clientId)}&key=${encodeURIComponent(key as string)}`;
      
      const response = await fetch(targetUrl);
      const data = await response.json();

      if (response.status !== 200 || data.error) {
        return res.status(response.status).json({ error: data.error || "Error en el servidor de Google Sheets" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching from GAS:", error);
      res.status(500).json({ error: "Error al conectar con Google Apps Script: " + error.message });
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

  return app;
}

const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
