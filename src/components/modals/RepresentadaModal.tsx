import React, { useState, useEffect } from 'react';
import { X, Building2, Check } from 'lucide-react';
import { Representada } from '../../types';
import { formatCnpjCpf, formatPhone } from '../../utils/formatters';

interface RepresentadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (representada: Representada) => void;
  initialData?: Representada | null;
}

export const RepresentadaModal: React.FC<RepresentadaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Representada>>({
    nome: '',
    razaoSocial: '',
    cnpj: '',
    ie: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: 'RS',
    cep: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nome: '',
        razaoSocial: '',
        cnpj: '',
        ie: '',
        telefone: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: 'RS',
        cep: '',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      setError('O Nome Fantasia / Identificação da Representada é obrigatório.');
      return;
    }

    const novaRep: Representada = {
      id: initialData?.id || '',
      nome: formData.nome.toUpperCase().trim(),
      razaoSocial: formData.razaoSocial?.toUpperCase().trim() || formData.nome.toUpperCase().trim(),
      cnpj: formatCnpjCpf(formData.cnpj || ''),
      ie: formData.ie?.trim() || '',
      telefone: formatPhone(formData.telefone || ''),
      endereco: formData.endereco?.trim() || '',
      bairro: formData.bairro?.trim() || '',
      cidade: formData.cidade?.toUpperCase().trim() || '',
      estado: (formData.estado?.toUpperCase().trim() || 'RS').slice(0, 2),
      cep: formData.cep?.trim() || '',
    };

    onSave(novaRep);
    onClose();
  };

  return (
    <div
      id="modal-representada-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-representada-container"
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Representada' : 'Cadastrar Representada'}
              </h2>
              <p className="text-xs text-slate-500">
                Adicione a indústria representada sem sair da digitação do pedido
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
              Nome Fantasia / Identificação da Indústria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nome || ''}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: INDÚSTRIA METALÚRGICA ALPHA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Razão Social
            </label>
            <input
              type="text"
              value={formData.razaoSocial || ''}
              onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
              placeholder="Ex: ALPHA COMPONENTES INDUSTRIAIS LTDA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Inscrição Estadual
              </label>
              <input
                type="text"
                value={formData.ie || ''}
                onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                placeholder="Isento ou Nº da IE"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Ex: CAXIAS DO SUL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">UF</label>
              <input
                type="text"
                maxLength={2}
                value={formData.estado || 'RS'}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Ex: Industrial"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
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
              <span>Salvar Representada</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
