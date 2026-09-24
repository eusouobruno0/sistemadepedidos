import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check } from 'lucide-react';
import { CondicaoPagamento } from '../../types';

interface CondicaoPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cond: CondicaoPagamento) => void;
  initialData?: CondicaoPagamento | null;
}

export const CondicaoPagamentoModal: React.FC<CondicaoPagamentoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '');
      setDescricao(initialData.descricao || '');
    } else {
      setNome('');
      setDescricao('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Informe a condição de pagamento.');
      return;
    }

    const newCond: CondicaoPagamento = {
      id: initialData?.id || '',
      nome: nome.toUpperCase().trim(),
      descricao: descricao.trim() || undefined,
    };

    onSave(newCond);
    setNome('');
    setDescricao('');
    onClose();
  };

  return (
    <div
      id="modal-condicao-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-condicao-container"
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Condição de Pagamento' : 'Nova Condição de Pagamento'}
              </h2>
              <p className="text-xs text-slate-500">
                {initialData ? 'Altere as informações da condição selecionada' : 'Cadastre para usar agora e nos próximos pedidos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Condição / Prazo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: BOLETO 35 DD ou 30/45/60 DIAS"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Observação / Descrição (Opcional)
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Faturado via boleto bancário"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar Condição
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
