import React, { useState, useEffect } from 'react';
import { X, Package, Check, Layers } from 'lucide-react';
import { Produto, Representada } from '../../types';
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

  // Modelagem Caixa e Unidade (Fonte única: precoMilheiro)
  const [quantidadePorCaixa, setQuantidadePorCaixa] = useState<number>(1000);
  const [precoCaixa, setPrecoCaixa] = useState<number>(90);
  const [precoUnidade, setPrecoUnidade] = useState<number>(0.09);
  const [precoMilheiro, setPrecoMilheiro] = useState<number>(90);

  // Impostos e peso
  const [aliquotaIpi, setAliquotaIpi] = useState<number>(0);
  const [pesoUnitarioKg, setPesoUnitarioKg] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCodigoInterno(initialData.codigoInterno || '');
        setCodigoExterno(initialData.codigo || '');
        setDescricao(initialData.descricao || '');
        setReferencia(initialData.referencia || '');
        setUnidadeMedida(initialData.unidadeMedida || 'CX');
        setRepresentadaId(initialData.representadaId || representadas[0]?.id || '');

        const qtdCx = initialData.quantidadePorCaixa || 1000;
        setQuantidadePorCaixa(qtdCx);

        const prMil = initialData.precoMilheiro || 0;
        setPrecoMilheiro(prMil);
        setPrecoUnidade(Number((prMil / 1000).toFixed(4)));
        setPrecoCaixa(Number(((prMil * qtdCx) / 1000).toFixed(2)));

        setAliquotaIpi(initialData.aliquotaIpi || 0);
        setPesoUnitarioKg(initialData.pesoUnitarioKg || 0);
      } else {
        setCodigoInterno('');
        setCodigoExterno('');
        setDescricao('');
        setReferencia('');
        setUnidadeMedida('CX');
        setRepresentadaId(representadas[0]?.id || '');
        setQuantidadePorCaixa(1000);
        setPrecoMilheiro(90);
        setPrecoUnidade(0.09);
        setPrecoCaixa(90);
        setAliquotaIpi(0);
        setPesoUnitarioKg(0);
      }
      setError('');
    }
  }, [isOpen, initialData, representadas]);

  if (!isOpen) return null;

  // 1. Quando o usuário altera o Preço do Milheiro (FONTE DE VERDADE)
  const handlePrecoMilheiroChange = (valorMilheiro: number) => {
    const mil = Math.max(0, valorMilheiro);
    setPrecoMilheiro(mil);
    const un = Number((mil / 1000).toFixed(4));
    setPrecoUnidade(un);
    const qtd = Math.max(1, quantidadePorCaixa || 1);
    setPrecoCaixa(Number(((mil * qtd) / 1000).toFixed(2)));
  };

  // 2. Quando altera a Quantidade por Caixa
  const handleQtdCaixaChange = (qtd: number) => {
    const q = Math.max(1, qtd);
    setQuantidadePorCaixa(q);
    if (precoMilheiro > 0) {
      setPrecoCaixa(Number(((precoMilheiro * q) / 1000).toFixed(2)));
    }
  };

  // 3. Ajuste direto do Preço da Caixa
  const handlePrecoCaixaChange = (valorCx: number) => {
    const cx = Math.max(0, valorCx);
    setPrecoCaixa(cx);
    const qtd = Math.max(1, quantidadePorCaixa || 1);
    const un = Number((cx / qtd).toFixed(4));
    setPrecoUnidade(un);
    setPrecoMilheiro(Number((un * 1000).toFixed(2)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setError('Por favor, informe a descrição do produto.');
      return;
    }

    if (!representadaId) {
      setError('Selecione a empresa representada do produto.');
      return;
    }

    const produtoSalvo: Produto = {
      id: initialData?.id || '',
      codigoInterno: initialData?.codigoInterno || '', // Gerado pelo banco (000001)
      codigo: codigoExterno.trim() || initialData?.codigoInterno || 'PROD',
      descricao: descricao.toUpperCase().trim(),
      referencia: referencia.toUpperCase().trim(),
      unidadeMedida,
      quantidadePorCaixa: unidadeMedida === 'CX' ? quantidadePorCaixa : 1,
      precoMilheiro,
      precoCaixa,
      precoUnidade,
      precoUnitario: unidadeMedida === 'CX' ? precoCaixa : precoUnidade,
      aliquotaIpi: Number(aliquotaIpi) || 0,
      pesoUnitarioKg: Number(pesoUnitarioKg) || 0,
      representadaId,
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
                {initialData?.codigoInterno ? `Código interno ${initialData.codigoInterno}` : 'Código gerado automaticamente pelo banco'}
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

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Empresa Representada *
              </label>
              <select
                required
                value={representadaId}
                onChange={(e) => setRepresentadaId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
              >
                {representadas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código de Fábrica / Referência Externa
              </label>
              <input
                type="text"
                value={codigoExterno}
                onChange={(e) => setCodigoExterno(e.target.value)}
                placeholder="Ex: CAT-1020"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descrição do Produto *
              </label>
              <input
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: PARAFUSO AUTO BROCANTE 4,2 X 19"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Referência / Medida
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ex: 4,2x19"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 uppercase"
              />
            </div>
          </div>

          {/* Precificação: Fonte é o milheiro */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Layers className="w-4 h-4" />
              <span>Precificação Comercial (Fonte: Preço do Milheiro)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unidade de Medida
                </label>
                <select
                  value={unidadeMedida}
                  onChange={(e) => setUnidadeMedida(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="CX">CX (Caixa)</option>
                  <option value="UN">UN (Unidade)</option>
                  <option value="MIL">MIL (Milheiro)</option>
                  <option value="KG">KG (Quilograma)</option>
                  <option value="PC">PC (Pacote)</option>
                  <option value="FD">FD (Fardo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Qtd por Caixa (unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidadePorCaixa}
                  onChange={(e) => handleQtdCaixaChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Preço do Milheiro (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={precoMilheiro}
                  onChange={(e) => handlePrecoMilheiroChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-indigo-50 border-2 border-indigo-400 rounded-xl font-black text-indigo-900 text-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Preço derivado da unidade:</span>
                <span className="text-base font-bold text-slate-800">
                  {formatCurrency(precoUnidade, 4)} / unidade
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Preço da caixa cheia:</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCaixa}
                    onChange={(e) => handlePrecoCaixaChange(Number(e.target.value))}
                    className="w-32 px-2.5 py-1 text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500 font-medium">({quantidadePorCaixa} un)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alíquota de IPI (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={aliquotaIpi}
                onChange={(e) => setAliquotaIpi(Number(e.target.value))}
                placeholder="Ex: 5.0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Peso Unitário Estimado (kg)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={pesoUnitarioKg}
                onChange={(e) => setPesoUnitarioKg(Number(e.target.value))}
                placeholder="Ex: 12.500"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
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
              <span>Salvar Produto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
