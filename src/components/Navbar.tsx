import React from 'react';
import { TipoDocumento } from '../types';
import { PlusCircle, FileText, Database } from 'lucide-react';

export type NavigationTab = 'novo' | 'cadastros' | 'relatorios' | 'visualizar';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onNovoClick: (tipo: TipoDocumento) => void;
  pedidosCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNovoClick,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        {/* DESKTOP BARRA (md:flex) */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => onSelectTab('relatorios')}
              className="text-xl font-black text-slate-900 hover:opacity-85 transition-opacity cursor-pointer tracking-tight"
            >
              Gestão de Pedidos
            </button>

            <nav className="flex items-center gap-2">
              <button
                type="button"
                id="nav-novo-pedido"
                onClick={() => onNovoClick('PEDIDO')}
                className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                  currentTab === 'novo'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo pedido</span>
              </button>

              <button
                type="button"
                id="nav-relatorios"
                onClick={() => onSelectTab('relatorios')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                  currentTab === 'relatorios' || currentTab === 'visualizar'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Relatórios</span>
              </button>

              <button
                type="button"
                id="nav-cadastros"
                onClick={() => onSelectTab('cadastros')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                  currentTab === 'cadastros'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Cadastros</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Uso Local
            </span>
          </div>
        </div>

        {/* MOBILE BARRA (Visível apenas em smartphones e tablets pequenos) */}
        <div className="md:hidden py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectTab('relatorios')}
              className="text-base font-black text-slate-900 tracking-tight"
            >
              Gestão de Pedidos
            </button>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Supabase OK
            </span>
          </div>

          {/* Abas Mobile Segmentadas (100% largura, botões grandes e confortáveis) */}
          <nav className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              id="mobile-nav-novo"
              onClick={() => onNovoClick('PEDIDO')}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] cursor-pointer ${
                currentTab === 'novo'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Pedido</span>
            </button>

            <button
              type="button"
              id="mobile-nav-relatorios"
              onClick={() => onSelectTab('relatorios')}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] cursor-pointer ${
                currentTab === 'relatorios' || currentTab === 'visualizar'
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatórios</span>
            </button>

            <button
              type="button"
              id="mobile-nav-cadastros"
              onClick={() => onSelectTab('cadastros')}
              className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] cursor-pointer ${
                currentTab === 'cadastros'
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Cadastros</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
