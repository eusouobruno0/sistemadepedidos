import React, { useState, useEffect } from 'react';
import { X, Package, Check, Calculator, Building2, Layers } from 'lucide-react';
import { Produto, Representada } from '../../types';
import { StorageService } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';

interface ProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prod: Produto) => void;
  representadas: Representada[];
  initialData?: Produto | null;
}

export const ProdutoModal: React.FC<ProdutoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  representadas,
  initialData,
}) => {
  const [codigoInterno, setCodigoInterno] = useState<string>('');
  const [codigoExterno, setCodigoExterno] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [unidadeMedida, setUnidadeMedida] = useState<'CX' | 'UN' | 'MIL' | 'KG' | 'PC' | 'FD'>('CX');
  const [representadaId, setRepresentadaId] = useState<string>('');

  // Modelagem Caixa e Unidade
  const [quantidadePorCaixa, setQuantidadePorCaixa] = useState<number>(10000);
  const [precoCaixa, setPrecoCaixa] = useState<number>(900);
  const [precoUnidade, setPrecoUnidade] = useState<number>(0.09);
  const [precoMilheiro, setPrecoMilheiro] = useState<number>(90);

  // Impostos e peso
  const [aliquotaIpi, setAliquotaIpi] = useState<number>(5.0);
  const [pesoUnitarioKg, setPesoUnitarioKg] = useState<number>(15.0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCodigoInterno(initialData.codigoInterno || initialData.codigo || '');
        setCodigoExterno(initialData.codigo || '');
        setDescricao(initialData.descricao || '');
        setReferencia(initialData.referencia || '');
        setUnidadeMedida(initialData.unidadeMedida || 'CX');
        setRepresentadaId(initialData.representadaId || representadas[0]?.id || '');

        const qtdCx =
          initialData.quantidadePorCaixa ||
          (initialData.qtdMilheiroPorCaixa ? Math.round(initialData.qtdMilheiroPorCaixa * 1000) : 1);
        setQuantidadePorCaixa(qtdCx);

        const prCx =
          initialData.precoCaixa ||
          (initialData.unidadeMedida === 'CX' ? initialData.precoUnitario : initialData.precoUnitario * qtdCx);
        setPrecoCaixa(prCx);

        const prUn =
          initialData.precoUnidade ||
          (qtdCx > 0 ? Number((prCx / qtdCx).toFixed(4)) : initialData.precoUnitario);
        setPrecoUnidade(prUn);

        const prMil =
          initialData.precoMilheiro ||
          Number((prUn * 1000).toFixed(2));
        setPrecoMilheiro(prMil);

        setAliquotaIpi(initialData.aliquotaIpi ?? 0);
        setPesoUnitarioKg(initialData.pesoUnitarioKg ?? 0);
      } else {
        // Gera o próximo código interno sequencial sem colisão
        const nextCod = StorageService.getNextCodigoProduto();
        setCodigoInterno(nextCod);
        setCodigoExterno('');
        setDescricao('');
        setReferencia('');
        setUnidadeMedida('CX');
        setRepresentadaId(representadas[0]?.id || '');
        setQuantidadePorCaixa(10000);
        setPrecoCaixa(900);
        setPrecoUnidade(0.09);
        setPrecoMilheiro(90);
        setAliquotaIpi(5.0);
        setPesoUnitarioKg(12.0);
      }
      setError('');
    }
  }, [isOpen, initialData, representadas]);

  if (!isOpen) return null;

  // Atualização bidirecional de preços e medidas:
  // 1. Quando o usuário digita o Preço da Caixa
  const handlePrecoCaixaChange = (valorCx: number) => {
    const cx = Math.max(0, valorCx);
    setPrecoCaixa(cx);
    const qtd = Math.max(1, quantidadePorCaixa || 1);
    const un = Number((cx / qtd).toFixed(4));
    setPrecoUnidade(un);
    setPrecoMilheiro(Number((un * 1000).toFixed(2)));
  };

  // 2. Quando o usuário altera a Quantidade de Unidades na Caixa
  const handleQtdCaixaChange = (qtdNova: number) => {
    const qtd = Math.max(1, qtdNova);
    setQuantidadePorCaixa(qtd);
    if (precoCaixa > 0) {
      const un = Number((precoCaixa / qtd).toFixed(4));
      setPrecoUnidade(un);
      setPrecoMilheiro(Number((un * 1000).toFixed(2)));
    }
  };

  // 3. Quando o usuário altera o Preço por Unidade diretamente
  const handlePrecoUnidadeChange = (valorUn: number) => {
    const un = Math.max(0, valorUn);
    setPrecoUnidade(un);
    const qtd = Math.max(1, quantidadePorCaixa || 1);
    const cx = Number((un * qtd).toFixed(2));
    setPrecoCaixa(cx);
    setPrecoMilheiro(Number((un * 1000).toFixed(2)));
  };

  // 4. Quando o usuário altera o Preço por Milheiro
  const handlePrecoMilheiroChange = (valorMil: number) => {
    const mil = Math.max(0, valorMil);
    setPrecoMilheiro(mil);
    const un = Number((mil / 1000).toFixed(4));
    setPrecoUnidade(un);
    const qtd = Math.max(1, quantidadePorCaixa || 1);
    setPrecoCaixa(Number((un * qtd).toFixed(2)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setError('Por favor, informe a descrição do produto.');
      return;
    }

    const precoComercialPadrao = unidadeMedida === 'CX' ? precoCaixa : precoUnidade;

    const produtoSalvo: Produto = {
      id: initialData?.id || `prod-${Date.now()}`,
      codigoInterno,
      codigo: codigoExterno.trim() || codigoInterno,
      descricao: descricao.toUpperCase().trim(),
      referencia: referencia.toUpperCase().trim(),
      unidadeMedida,
      quantidadePorCaixa: unidadeMedida === 'CX' ? quantidadePorCaixa : 1,
      precoCaixa: unidadeMedida === 'CX' ? precoCaixa : precoComercialPadrao,
      precoUnidade,
      precoMilheiro,
      qtdMilheiroPorCaixa: quantidadePorCaixa / 1000,
      precoUnitario: precoComercialPadrao,
      aliquotaIpi: Number(aliquotaIpi) || 0,
      pesoUnitarioKg: Number(pesoUnitarioKg) || 0,
      representadaId: representadaId || representadas[0]?.id || '',
    };

    onSave(produtoSalvo);
    onClose();
  };

  return (
    <div
      id="modal-produto-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-produto-container"
        className="relative bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {initialData ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Código sequencial automático e conversão de caixa / unidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 p-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 text-red-800 font-semibold text-base border-2 border-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* IDENTIFICADORES DO PRODUTO */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* CÓDIGO INTERNO (GERADO AUTOMATICAMENTE - NÃO EDITÁVEL) */}
            <div className="sm:col-span-4">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Cód. Interno (Sistema)
              </label>
              <div className="h-12 px-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center justify-between">
                <span className="font-mono font-black text-lg text-indigo-800">
                  {codigoInterno}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-200 text-indigo-900 rounded-md">
                  Automático
                </span>
              </div>
            </div>

            {/* CÓDIGO EXTERNO / FÁBRICA / COMERCIAL */}
            <div className="sm:col-span-8">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Cód. Comercial / Fábrica / Referência Externa
              </label>
              <input
                type="text"
                value={codigoExterno}
                onChange={(e) => setCodigoExterno(e.target.value)}
                placeholder="Ex: 040112860 ou REF-88"
                className="w-full h-12 px-4 text-base font-mono font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>
          </div>

          {/* DESCRIÇÃO DO PRODUTO */}
          <div>
            <label className="block text-base font-bold text-slate-900 mb-1.5">
              Descrição do Produto <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: CUIA 1L ESPECIAL ou PA 28x60"
              className="w-full h-12 px-4 text-base font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden uppercase"
            />
          </div>

          {/* REFERÊNCIA, UNIDADE E REPRESENTADA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Referência / Modelo
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ex: CX 10 MIL ou C A"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Unidade de Venda
              </label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value as any)}
                className="w-full h-12 px-4 text-base font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              >
                <option value="CX">CX — Caixa</option>
                <option value="UN">UN — Unidade</option>
                <option value="MIL">MIL — Milheiro</option>
                <option value="KG">KG — Quilo</option>
                <option value="PC">PC — Peça</option>
                <option value="FD">FD — Fardo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Representada / Fornecedor
              </label>
              <select
                value={representadaId}
                onChange={(e) => setRepresentadaId(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden text-ellipsis"
              >
                {representadas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SEÇÃO ESPECIAL: EMBALAGEM, CAIXA E PREÇOS EQUIVALENTES */}
          <div className="p-5 bg-slate-50 border-2 border-indigo-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Valores de Caixa e Unidade (Cálculo Automático)
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                Derivação em tempo real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Quantidade de Unidades na Caixa
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidadePorCaixa}
                  onChange={(e) => handleQtdCaixaChange(parseFloat(e.target.value) || 1)}
                  placeholder="Ex: 10000"
                  className="w-full h-12 px-4 text-base font-bold font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
                />
                <span className="text-xs font-semibold text-slate-500 mt-1 block">
                  Ex: 1 caixa contém {quantidadePorCaixa.toLocaleString('pt-BR')} unidades
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Preço da Caixa (R$) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={precoCaixa}
                  onChange={(e) => handlePrecoCaixaChange(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 900.00"
                  className="w-full h-12 px-4 text-lg font-black font-mono text-indigo-900 bg-white border-2 border-indigo-400 rounded-xl focus:border-indigo-700 outline-hidden"
                />
                <span className="text-xs font-semibold text-slate-500 mt-1 block">
                  Valor comercial cobrado pela caixa
                </span>
              </div>
            </div>

            {/* PAINEL DE CONFERÊNCIA IMEDIATA DO DOUGLAS (SEM CALCULADORA) */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-r-0 sm:border-r border-slate-200 pr-0 sm:pr-4">
                <span className="text-xs font-bold text-slate-500 uppercase block">
                  PREÇO POR UNIDADE
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    R$ {precoUnidade.toFixed(4)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ unidade</span>
                </div>
                <span className="text-xs text-slate-500 block mt-1">
                  (R$ {precoCaixa.toFixed(2)} ÷ {quantidadePorCaixa.toLocaleString('pt-BR')} un.)
                </span>
              </div>

              <div className="pl-0 sm:pl-2">
                <span className="text-xs font-bold text-slate-500 uppercase block">
                  PREÇO POR 1.000 (MILHEIRO)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-indigo-700 font-mono">
                    R$ {precoMilheiro.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ milheiro</span>
                </div>
                <span className="text-xs text-slate-500 block mt-1">
                  (R$ {precoUnidade.toFixed(4)} × 1.000)
                </span>
              </div>
            </div>
          </div>

          {/* IPI E PESO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Alíquota IPI (%) <span className="text-xs text-slate-500 font-normal">(Segregado)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={aliquotaIpi}
                onChange={(e) => setAliquotaIpi(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 5.0"
                className="w-full h-12 px-4 text-base font-bold font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Peso Unitário em Kg <span className="text-xs text-slate-500 font-normal">(por caixa ou unidade)</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={pesoUnitarioKg}
                onChange={(e) => setPesoUnitarioKg(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 15.000"
                className="w-full h-12 px-4 text-base font-bold font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-700 hover:bg-indigo-800 text-white text-base font-black rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>{initialData ? 'Atualizar Produto' : 'Salvar e Adicionar ao Pedido'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
