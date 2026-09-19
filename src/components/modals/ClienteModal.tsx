import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, Mail, Check, Sparkles, Loader2 } from 'lucide-react';
import { Cliente } from '../../types';
import { formatCnpjCpf, formatCep, formatPhone } from '../../utils/formatters';
import { StorageService } from '../../utils/storage';

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
      const nextCod = StorageService.getNextCodigoCliente();
      setFormData({
        codigo: nextCod,
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
          // Atualiza também o local de entrega padrão se estiver vazio
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
          const updated = {
            ...prev,
            razaoSocial: data.razao_social || prev.razaoSocial,
            nomeFantasia: data.nome_fantasia || prev.nomeFantasia,
            telefone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : prev.telefone,
            email: data.email || prev.email,
            cep: data.cep ? formatCep(data.cep) : prev.cep,
            endereco: data.logradouro || prev.endereco,
            numero: data.numero || prev.numero,
            complemento: data.complemento || prev.complemento,
            bairro: data.bairro || prev.bairro,
            cidade: data.municipio || prev.cidade,
            estado: data.uf || prev.estado,
          };
          updated.localEntregaPadrao = `${updated.endereco || ''}, ${updated.numero || ''}, ${updated.bairro || ''}, ${updated.cidade || ''}, ${updated.estado || ''} CEP: ${updated.cep || ''}`;
          return updated;
        });
      }
    } catch {
      // Ignora se der timeout
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
      id: initialData?.id || `cli-${Date.now()}`,
      codigo: formData.codigo?.trim() || String(Date.now()).slice(-6),
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
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Cliente' : 'Cadastrar Novo Cliente na Hora'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados importantes. O cliente será selecionado automaticamente no pedido.
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

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Linha 1: Código, CNPJ e Botão Buscar CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cód. Interno (Sistema)
              </label>
              <div className="h-10 px-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-indigo-900">
                  {formData.codigo || 'Automático'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-200 text-indigo-800 rounded">
                  Automático
                </span>
              </div>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                CNPJ / CPF
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cnpjCpf || ''}
                  onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                  onBlur={handleBuscarCnpj}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-4 flex items-end">
              <button
                type="button"
                onClick={handleBuscarCnpj}
                disabled={loadingCnpj}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                title="Preencher automaticamente dados pela Receita Federal"
              >
                {loadingCnpj ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                )}
                Auto-preencher CNPJ
              </button>
            </div>
          </div>

          {/* Linha 2: Razão Social e Nome Fantasia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razão Social / Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.razaoSocial || ''}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                placeholder="Ex: METALURGICA VENANCIO LTDA"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nome Fantasia (Opcional)
              </label>
              <input
                type="text"
                value={formData.nomeFantasia || ''}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                placeholder="Ex: VENANCIO METAL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Linha 3: Inscrição Estadual, Telefone, Celular, Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Inscrição Estadual (RG/IE)
              </label>
              <input
                type="text"
                value={formData.rgIe || ''}
                onChange={(e) => setFormData({ ...formData, rgIe: e.target.value })}
                placeholder="Ex: 155/0035476"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Telefone Fixo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(51) 3793-4300"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Celular / WhatsApp
              </label>
              <input
                type="text"
                value={formData.celular || ''}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                placeholder="(51) 99876-5432"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Pessoa de Contato
              </label>
              <input
                type="text"
                value={formData.contato || ''}
                onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                placeholder="Ex: Suprimentos / Carlos"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              E-mail (usado para envio de pedido caso solicitado)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="compras@cliente.com.br"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Seção Endereço */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Endereço e Local de Entrega
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    onBlur={handleBuscarCep}
                    placeholder="95800-000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                  {loadingCep && (
                    <div className="flex items-center px-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Logradouro / Rua / Avenida
                </label>
                <input
                  type="text"
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="RUA PROFESSORA WILMA HELENA KUNZ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Número</label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="2469"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="BELA VISTA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="VENANCIO AIRES"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado (UF)</label>
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
                Local de Entrega Completo (Como sairá impresso no pedido)
              </label>
              <textarea
                rows={2}
                value={formData.localEntregaPadrao || ''}
                onChange={(e) => setFormData({ ...formData, localEntregaPadrao: e.target.value })}
                placeholder="RUA PROFESSORA WILMA HELENA KUNZ, 2469, BELA VISTA, VENANCIO AIRES, RS CEP: 95800-000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-blue-500 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          {/* Footer Ações */}
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
              {initialData ? 'Atualizar Cliente' : 'Salvar e Selecionar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
