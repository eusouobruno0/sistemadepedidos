import React from 'react';
import { TipoDocumento } from '../types';

export type NavigationTab = 'novo' | 'pedidos' | 'cadastros' | 'relatorios' | 'visualizar';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onNovoClick: (tipo: TipoDocumento) => void;
  onResetData: () => void;
  pedidosCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNovoClick,
  pedidosCount,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Título */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => onSelectTab('pedidos')}
              className="text-lg sm:text-xl font-bold text-slate-900 hover:opacity-85 transition-opacity"
            >
              Gestão de Pedidos
            </button>

            {/* Navegação idêntica à referência do usuário */}
            <nav className="flex items-center gap-2">
              <button
                type="button"
                id="nav-novo-pedido"
                onClick={() => onNovoClick('PEDIDO')}
                className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all ${
                  currentTab === 'novo'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Novo pedido
              </button>

              <button
                type="button"
                id="nav-meus-pedidos"
                onClick={() => onSelectTab('pedidos')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all ${
                  currentTab === 'pedidos' || currentTab === 'visualizar'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Meus pedidos {pedidosCount > 0 && `(${pedidosCount})`}
              </button>

              <button
                type="button"
                id="nav-cadastros"
                onClick={() => onSelectTab('cadastros')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all ${
                  currentTab === 'cadastros'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Cadastros
              </button>

              <button
                type="button"
                id="nav-relatorios"
                onClick={() => onSelectTab('relatorios')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all ${
                  currentTab === 'relatorios'
                    ? 'bg-slate-100 text-indigo-700 border-2 border-indigo-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Relatórios
              </button>
            </nav>
          </div>

          {/* Lado Direito: Status de teste e Sair */}
          <div className="hidden sm:flex items-center gap-3 text-sm text-slate-500">
            <span>Usuário de teste (login desativado)</span>
            <button
              type="button"
              onClick={() => alert('Modo sem senha ativado para você testar e alinhar o sistema primeiro.')}
              className="text-slate-600 hover:text-slate-900 hover:underline font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
