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
  Key,
  MessageCircle,
  ArrowUpRight,
  UserPlus,
  RefreshCw,
  PlusCircle,
  MessageSquare,
  X,
  LogOut
} from "lucide-react";
import AssetCard from "./components/AssetCard";

// @ts-ignore
const WHATSAPP_NUMBER = (import.meta as any).env?.VITE_WHATSAPP_NUMBER || "584120000000";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionKey, setSessionKey] = useState<string | null>(() => {
    // Intentar recuperar de sessionStorage si existe
    return searchParams.get("key") || sessionStorage.getItem(`ccg_key_${clientId}`);
  });
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Solicitudes
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<"loan" | "third-party" | "withdrawal" | "key" | null>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Estados de Formulario
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryInfo, setBeneficiaryInfo] = useState("");
  const [newKey, setNewKey] = useState("");
  const [assetType, setAssetType] = useState("$-L");
  const [withdrawalAmounts, setWithdrawalAmounts] = useState<{ [key: string]: string }>({
    "BTC": "",
    "$-L": "",
    "GLDCC": ""
  });

  // Limpiar URL al cargar
  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey && clientId) {
      sessionStorage.setItem(`ccg_key_${clientId}`, urlKey);
      setSessionKey(urlKey);
      // Remover la llave del URL sin recargar la página
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, clientId, setSearchParams]);

  useEffect(() => {
    console.log("[Portfolio] Iniciando carga de datos...");
    async function fetchData(silent = false) {
      if (!clientId) {
        console.warn("[Portfolio] clientId no detectado");
        return;
      }
      try {
        if (!silent) setLoading(true);
        const url = `/api/client/${clientId}${sessionKey ? `?key=${sessionKey}` : ""}`;
        console.log(`[Portfolio] Llamando a: ${url}`);
        const response = await fetch(url);
        
        let errorMessage = "Error al cargar datos";
        
        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } else {
            const rawText = await response.text();
            errorMessage = `Error (${response.status}): ${rawText.substring(0, 50)}...`;
          }
          console.error(`[Portfolio] Error HTTP ${response.status}: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        const json = await response.json();
        console.log("[Portfolio] Éxito. Datos:", json);
        setData(json);
        setError(null);
      } catch (err: any) {
        console.error("[Portfolio] Capturado:", err.message);
        // Solo mostrar error visual si no es una actualización silenciosa 
        // o si es la primera carga y falló.
        if (!silent || !data) setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    }
    
    fetchData();

    // Actualización automática cada 5 minutos
    const interval = setInterval(() => {
      console.log("[Portfolio] Auto-refresh de datos...");
      fetchData(true);
    }, 300000); // 300,000 ms = 5 min

    return () => clearInterval(interval);
  }, [clientId, sessionKey]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus("loading");
    setFormError(null);

    try {
      if (requestType === "key") {
        const res = await fetch("/api/update-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente: clientId, oldKey: sessionKey, newKey })
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        // Limpiar campos
        setNewKey("");
        setRequestStatus("success");
      } else {
        // Validación de montos para retiros de activos
        if (requestType === "withdrawal") {
          const btcToWithdraw = parseFloat(withdrawalAmounts["BTC"] || "0");
          const latamToWithdraw = parseFloat(withdrawalAmounts["$-L"] || "0");
          const goldToWithdraw = parseFloat(withdrawalAmounts["GLDCC"] || "0");

          if (btcToWithdraw > (data?.btc || 0)) throw new Error("Monto de BTC excede su balance disponible.");
          if (latamToWithdraw > (data?.latam || 0)) throw new Error("Monto de Dolar Latam excede su balance disponible.");
          if (goldToWithdraw > (data?.gold || 0)) throw new Error("Monto de Cagua Gold excede su balance disponible.");
          if (btcToWithdraw <= 0 && latamToWithdraw <= 0 && goldToWithdraw <= 0) {
            throw new Error("Debe ingresar al menos un monto válido para retirar.");
          }
        } else if (requestType === "loan" || requestType === "third-party") {
          const val = parseFloat(amount || "0");
          if (val > (data?.prestamoDisponible || 0)) throw new Error("El monto excede su crédito disponible.");
        }

        const payload = {
          cliente: clientId,
          key: sessionKey, 
          tipo: requestType,
          monto: requestType === "withdrawal" ? "" : amount,
          withdrawalDetails: requestType === "withdrawal" ? withdrawalAmounts : null,
          detalles: requestType === "third-party" 
            ? `Beneficiario: ${beneficiaryName} | Datos: ${beneficiaryInfo} | Nota: ${details}` 
            : details,
          balance_estimado: (data?.btcUsd ?? 0) + (data?.latamUsd ?? 0) + (data?.goldUsd ?? 0),
          activo: requestType === "withdrawal" ? assetType : "USDT"
        };
        const res = await fetch("/api/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        // Limpiar campos tras éxito
        setAmount("");
        setWithdrawalAmounts({ "BTC": "", "$-L": "", "GLDCC": "" });
        setDetails("");
        setBeneficiaryName("");
        setBeneficiaryInfo("");
        
        setRequestStatus("success");
      }
    } catch (err: any) {
      setFormError(err.message);
      setRequestStatus("error");
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Hola, soy cliente de Criptocagua Gold (${clientId}) y necesito ayuda.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`ccg_key_${clientId}`);
    window.location.href = '/';
  };

  // Temporizador de Inactividad (10 minutos)
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log("[Security] Sesión expirada por inactividad.");
        handleLogout();
      }, 600000); // 600,000 ms = 10 min
    };

    // Eventos que reinician el contador
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Iniciar timer
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]" style={{backgroundColor: '#0a0a0a'}}>
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#c5a059] animate-spin mx-auto" />
          <p className="text-[#888888] font-serif italic text-sm tracking-widest">Sincronizando con Google Sheets...</p>
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
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 border border-gold text-gold font-sans font-bold uppercase tracking-widest text-xs hover:bg-gold hover:text-bg-deep transition-all"
            >
              Regresar al Portal
            </button>
            <button 
              onClick={() => {
                const gas = (import.meta as any).env?.VITE_GAS_WEBAPP_URL || "No configurada";
                alert(`DIAGNÓSTICO DE CONFIGURACIÓN:\n\n1. URL detectada: "${gas}"\n2. Longitud: ${gas.length} carácteres\n3. Espacios detectados: ${gas.trim().length !== gas.length ? 'SÍ (⚠️ Borra los espacios en Vercel)' : 'NO'}\n4. URL de ejemplo detectada: ${gas.includes('YOUR_APPS_SCRIPT') ? 'SÍ (⚠️ Tienes que poner tu propia URL)' : 'NO'}\n\nRECUERDA: La URL debe terminar en /exec`);
              }}
              className="w-full py-2 text-text-dim hover:text-white transition-all text-[9px] uppercase tracking-widest opacity-50"
            >
              🛠️ Diagnosticar Escritura
            </button>
          </div>
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
          CLIENT ID: #CCG-{clientId?.split('@')[0]?.toUpperCase() || "ID"}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setRequestType("key"); setShowRequestModal(true); setRequestStatus("idle"); }}
            className="p-2 text-text-dim hover:text-gold transition-colors"
            title="Actualizar Llave"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowRequestModal(true)}
            className="bg-gold px-6 py-2.5 text-bg-deep font-sans font-bold uppercase tracking-[2px] text-[10px] hover:bg-gold-dim transition-all"
          >
            Área de Solicitudes
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-text-dim hover:text-red-400 transition-colors border border-border-accent hover:border-red-400/30 ml-2"
            title="Cerrar Sessión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-10 lg:px-20 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-20">
        <div className="summary-section flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="welcome-msg font-serif italic text-xl lg:text-2xl text-gold mb-3"
          >
            Bienvenido, <span className="capitalize">{data?.cliente?.split('@')[0] || "Usuario"}</span>
          </motion.div>
          <div className="main-balance-label text-[11px] uppercase tracking-[3px] text-text-dim mb-4 font-bold">
            Valor de Portafolio Estimado
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="main-balance-value font-serif text-5xl sm:text-7xl text-text-main mb-12 sm:mb-16 tracking-tight leading-none"
          >
            {totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-2xl sm:text-3xl text-gold">USDT</span>
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
                <span className="font-serif text-red-400 opacity-90">{data.deuda.toLocaleString()} USDT</span>
              </div>
              <div className="market-row flex justify-between py-4 border-b border-white/5 text-sm">
                <span className="text-text-dim">Crédito Disponible</span>
                <span className="font-serif text-green-400 opacity-90">{data.prestamoDisponible.toLocaleString()} USDT</span>
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

          <button 
            onClick={openWhatsApp}
            className="w-full py-6 border border-green-500/30 bg-green-500/5 text-green-500 font-sans font-bold uppercase tracking-[3px] text-[10px] hover:bg-green-500 hover:text-bg-deep transition-all flex items-center justify-center gap-3"
          >
            <MessageSquare className="w-4 h-4" />
            Asistencia WhatsApp
          </button>
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

      {/* Requests Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-bg-deep/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-panel border border-border-accent w-full max-w-2xl relative max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(197,160,89,0.1)] custom-scrollbar"
            >
              <button 
                onClick={() => { setShowRequestModal(false); setRequestType(null); setFormError(null); setRequestStatus("idle"); }}
                className="fixed sm:absolute top-4 sm:top-6 right-4 sm:right-6 text-text-dim hover:text-gold transition-colors z-[110] bg-bg-panel/80 backdrop-blur-sm p-1 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-6 sm:p-10 lg:p-16">
                {!requestType ? (
                  <div className="space-y-8 sm:space-y-10">
                    <div className="space-y-3">
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif italic text-gold leading-tight">Centro de <br />Solicitudes</h2>
                      <p className="text-text-dim text-xs sm:text-sm tracking-wide">Seleccione el servicio exclusivo que desea gestionar hoy.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <button 
                        onClick={() => { setRequestType("loan"); setRequestStatus("idle"); }}
                        className="p-6 sm:p-8 border border-border-accent bg-bg-card hover:border-gold/50 transition-all text-left flex flex-col gap-4 sm:gap-5 group"
                      >
                        <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[3px] text-text-main">Solicitar Préstamo</p>
                          <p className="text-[9px] sm:text-[10px] text-text-dim mt-2 leading-relaxed italic">Disponibilidad inmediata según su línea de crédito.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setRequestType("third-party"); setRequestStatus("idle"); }}
                        className="p-6 sm:p-8 border border-border-accent bg-bg-card hover:border-gold/50 transition-all text-left flex flex-col gap-4 sm:gap-5 group"
                      >
                        <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[3px] text-text-main">Pago a Terceros</p>
                          <p className="text-[9px] sm:text-[10px] text-text-dim mt-2 leading-relaxed italic">Gestione sus compromisos con cargo a su préstamo.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setRequestType("withdrawal"); setRequestStatus("idle"); }}
                        className="p-6 sm:p-8 border border-border-accent bg-bg-card hover:border-gold/50 transition-all text-left flex flex-col gap-4 sm:gap-5 group"
                      >
                        <ArrowUpRight className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[3px] text-text-main">Retiro de Activos</p>
                          <p className="text-[9px] sm:text-[10px] text-text-dim mt-2 leading-relaxed italic">Transferencia de tokens a su wallet personal.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setRequestType("key"); setRequestStatus("idle"); }}
                        className="p-6 sm:p-8 border border-border-accent bg-bg-card hover:border-gold/50 transition-all text-left flex flex-col gap-4 sm:gap-5 group"
                      >
                        <Key className="w-8 h-8 sm:w-10 sm:h-10 text-gold group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[3px] text-text-main">Actualizar Llave</p>
                          <p className="text-[9px] sm:text-[10px] text-text-dim mt-2 leading-relaxed italic">Refuerce la seguridad de su acceso maestro.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : requestStatus === "success" ? (
                  <div className="text-center py-20 space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto border border-gold/20 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
                      <ShieldCheck className="w-12 h-12 text-gold" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-serif italic text-text-main">Solicitud Registrada</h3>
                      <p className="text-text-dim text-sm max-w-sm mx-auto leading-relaxed">Su requerimiento está siendo procesado bajo estrictos protocolos de seguridad. Recibirá una notificación en breve.</p>
                    </div>
                    <button 
                      onClick={() => { setShowRequestModal(false); setRequestType(null); }}
                      className="px-12 py-5 bg-gold text-bg-deep font-sans font-bold uppercase tracking-[4px] text-[10px] hover:bg-gold-dim transition-all"
                    >
                      Cerrar Panel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => { setRequestType(null); setFormError(null); }}
                        className="text-text-dim hover:text-gold transition-colors text-[10px] uppercase tracking-[3px] font-bold"
                      >
                        ← Volver
                      </button>
                      <div className="space-y-3">
                        <p className="text-[10px] text-gold uppercase tracking-[2px] font-bold italic">
                          {(requestType === "loan" || requestType === "third-party") && "⚠️ ESTA OPERACIÓN SE DESCONTARÁ DE SU CRÉDITO DISPONIBLE"}
                        </p>
                        <h2 className="text-3xl font-serif italic text-gold">
                          {requestType === "loan" && "Solicitud de Préstamo"}
                          {requestType === "third-party" && "Pago a Terceros"}
                          {requestType === "withdrawal" && "Retiro de Activos Múltiple"}
                          {requestType === "key" && "Firma de Seguridad"}
                        </h2>
                      </div>
                    </div>

                    <form onSubmit={handleRequestSubmit} className="space-y-8">
                      {requestType === "key" ? (
                        <div className="space-y-6">
                           <div className="p-6 bg-gold/5 border border-gold/10 text-[10px] text-gold uppercase tracking-[1px] leading-relaxed italic">
                            Advertencia: Al cambiar su llave maestro, todas las sesiones activas en otros dispositivos serán finalizadas por seguridad.
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-[3px] text-text-dim block px-1">Nueva Llave Maestro</label>
                            <input 
                              type="password"
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              placeholder="Firma electrónica segura"
                              className="w-full bg-bg-deep border border-border-accent p-6 text-text-main focus:border-gold outline-none text-sm placeholder:opacity-20 transition-all font-mono"
                              required
                            />
                          </div>
                        </div>
                      ) : requestType === "withdrawal" ? (
                        <div className="space-y-8">
                          <div className="bg-gold/5 border-l-4 border-gold p-4 text-[10px] text-gold uppercase tracking-[1px] italic mb-6">
                            Indique la cantidad de cada activo que desea retirar a su billetera.
                          </div>
                          
                          <div className="space-y-6">
                            {/* BTC Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-b border-white/5 pb-6">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-[2px] text-text-dim block">Bitcoin (BTC) | Disponible: {data.btc.toFixed(8)}</label>
                                <input 
                                  type="number" step="any"
                                  value={withdrawalAmounts["BTC"]}
                                  onChange={(e) => setWithdrawalAmounts({...withdrawalAmounts, "BTC": e.target.value})}
                                  placeholder="0.00000000"
                                  className="w-full bg-bg-deep border border-border-accent p-4 text-text-main focus:border-gold outline-none text-sm font-mono"
                                />
                              </div>
                              <div className="hidden sm:block text-[10px] text-text-dim italic pb-4">≈ {(parseFloat(withdrawalAmounts["BTC"] || "0") * (data.btcUsd / (data.btc || 1))).toFixed(2)} USDT</div>
                            </div>

                            {/* LATAM Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-b border-white/5 pb-6">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-[2px] text-text-dim block">Dolar Latam ($-L) | Disponible: {data.latam.toFixed(2)}</label>
                                <input 
                                  type="number" step="any"
                                  value={withdrawalAmounts["$-L"]}
                                  onChange={(e) => setWithdrawalAmounts({...withdrawalAmounts, "$-L": e.target.value})}
                                  placeholder="0.00"
                                  className="w-full bg-bg-deep border border-border-accent p-4 text-text-main focus:border-gold outline-none text-sm font-mono"
                                />
                              </div>
                              <div className="hidden sm:block text-[10px] text-text-dim italic pb-4">≈ {(parseFloat(withdrawalAmounts["$-L"] || "0") * (data.latamUsd / (data.latam || 1))).toFixed(2)} USDT</div>
                            </div>

                            {/* GOLD Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end border-b border-white/5 pb-6">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-[2px] text-text-dim block">Cagua Gold (GLDCC) | Disponible: {data.gold.toFixed(2)}</label>
                                <input 
                                  type="number" step="any"
                                  value={withdrawalAmounts["GLDCC"]}
                                  onChange={(e) => setWithdrawalAmounts({...withdrawalAmounts, "GLDCC": e.target.value})}
                                  placeholder="0.00"
                                  className="w-full bg-bg-deep border border-border-accent p-4 text-text-main focus:border-gold outline-none text-sm font-mono"
                                />
                              </div>
                              <div className="hidden sm:block text-[10px] text-text-dim italic pb-4">≈ {(parseFloat(withdrawalAmounts["GLDCC"] || "0") * (data.goldUsd / (data.gold || 1))).toFixed(2)} USDT</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-[3px] text-text-dim block px-1">Memorándum / Instrucciones de Wallet</label>
                            <textarea 
                              value={details}
                              onChange={(e) => setDetails(e.target.value)}
                              placeholder="Especifique su dirección de billetera y red (ej: TRC20)..."
                              className="w-full bg-bg-deep border border-border-accent p-6 text-text-main focus:border-gold outline-none text-sm min-h-[100px] font-serif italic"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] uppercase font-bold tracking-[3px] text-text-dim block px-1">Monto en USDT</label>
                              <input 
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-bg-deep border border-border-accent p-6 text-text-main focus:border-gold outline-none text-sm placeholder:opacity-20 transition-all font-mono"
                                required
                              />
                            </div>
                          </div>

                          {requestType === "third-party" && (
                            <div className="space-y-6">
                              <div className="bg-gold/5 border-l-4 border-gold p-6 space-y-4">
                                <h4 className="text-[10px] uppercase font-bold tracking-[2px] text-gold">Guía de Información Requerida</h4>
                                <ul className="text-[10px] text-text-dim space-y-2 list-disc pl-4 italic leading-relaxed">
                                  <li><strong className="text-text-main">Transferencia Bancaria:</strong> Nombre completo, Banco, Tipo de Cuenta, CBU/Cuentas/IBAN y Documento de identidad.</li>
                                  <li><strong className="text-text-main">Criptoactivos:</strong> Dirección de billetera (Wallet) y <span className="text-gold underline">especificar Red (ej: TRC20, ERC20, BEP20)</span>.</li>
                                  <li><strong className="text-text-main">Pagos por ID:</strong> Binance Pay ID o similares.</li>
                                </ul>
                                <p className="text-[9px] text-text-dim font-sans">** Verifique los datos. Transferencias a redes incorrectas resultarán en pérdida total de fondos.</p>
                              </div>

                              <div className="bg-white/5 p-6 border border-white/5 space-y-6">
                                <div className="space-y-3">
                                  <label className="text-[10px] uppercase font-bold tracking-[3px] text-gold block px-1">Nombre del Beneficiario</label>
                                  <input 
                                    type="text"
                                    value={beneficiaryName}
                                    onChange={(e) => setBeneficiaryName(e.target.value)}
                                    placeholder="Nombre completo o Razón Social"
                                    className="w-full bg-bg-deep border border-border-accent p-4 text-text-main focus:border-gold outline-none text-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[10px] uppercase font-bold tracking-[3px] text-gold block px-1">Datos de Cuenta / Red / Billetera</label>
                                  <textarea 
                                    value={beneficiaryInfo}
                                    onChange={(e) => setBeneficiaryInfo(e.target.value)}
                                    placeholder="Ej: Banco BBVA, Cta Corriente 12345... o Wallet 0x... (Red TRC20)"
                                    className="w-full bg-bg-deep border border-border-accent p-4 text-text-main focus:border-gold outline-none text-sm min-h-[100px]"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-[3px] text-text-dim block px-1">
                              {requestType === "third-party" ? "Instrucciones Adicionales" : "Memorándum / Notas"}
                            </label>
                            <textarea 
                              value={details}
                              onChange={(e) => setDetails(e.target.value)}
                              placeholder={requestType === "third-party" ? "Detalles específicos del pago..." : "Notas para el gestor..."}
                              className="w-full bg-bg-deep border border-border-accent p-6 text-text-main focus:border-gold outline-none text-sm min-h-[100px] placeholder:opacity-20 transition-all font-serif italic"
                            />
                          </div>
                        </div>
                      )}

                      {formError && (
                        <div className="p-5 bg-red-400/5 border border-red-400/20 text-red-400 text-[10px] font-sans uppercase tracking-[2px] animate-pulse">
                          {formError}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={requestStatus === "loading"}
                        className="w-full py-6 bg-gold text-bg-deep font-sans font-bold uppercase tracking-[5px] text-[10px] hover:bg-gold-dim transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        {requestStatus === "loading" ? "Validando Firma..." : "Sellar Solicitud"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] font-sans" style={{backgroundColor: '#0a0a0a'}} id="home-screen">
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
