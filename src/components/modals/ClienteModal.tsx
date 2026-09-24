import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, Mail, Check, Sparkles, Loader2 } from 'lucide-react';
import { Cliente } from '../../types';
import { formatCnpjCpf, formatCep, formatPhone } from '../../utils/formatters';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
  initialData?: Cliente | null;
}

export const ClienteModal: React.FC<ClienteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Cliente>>({
    codigo: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    rgIe: '',
    telefone: '',
    celular: '',
    email: '',
    contato: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'RS',
    localEntregaPadrao: '',
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        codigo: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpjCpf: '',
        rgIe: '',
        telefone: '',
        celular: '',
        email: '',
        contato: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: 'RS',
        localEntregaPadrao: '',
      });
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleBuscarCep = async () => {
    const clean = formData.cep?.replace(/\D/g, '') || '';
    if (clean.length !== 8) return;
    try {
      setLoadingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => {
          const updated = {
            ...prev,
            endereco: data.logradouro || prev.endereco || '',
            bairro: data.bairro || prev.bairro || '',
            cidade: data.localidade || prev.cidade || '',
            estado: data.uf || prev.estado || '',
          };
          if (!prev.localEntregaPadrao) {
            updated.localEntregaPadrao = `${updated.endereco || ''}, ${updated.numero || 'S/N'}, ${updated.bairro || ''}, ${updated.cidade || ''}, ${updated.estado || ''} CEP: ${formatCep(clean)}`;
          }
          return updated;
        });
      }
    } catch {
      // falha silenciosa de rede
    } finally {
      setLoadingCep(false);
    }
  };

  const handleBuscarCnpj = async () => {
    const clean = formData.cnpjCpf?.replace(/\D/g, '') || '';
    if (clean.length !== 14) return;
    try {
      setLoadingCnpj(true);
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => {
          const end = `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim();
          const updated = {
            ...prev,
            razaoSocial: data.razao_social || prev.razaoSocial || '',
            nomeFantasia: data.nome_fantasia || prev.nomeFantasia || '',
            telefone: data.ddd_telefone_1 || prev.telefone || '',
            cep: data.cep || prev.cep || '',
            endereco: end || prev.endereco || '',
            numero: data.numero || prev.numero || '',
            complemento: data.complemento || prev.complemento || '',
            bairro: data.bairro || prev.bairro || '',
            cidade: data.municipio || prev.cidade || '',
            estado: data.uf || prev.estado || '',
            email: data.email || prev.email || '',
          };
          if (!prev.localEntregaPadrao) {
            updated.localEntregaPadrao = `${updated.endereco || ''}, ${updated.numero || 'S/N'}, ${updated.bairro || ''}, ${updated.cidade || ''}, ${updated.estado || ''} CEP: ${formatCep(updated.cep)}`;
          }
          return updated;
        });
      }
    } catch {
      // Ignora timeout
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial?.trim()) {
      setErrorMsg('A Razão Social / Nome do Cliente é obrigatória.');
      return;
    }

    const localEntregaFinal =
      formData.localEntregaPadrao?.trim() ||
      `${formData.endereco || ''}, ${formData.numero || 'S/N'}, ${formData.bairro || ''}, ${formData.cidade || ''}, ${formData.estado || ''} CEP: ${formData.cep || ''}`;

    const newCliente: Cliente = {
      id: initialData?.id || '',
      codigo: initialData?.codigo || '', // O banco gera sequencial único 000001
      razaoSocial: formData.razaoSocial.toUpperCase().trim(),
      nomeFantasia: formData.nomeFantasia?.toUpperCase().trim(),
      cnpjCpf: formatCnpjCpf(formData.cnpjCpf),
      rgIe: formData.rgIe?.trim() || '',
      telefone: formatPhone(formData.telefone),
      celular: formatPhone(formData.celular),
      email: formData.email?.trim() || '',
      contato: formData.contato?.trim() || '',
      cep: formatCep(formData.cep),
      endereco: formData.endereco?.toUpperCase().trim() || '',
      numero: formData.numero?.trim() || '',
      complemento: formData.complemento?.trim() || '',
      bairro: formData.bairro?.toUpperCase().trim() || '',
      cidade: formData.cidade?.toUpperCase().trim() || '',
      estado: (formData.estado?.toUpperCase().trim() || 'RS').slice(0, 2),
      localEntregaPadrao: localEntregaFinal.toUpperCase().trim(),
    };

    onSave(newCliente);
    onClose();
  };

  return (
    <div
      id="modal-cliente-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-cliente-container"
        className="relative bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {initialData ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                {initialData?.codigo ? `Código ${initialData.codigo}` : 'Código gerado automaticamente pelo banco'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                CPF ou CNPJ
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cnpjCpf || ''}
                  onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleBuscarCnpj}
                  disabled={loadingCnpj}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Consultar dados do CNPJ na Receita"
                >
                  {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-600" />}
                  <span>Auto</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Inscrição Estadual / RG
              </label>
              <input
                type="text"
                value={formData.rgIe || ''}
                onChange={(e) => setFormData({ ...formData, rgIe: e.target.value })}
                placeholder="Ex: 096/0000000 ou ISENTO"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Razão Social / Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.razaoSocial || ''}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                placeholder="Nome da empresa ou cliente"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.nomeFantasia || ''}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                placeholder="Nome comercial conhecido"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Celular / WhatsApp
              </label>
              <input
                type="text"
                value={formData.celular || ''}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                placeholder="(00) 90000-0000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">
              Endereço e Localização
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarCep}
                    disabled={loadingCep}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CEP'}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Logradouro / Rua
                </label>
                <input
                  type="text"
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Avenida..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="100 ou S/N"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  value={formData.estado || 'RS'}
                  maxLength={2}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  placeholder="RS"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
