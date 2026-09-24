import React from 'react';
import { TipoDocumento } from '../types';

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
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Título */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => onSelectTab('relatorios')}
              className="text-lg sm:text-xl font-bold text-slate-900 hover:opacity-85 transition-opacity cursor-pointer"
            >
              Gestão de Pedidos
            </button>

            {/* Navegação principal padronizada */}
            <nav className="flex items-center gap-2">
              <button
                type="button"
                id="nav-novo-pedido"
                onClick={() => onNovoClick('PEDIDO')}
                className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer ${
                  currentTab === 'novo'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Novo pedido
              </button>

              <button
                type="button"
                id="nav-relatorios"
                onClick={() => onSelectTab('relatorios')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer ${
                  currentTab === 'relatorios' || currentTab === 'visualizar'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Relatórios
              </button>

              <button
                type="button"
                id="nav-cadastros"
                onClick={() => onSelectTab('cadastros')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all cursor-pointer ${
                  currentTab === 'cadastros'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Cadastros
              </button>
            </nav>
          </div>

          {/* Lado Direito: Indicador de Uso Local Direto */}
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Uso Local
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
