import React, { useState, useEffect } from 'react';
import { X, Truck, Check } from 'lucide-react';
import { Transportadora } from '../../types';
import { formatCnpjCpf, formatPhone } from '../../utils/formatters';

interface TransportadoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transp: Transportadora) => void;
  initialData?: Transportadora | null;
}

export const TransportadoraModal: React.FC<TransportadoraModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Transportadora>>({
    nome: '',
    cnpj: '',
    telefone: '',
    cidade: '',
    estado: 'RS',
    tipoFretePadrao: 'FOB',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nome: '',
        cnpj: '',
        telefone: '',
        cidade: '',
        estado: 'RS',
        tipoFretePadrao: 'FOB',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      setError('O Nome da Transportadora é obrigatório.');
      return;
    }

    const newTransp: Transportadora = {
      id: initialData?.id || `transp-${Date.now()}`,
      nome: formData.nome.toUpperCase().trim(),
      cnpj: formatCnpjCpf(formData.cnpj),
      telefone: formatPhone(formData.telefone),
      cidade: formData.cidade?.toUpperCase().trim() || '',
      estado: (formData.estado?.toUpperCase().trim() || 'RS').slice(0, 2),
      tipoFretePadrao: formData.tipoFretePadrao || 'FOB',
    };

    onSave(newTransp);
    onClose();
  };

  return (
    <div
      id="modal-transportadora-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-transportadora-container"
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Transportadora' : 'Cadastrar Transportadora na Hora'}
              </h2>
              <p className="text-xs text-slate-500">
                Adicione a transportadora sem sair da digitação do pedido
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
              Nome da Transportadora <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nome || ''}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: REDE NACIONAL DE ENCOMENDAS LTDA"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(51) 3322-1100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
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
                placeholder="PORTO ALEGRE"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
              <input
                type="text"
                maxLength={2}
                value={formData.estado || ''}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                placeholder="RS"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Frete Padrão Usual
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  formData.tipoFretePadrao === 'FOB'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="freteModal"
                  value="FOB"
                  checked={formData.tipoFretePadrao === 'FOB'}
                  onChange={() => setFormData({ ...formData, tipoFretePadrao: 'FOB' })}
                  className="sr-only"
                />
                FOB - Por conta Destinatário
              </label>

              <label
                className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  formData.tipoFretePadrao === 'CIF'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="freteModal"
                  value="CIF"
                  checked={formData.tipoFretePadrao === 'CIF'}
                  onChange={() => setFormData({ ...formData, tipoFretePadrao: 'CIF' })}
                  className="sr-only"
                />
                CIF - Por conta Emitente
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              {initialData ? 'Atualizar' : 'Salvar e Selecionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
