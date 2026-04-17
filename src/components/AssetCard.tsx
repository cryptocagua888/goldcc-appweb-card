import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface AssetCardProps {
  name: string;
  symbol: string;
  amount: number;
  amountUsd: number;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export default function AssetCard({ name, symbol, amount, amountUsd, icon: Icon, color, delay = 0 }: AssetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-bg-panel border border-border-accent p-6 rounded-none shadow-sm hover:border-gold/60 transition-all duration-300 group"
      id={`asset-card-${symbol.toLowerCase()}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-full bg-gold-dim flex items-center justify-center text-bg-deep font-bold text-sm">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <span className="text-[10px] font-sans font-bold text-text-dim uppercase tracking-[2px] block">{symbol}</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-3xl font-serif text-text-main tracking-tight">
          {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
        </h3>
        <p className="text-text-dim text-sm font-sans">
          ≈ ${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </p>
      </div>
      
      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] text-text-dim font-sans uppercase tracking-[1px]">{name}</span>
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-gold uppercase tracking-tighter">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          CONSULTING
        </div>
      </div>
    </motion.div>
  );
}
