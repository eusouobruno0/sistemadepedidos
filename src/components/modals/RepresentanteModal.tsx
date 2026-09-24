import React, { useState, useEffect } from 'react';
import { X, UserCheck, Check } from 'lucide-react';
import { Representante } from '../../types';
import { formatPhone } from '../../utils/formatters';

interface RepresentanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (representante: Representante) => void;
  initialData?: Representante | null;
}

export const RepresentanteModal: React.FC<RepresentanteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Representante>>({
    nome: '',
    telefone: '',
    email: '',
    comissaoPadrao: 5,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        comissaoPadrao: 5,
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      setError('O Nome do Representante / Vendedor é obrigatório.');
      return;
    }

    const comissao = Number(formData.comissaoPadrao);
    if (isNaN(comissao) || comissao < 0 || comissao > 100) {
      setError('O percentual de comissão padrão deve estar entre 0% e 100%.');
      return;
    }

    const novoRep: Representante = {
      id: initialData?.id || '',
      nome: formData.nome.toUpperCase().trim(),
      telefone: formatPhone(formData.telefone || ''),
      email: formData.email?.trim().toLowerCase() || '',
      comissaoPadrao: comissao,
    };

    onSave(novoRep);
    onClose();
  };

  return (
    <div
      id="modal-representante-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-representante-container"
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Representante' : 'Cadastrar Representante'}
              </h2>
              <p className="text-xs text-slate-500">
                Adicione o representante sem sair da digitação do pedido
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-2 rounded-lg transition-colors cursor-pointer"
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
              Nome Completo do Representante / Vendedor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nome || ''}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: CARLOS ALBERTO SILVEIRA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / Celular</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Comissão Padrão (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={formData.comissaoPadrao ?? 5}
                onChange={(e) =>
                  setFormData({ ...formData, comissaoPadrao: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="representante@email.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none lowercase"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Representante</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
