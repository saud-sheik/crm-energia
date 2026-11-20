import React, { useState } from "react";
import {
  Layers,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

export interface StackItem {
  id: string;
  label: string;
  shortLabel?: string;
  badge?: string | number | null;
  badgeColor?: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export interface DossierSmartStackProps {
  items: StackItem[];
  defaultTab?: string;
  title?: string;
  className?: string;
}

export const DossierSmartStack: React.FC<DossierSmartStackProps> = ({
  items,
  defaultTab,
  title = "Dossier Smart Stack",
  className = ""
}) => {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (defaultTab) {
      const idx = items.findIndex((it) => it.id === defaultTab);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  const currentItem = items[activeIndex] || items[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={`relative transition-all duration-300 ${className}`}>
      {/* Visual iOS Stack 3D Layered Cards (visible when collapsed) */}
      {!isExpanded && (
        <>
          <div className="absolute -bottom-1.5 left-3 right-3 h-3 bg-slate-200/80 dark:bg-slate-800/80 rounded-b-[20px] -z-10 shadow-xs pointer-events-none transition-all" />
          <div className="absolute -bottom-3 left-6 right-6 h-3 bg-slate-100 dark:bg-slate-800/40 rounded-b-[18px] -z-20 shadow-xs pointer-events-none transition-all" />
        </>
      )}

      {/* Main Bundle Card Surface */}
      <div className="bg-white dark:bg-slate-900 border-2 border-[#E5D4DE] dark:border-[#551938]/40 rounded-[22px] shadow-[0_10px_28px_-6px_rgba(85,25,56,0.06)] p-4 sm:p-5 relative overflow-hidden transition-all duration-200">
        
        {/* Top Header: Bundle Title & Expand/Collapse Toggle */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#45142B] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block leading-tight">
                iPhone Smart Stack
              </span>
              <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95"
              title={isExpanded ? "Collapse to single card bundle" : "Expand all 3 cards in full"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#ED1A53]" />
                  <span>Collapse Stack</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#ED1A53]" />
                  <span>Expand All ({items.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── BUNDLED VIEW: Single Active Card with iOS Segmented Switcher & Stack Pager ── */}
        {!isExpanded ? (
          <div className="space-y-3.5">
            {/* iOS-Style Segmented Pill Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/80">
              {items.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer truncate ${
                      isActive
                        ? "bg-[#45142B] dark:bg-[#45142B] text-white font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold hover:bg-white/60 dark:hover:bg-slate-700/50"
                    }`}
                    title={item.label}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.shortLabel || item.label}</span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.badgeColor || "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Widget Content Body */}
            <div className="min-h-[220px] transition-all duration-200">
              {currentItem.content}
            </div>

            {/* iOS Stack Pagination Dots & Cycle Arrows Footer */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={handlePrev}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                title="Previous card in stack"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`transition-all rounded-full ${
                      idx === activeIndex
                        ? "w-4 h-1.5 bg-[#45142B] dark:bg-rose-400"
                        : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    }`}
                    title={`Switch to ${item.label}`}
                  />
                ))}
                <span className="text-[10px] font-bold text-slate-400 ml-1.5">
                  {activeIndex + 1} of {items.length}
                </span>
              </div>

              <button
                onClick={handleNext}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                title="Next card in stack"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── EXPANDED VIEW: All 3 Widgets Rendered In Full Depth ── */
          <div className="space-y-6 pt-1 animate-fade-in">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`space-y-3 ${
                  idx > 0 ? "pt-5 border-t-2 border-slate-100 dark:border-slate-800/80" : ""
                }`}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-[#ED1A53] flex items-center justify-center shrink-0 border border-rose-200/60">
                      {item.icon}
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {item.label}
                    </h4>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Section Content */}
                <div className="text-xs">
                  {item.content}
                </div>
              </div>
            ))}

            {/* Bottom Collapse Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-[#45142B] dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer border border-rose-200/80 dark:border-rose-800 shadow-2xs"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#ED1A53]" />
                <span>Collapse back to Smart Stack</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

