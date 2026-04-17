/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  Wallet, 
  Coins, 
  Bitcoin, 
  DollarSign, 
  Box, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowDownCircle,
  PiggyBank,
  Key
} from "lucide-react";
import AssetCard from "./components/AssetCard";

interface ClientData {
  cliente: string;
  btc: number;
  btcUsd: number;
  latam: number;
  latamUsd: number;
  gold: number;
  goldUsd: number;
  deuda: number;
  prestamoDisponible: number;
}

function Portfolio() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const key = searchParams.get("key");
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!clientId) return;
      try {
        setLoading(true);
        const url = `/api/client/${clientId}${key ? `?key=${key}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Error al cargar datos");
        }
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId, key]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-deep" id="loader">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto" />
          <p className="text-text-dim font-serif italic text-sm tracking-widest">Sincronizando con Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-deep p-6 font-sans" id="error-screen">
        <div className="max-w-md w-full bg-bg-panel border border-border-accent p-10 rounded-none text-center space-y-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-serif italic text-gold">Aviso de Seguridad</h2>
            <p className="text-text-dim text-sm leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 border border-gold text-gold font-sans font-bold uppercase tracking-widest text-xs hover:bg-gold hover:text-bg-deep transition-all"
          >
            Regresar al Portal
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalBalanceUsd = data.btcUsd + data.latamUsd + data.goldUsd;

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col font-sans" id="portfolio-container">
      <header className="px-10 lg:px-20 py-10 flex justify-between items-center border-bottom border-border-accent border-b">
        <div className="logo font-serif italic text-2xl text-gold uppercase tracking-[1px] select-none cursor-pointer" onClick={() => navigate('/')}>
          CRIPTOCAGUA GOLD
        </div>
        <div className="client-id text-[10px] text-text-dim tracking-[2px] uppercase font-bold hidden sm:block">
          CLIENT ID: #CCG-{clientId?.split('@')[0].toUpperCase()}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-10 lg:px-20 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-20">
        <div className="summary-section flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="welcome-msg font-serif italic text-xl lg:text-2xl text-gold mb-3"
          >
            Bienvenido, <span className="capitalize">{data.cliente.split('@')[0]}</span>
          </motion.div>
          <div className="main-balance-label text-[11px] uppercase tracking-[3px] text-text-dim mb-4 font-bold">
            Valor de Portafolio Estimado
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="main-balance-value font-serif text-5xl sm:text-7xl text-text-main mb-12 sm:mb-16 tracking-tight leading-none"
          >
            ${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-2xl sm:text-3xl text-gold">USD</span>
          </motion.div>

          <div className="asset-grid grid grid-cols-1 sm:grid-cols-3 gap-6">
            <AssetCard 
              name="Bitcoin" 
              symbol="BTC" 
              amount={data.btc} 
              amountUsd={data.btcUsd}
              icon={Bitcoin} 
              color="bg-orange-500" 
              delay={0.1}
            />
            <AssetCard 
              name="Dolar Latam" 
              symbol="$-L" 
              amount={data.latam} 
              amountUsd={data.latamUsd}
              icon={DollarSign} 
              color="bg-green-500" 
              delay={0.2}
            />
            <AssetCard 
              name="Cryptocagua Gold" 
              symbol="GLDCC" 
              amount={data.gold} 
              amountUsd={data.goldUsd}
              icon={Coins} 
              color="bg-gold" 
              delay={0.3}
            />
          </div>
        </div>

        <aside className="sidebar flex flex-col gap-10">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="status-panel bg-bg-card p-10 border-l-[3px] border-gold rounded-none shadow-xl"
          >
            <span className="status-title text-[10px] uppercase tracking-[2px] text-gold mb-6 block font-bold">Estado de Cuenta</span>
            <div className="space-y-4">
              <div className="market-row flex justify-between py-4 border-b border-white/5 text-sm">
                <span className="text-text-dim">Deuda Pendiente</span>
                <span className="font-serif text-red-400 opacity-90">${data.deuda.toLocaleString()} USD</span>
              </div>
              <div className="market-row flex justify-between py-4 border-b border-white/5 text-sm">
                <span className="text-text-dim">Línea de Crédito</span>
                <span className="font-serif text-green-400 opacity-90">${data.prestamoDisponible.toLocaleString()} USD</span>
              </div>
              <div className="market-row flex justify-between py-4 text-sm font-bold pt-6">
                <span className="text-gold uppercase tracking-tighter text-[10px]">Ratio Cobertura</span>
                <span className="font-mono text-xs text-text-main">
                  {totalBalanceUsd > 0 ? (totalBalanceUsd / (data.deuda || 1)).toFixed(2) : "0.00"}x
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-bg-panel p-10 border border-border-accent rounded-none shadow-lg"
          >
            <span className="status-title text-[10px] uppercase tracking-[2px] text-text-dim mb-6 block font-bold">Nota del Gestor</span>
            <p className="text-sm font-serif italic leading-loose text-text-main opacity-80">
              "Sus activos GLDCC se han ajustado según el último cierre de la hoja de cálculo corporativa. La próxima sincronización con Google Sheets se realizará en 24h."
            </p>
          </motion.div>
        </aside>
      </main>

      <footer className="px-10 lg:px-20 py-8 text-[10px] font-sans text-text-dim uppercase tracking-[1px] flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border-accent">
        <div className="flex items-center">
          <span className="dot h-2 w-2 bg-green-500 rounded-full mr-3 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span> 
          Datos sincronizados vía Google Sheets API (GAS)
        </div>
        <div className="font-mono italic">
          Last SYNC: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} UTC
        </div>
      </footer>
    </div>
  );
}

function Home() {
  const [clientId, setClientId] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientId.trim() && securityKey.trim()) {
      navigate(`/cliente/${encodeURIComponent(clientId.trim())}?key=${encodeURIComponent(securityKey.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-deep font-sans" id="home-screen">
      <header className="px-10 lg:px-20 py-10 flex justify-between items-center border-bottom border-border-accent border-b relative z-10">
        <div className="logo font-serif italic text-2xl text-gold uppercase tracking-[1px]">
          CRIPTOCAGUA GOLD
        </div>
        <div className="text-[10px] text-text-dim tracking-[2px] uppercase font-bold hidden sm:block">
          GATEWAY v1.2.0
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] border border-gold rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] border border-gold rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full relative z-10"
        >
          <div className="bg-bg-panel border border-border-accent p-12 lg:p-16 rounded-none shadow-[0_40px_100px_rgba(0,0,0,0.5)] space-y-12">
            <div className="space-y-4 text-center sm:text-left">
              <h1 className="text-4xl lg:text-5xl font-serif font-bold text-text-main leading-tight italic">
                Portal de <br />
                <span className="text-gold">Inversores</span>
              </h1>
              <p className="text-text-dim text-sm tracking-wide font-sans">Inicie sesión con sus credenciales de Criptocagua Gold.</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-sans font-bold tracking-[3px] text-text-dim px-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="cliente@dominio.com"
                  className="w-full bg-bg-deep border border-border-accent rounded-none p-5 text-text-main focus:outline-none focus:border-gold transition-all duration-300 font-sans text-sm placeholder:text-white/10"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-sans font-bold tracking-[3px] text-text-dim px-1">Llave Maestro</label>
                <div className="relative">
                  <Key className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-dim opacity-50" />
                  <input 
                    type="password" 
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-bg-deep border border-border-accent rounded-none p-5 text-text-main focus:outline-none focus:border-gold transition-all duration-300 font-sans text-sm placeholder:text-white/10"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-gold text-bg-deep font-sans font-bold uppercase tracking-[4px] text-xs hover:bg-gold-dim transition-all duration-300 shadow-xl shadow-gold/5 active:scale-[0.98]"
              >
                Acceder al Portal
              </button>
            </form>

            <div className="flex items-center justify-between text-[8px] font-sans text-text-dim uppercase tracking-[2px] opacity-60">
              <span>Sincronización segura</span>
              <span>AES-256 Encrypted</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      <footer className="px-10 lg:px-20 py-8 text-[9px] font-sans text-text-dim uppercase tracking-[1.5px] text-center border-t border-border-accent h-24 flex items-center justify-center">
        © 2026 CRIPTOCAGUA GOLD PRIVATE WEALTH MANAGEMENT
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cliente/:clientId" element={<Portfolio />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
