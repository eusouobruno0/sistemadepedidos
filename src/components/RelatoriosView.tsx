import React, { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  Calendar,
  Users,
  Building,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Pedido, Representante, Representada, TipoDocumento } from '../types';
import { formatCurrency, formatNumber, formatDateBR } from '../utils/formatters';
import { PedidosList } from './PedidosList';

interface RelatoriosViewProps {
  pedidos: Pedido[];
  pedidosLixeira?: Pedido[];
  vendedores: Representante[];
  representadas: Representada[];
  onNovoPedido: (tipo: TipoDocumento) => void;
  onVisualizar: (pedido: Pedido) => void;
  onEditar: (pedido: Pedido) => void;
  onDuplicar: (pedido: Pedido) => void;
  onExcluir: (id: string) => void;
  onCancelar?: (id: string) => void;
  onToggleSituacaoComercial?: (id: string) => void;
  onRestaurarPedido?: (id: string) => void;
  onEsvaziarLixeira?: () => void;
  onExcluirDefinitivoLixeira?: (id: string) => void;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  pedidos,
  pedidosLixeira = [],
  vendedores,
  representadas,
  onNovoPedido,
  onVisualizar,
  onEditar,
  onDuplicar,
  onExcluir,
  onCancelar,
  onToggleSituacaoComercial,
  onRestaurarPedido,
  onEsvaziarLixeira,
  onExcluirDefinitivoLixeira,
}) => {
  // Sub-abas internas para organização limpa e desktop-first
  const [subAba, setSubAba] = useState<'pedidos' | 'visaoGeral' | 'comissoes' | 'marcas'>(
    'pedidos'
  );

  // Filtros de análise
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');
  const [filtroRepresentada, setFiltroRepresentada] = useState<string>('TODOS');
  const [filtroCondicao, setFiltroCondicao] = useState<string>('TODOS');
  const [filtroSituacaoComercial, setFiltroSituacaoComercial] = useState<string>('TODOS');

  // Filtragem dos pedidos no escopo do relatório
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroVendedor !== 'TODOS' && p.vendedor.id !== filtroVendedor) return false;
      if (filtroRepresentada !== 'TODOS' && p.empresaEmissora.id !== filtroRepresentada) return false;
      if (filtroCondicao !== 'TODOS' && p.condicaoPagamento !== filtroCondicao) return false;
      if (filtroSituacaoComercial !== 'TODOS' && p.situacaoComercial !== filtroSituacaoComercial)
        return false;

      if (dataInicio) {
        const dataPed = p.dataCadastro.split('T')[0];
        if (dataPed < dataInicio) return false;
      }
      if (dataFim) {
        const dataPed = p.dataCadastro.split('T')[0];
        if (dataPed > dataFim) return false;
      }

      return true;
    });
  }, [
    pedidos,
    filtroVendedor,
    filtroRepresentada,
    filtroCondicao,
    filtroSituacaoComercial,
    dataInicio,
    dataFim,
  ]);

  // VENDAS EFETIVAS: Apenas pedidos FECHADOS e NÃO cancelados
  const pedidosFechadosEfetivos = useMemo(() => {
    return pedidosFiltrados.filter(
      (p) => p.situacaoComercial === 'Fechado' && p.status !== 'Cancelado'
    );
  }, [pedidosFiltrados]);

  // PROPOSTAS EM NEGOCIAÇÃO: Pedidos com situação comercial ENVIADO (pipeline)
  const pedidosEnviadosPipeline = useMemo(() => {
    return pedidosFiltrados.filter((p) => p.situacaoComercial === 'Enviado');
  }, [pedidosFiltrados]);

  // CANCELADOS: Separados e nunca somados como venda efetivada
  const pedidosCancelados = useMemo(() => {
    return pedidosFiltrados.filter((p) => p.status === 'Cancelado');
  }, [pedidosFiltrados]);

  // Totais Gerais
  const totais = useMemo(() => {
    // Venda Efetiva (Fechados)
    const totalFechadoGeral = pedidosFechadosEfetivos.reduce((acc, p) => acc + (p.totalPedido || 0), 0);
    const baseItensFechados = pedidosFechadosEfetivos.reduce((acc, p) => acc + (p.totalItens || 0), 0);
    const totalIpiFechado = pedidosFechadosEfetivos.reduce((acc, p) => acc + (p.totalIpi || 0), 0);

    // Em Negociação (Enviados)
    const totalEnviadoGeral = pedidosEnviadosPipeline.reduce((acc, p) => acc + (p.totalPedido || 0), 0);
    const totalItensEnviados = pedidosEnviadosPipeline.reduce((acc, p) => acc + (p.totalItens || 0), 0);

    // Cancelados
    const totalCancelado = pedidosCancelados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);

    // Comissão sobre Vendas Efetivas (Fechados, Sem IPI)
    let totalComissao = 0;
    pedidosFechadosEfetivos.forEach((p) => {
      const taxa = p.vendedor.comissaoPadrao || 5.0;
      const baseLiquida = p.totalItens || 0; // Regra: IPI NUNCA entra na base de comissão
      totalComissao += (baseLiquida * taxa) / 100;
    });

    return {
      totalFechadoGeral,
      baseItensFechados,
      totalIpiFechado,
      totalEnviadoGeral,
      totalItensEnviados,
      totalCancelado,
      totalComissao,
      qtdFechados: pedidosFechadosEfetivos.length,
      qtdEnviados: pedidosEnviadosPipeline.length,
      qtdCancelados: pedidosCancelados.length,
    };
  }, [pedidosFechadosEfetivos, pedidosEnviadosPipeline, pedidosCancelados]);

  // Agrupamento por Vendedor (baseado estritamente em pedidos Fechados)
  const relatorioPorVendedor = useMemo(() => {
    const mapa = new Map<
      string,
      {
        vendedor: Representante;
        qtdFechados: number;
        qtdEnviados: number;
        totalItens: number;
        totalIpi: number;
        totalGeral: number;
        comissaoValor: number;
      }
    >();

    // Inicializa todos os vendedores
    vendedores.forEach((v) => {
      mapa.set(v.id, {
        vendedor: v,
        qtdFechados: 0,
        qtdEnviados: 0,
        totalItens: 0,
        totalIpi: 0,
        totalGeral: 0,
        comissaoValor: 0,
      });
    });

    // Soma vendas efetivas
    pedidosFechadosEfetivos.forEach((p) => {
      const vId = p.vendedor.id;
      if (!mapa.has(vId)) {
        mapa.set(vId, {
          vendedor: p.vendedor,
          qtdFechados: 0,
          qtdEnviados: 0,
          totalItens: 0,
          totalIpi: 0,
          totalGeral: 0,
          comissaoValor: 0,
        });
      }
      const item = mapa.get(vId)!;
      item.qtdFechados += 1;
      item.totalItens += p.totalItens;
      item.totalIpi += p.totalIpi;
      item.totalGeral += p.totalPedido;
      const taxa = p.vendedor.comissaoPadrao || 5.0;
      item.comissaoValor += (p.totalItens * taxa) / 100;
    });

    // Contabiliza propostas enviadas
    pedidosEnviadosPipeline.forEach((p) => {
      const vId = p.vendedor.id;
      if (mapa.has(vId)) {
        mapa.get(vId)!.qtdEnviados += 1;
      }
    });

    return Array.from(mapa.values()).filter((item) => item.qtdFechados > 0 || item.qtdEnviados > 0);
  }, [vendedores, pedidosFechadosEfetivos, pedidosEnviadosPipeline]);

  // Agrupamento por Condição de Pagamento (Fechados)
  const relatorioPorCondicao = useMemo(() => {
    const mapa = new Map<
      string,
      {
        condicao: string;
        qtdPedidos: number;
        totalItens: number;
        totalIpi: number;
        totalGeral: number;
      }
    >();

    pedidosFechadosEfetivos.forEach((p) => {
      const cond = p.condicaoPagamento || 'Outros';
      if (!mapa.has(cond)) {
        mapa.set(cond, {
          condicao: cond,
          qtdPedidos: 0,
          totalItens: 0,
          totalIpi: 0,
          totalGeral: 0,
        });
      }
      const item = mapa.get(cond)!;
      item.qtdPedidos += 1;
      item.totalItens += p.totalItens;
      item.totalIpi += p.totalIpi;
      item.totalGeral += p.totalPedido;
    });

    return Array.from(mapa.values());
  }, [pedidosFechadosEfetivos]);

  // Agrupamento por Representada (Fechados)
  const relatorioPorRepresentada = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nome: string;
        qtdPedidos: number;
        totalItens: number;
        totalIpi: number;
        totalGeral: number;
      }
    >();

    pedidosFechadosEfetivos.forEach((p) => {
      const nome = p.empresaEmissora.nome || 'Não definida';
      if (!mapa.has(nome)) {
        mapa.set(nome, {
          nome,
          qtdPedidos: 0,
          totalItens: 0,
          totalIpi: 0,
          totalGeral: 0,
        });
      }
      const item = mapa.get(nome)!;
      item.qtdPedidos += 1;
      item.totalItens += p.totalItens;
      item.totalIpi += p.totalIpi;
      item.totalGeral += p.totalPedido;
    });

    return Array.from(mapa.values());
  }, [pedidosFechadosEfetivos]);

  return (
    <div className="space-y-6">
      {/* NAVEGAÇÃO DE SUB-ABAS INTERNAS EM RELATÓRIOS (MOBILE & DESKTOP) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <button
            type="button"
            id="subtab-pedidos"
            onClick={() => setSubAba('pedidos')}
            className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
              subAba === 'pedidos'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Histórico ({pedidos.length})</span>
          </button>

          <button
            type="button"
            id="subtab-visao-geral"
            onClick={() => setSubAba('visaoGeral')}
            className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
              subAba === 'visaoGeral'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            id="subtab-comissoes"
            onClick={() => setSubAba('comissoes')}
            className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
              subAba === 'comissoes'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Comissões</span>
          </button>

          <button
            type="button"
            id="subtab-marcas"
            onClick={() => setSubAba('marcas')}
            className={`shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
              subAba === 'marcas'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Marcas & Condições</span>
          </button>
        </div>

        {/* Resumo Rápido no Header */}
        <div className="hidden md:flex items-center gap-3 text-xs pr-2 font-mono">
          <span className="text-emerald-700 font-bold">
            Fechados: {formatCurrency(totais.totalFechadoGeral)}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-amber-700 font-semibold">
            Enviados: {formatCurrency(totais.totalEnviadoGeral)}
          </span>
        </div>
      </div>

      {/* 1. SUB-ABA: HISTÓRICO DE PEDIDOS (INCORPORADA) */}
      {subAba === 'pedidos' && (
        <PedidosList
          pedidos={pedidos}
          pedidosLixeira={pedidosLixeira}
          vendedores={vendedores}
          onNovoPedido={onNovoPedido}
          onVisualizar={onVisualizar}
          onEditar={onEditar}
          onDuplicar={onDuplicar}
          onExcluir={onExcluir}
          onCancelar={onCancelar}
          onToggleSituacaoComercial={onToggleSituacaoComercial}
          onRestaurarPedido={onRestaurarPedido}
          onEsvaziarLixeira={onEsvaziarLixeira}
          onExcluirDefinitivoLixeira={onExcluirDefinitivoLixeira}
        />
      )}

      {/* 2. SUB-ABA: VISÃO GERAL & FATURAMENTO */}
      {subAba === 'visaoGeral' && (
        <div className="space-y-6">
          {/* Alerta de Regra Comercial */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Critério de Venda Efetiva:</strong> Apenas pedidos com
              situação comercial <span className="font-bold uppercase text-emerald-800">Fechado</span> e
              status diferente de Cancelado compõem o faturamento efetivo e as comissões. Pedidos com
              situação <span className="font-bold uppercase text-amber-800">Enviado</span> são propostas
              em acompanhamento e exibidos separadamente.
            </div>
          </div>

          {/* Barra de Filtros Analíticos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Situação Comercial
                </label>
                <select
                  value={filtroSituacaoComercial}
                  onChange={(e) => setFiltroSituacaoComercial(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none"
                >
                  <option value="TODOS">Todas as Situações</option>
                  <option value="Enviado">Apenas Enviados</option>
                  <option value="Fechado">Apenas Fechados</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Representante
                </label>
                <select
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="TODOS">Todos os Vendedores</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Representada / Marca
                </label>
                <select
                  value={filtroRepresentada}
                  onChange={(e) => setFiltroRepresentada(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="TODOS">Todas as Representadas</option>
                  {representadas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
                  Forma / Condição
                </label>
                <select
                  value={filtroCondicao}
                  onChange={(e) => setFiltroCondicao(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="TODOS">Todas as Condições</option>
                  {relatorioPorCondicao.map((c) => (
                    <option key={c.condicao} value={c.condicao}>
                      {c.condicao}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards de Indicadores Destacados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vendas Fechadas */}
            <div className="bg-white rounded-2xl border-2 border-emerald-300 bg-emerald-50/20 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Venda Efetiva (Fechados)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-2">
                {formatCurrency(totais.totalFechadoGeral)}
              </div>
              <div className="text-xs text-emerald-600 mt-1 font-semibold">
                {totais.qtdFechados} pedidos fechados
              </div>
            </div>

            {/* Propostas Enviadas (Pipeline) */}
            <div className="bg-white rounded-2xl border-2 border-amber-300 bg-amber-50/20 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Em Negociação (Enviados)
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-700 mt-2">
                {formatCurrency(totais.totalEnviadoGeral)}
              </div>
              <div className="text-xs text-amber-600 mt-1 font-semibold">
                {totais.qtdEnviados} propostas no funil
              </div>
            </div>

            {/* Base Líquida (Produtos) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Base Líquida (Itens Fechados)
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {formatCurrency(totais.baseItensFechados)}
              </div>
              <div className="text-2xs text-slate-400 mt-1">Base oficial de comissões</div>
            </div>

            {/* IPI Segregado */}
            <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  IPI Segregado (Fechados)
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-blue-800 mt-2">
                {formatCurrency(totais.totalIpiFechado)}
              </div>
              <div className="text-2xs text-blue-600 mt-1">Fora da comissão</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-ABA: COMISSÕES */}
      {subAba === 'comissoes' && (
        <div className="space-y-5">
          {/* Filtros rápidos de comissão */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">Data início</label>
                  <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">Data fim</label>
                  <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">Vendedor</label>
                  <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="TODOS">Todos os vendedores</option>
                    {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => { setDataInicio(''); setDataFim(''); setFiltroVendedor('TODOS'); }} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpar filtros</button>
            </div>
          </div>

          {/* Comissão potencial dos pedidos enviados */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-2xs font-bold text-amber-700 uppercase tracking-wider">Comissão potencial</div>
              <div className="text-xs text-amber-800 mt-1">Valor estimado se os pedidos enviados forem fechados.</div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-800">
              {formatCurrency(pedidosEnviadosPipeline.reduce((acc, p) => acc + ((p.totalItens || 0) * (p.vendedor?.comissaoPadrao || 5) / 100), 0))}
            </div>
          </div>

          {/* Resumo geral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Pedidos com comissão</div>
              <div className="text-3xl font-black text-slate-900 mt-2">{totais.qtdFechados}</div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs">
              <div className="text-2xs font-bold text-emerald-700 uppercase tracking-wider">Base de comissão · sem IPI</div>
              <div className="text-2xl font-black font-mono text-emerald-800 mt-2">{formatCurrency(totais.baseItensFechados)}</div>
            </div>
            <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-5 shadow-xs">
              <div className="text-2xs font-bold text-purple-700 uppercase tracking-wider">Comissão total</div>
              <div className="text-3xl font-black font-mono text-purple-800 mt-2">{formatCurrency(totais.totalComissao)}</div>
            </div>
          </div>

          {/* Vendedores em destaque */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-black text-slate-900">Comissão por vendedor</h3>
                <p className="text-xs text-slate-500">Clique em um vendedor para ver somente os pedidos dele.</p>
              </div>
              {filtroVendedor !== 'TODOS' && <button type="button" onClick={() => setFiltroVendedor('TODOS')} className="text-xs font-bold text-indigo-700">Ver todos</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {relatorioPorVendedor.map((item) => (
                <button key={item.vendedor.id} type="button" onClick={() => setFiltroVendedor(item.vendedor.id)} className={`text-left rounded-2xl border-2 p-5 transition-all hover:shadow-md ${filtroVendedor === item.vendedor.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-slate-900">{item.vendedor.nome}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.qtdFechados} pedidos fechados · {item.vendedor.comissaoPadrao || 5}%</div>
                    </div>
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div><div className="text-2xs uppercase font-bold text-slate-400">Base</div><div className="font-bold font-mono text-slate-800 mt-1">{formatCurrency(item.totalItens)}</div></div>
                    <div><div className="text-2xs uppercase font-bold text-purple-600">Comissão</div><div className="font-black font-mono text-purple-800 mt-1">{formatCurrency(item.comissaoValor)}</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detalhamento pedido por pedido */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="font-black text-sm text-slate-900">Comissão por pedido</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pedidos fechados mostram comissão efetiva; enviados mostram comissão potencial.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead><tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Pedido</th><th className="py-3 px-4">Data</th><th className="py-3 px-4">Cliente</th><th className="py-3 px-4">Vendedor</th><th className="py-3 px-4 text-right">Base sem IPI</th><th className="py-3 px-3 text-center">%</th><th className="py-3 px-4 text-right text-purple-700">Comissão</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {[...pedidosFechadosEfetivos, ...pedidosEnviadosPipeline].map((p) => {
                    const taxa = p.vendedor.comissaoPadrao || 5;
                    const comissao = (p.totalItens || 0) * taxa / 100;
                    return <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-black font-mono text-indigo-700">{p.numero || 'RASCUNHO'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDateBR(p.dataCadastro)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.cliente?.razaoSocial || p.cliente?.nomeFantasia || 'Cliente não identificado'}</td>
                      <td className="py-3 px-4">{p.vendedor.nome}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{formatCurrency(p.totalItens || 0)}</td>
                      <td className="py-3 px-3 text-center font-mono">{taxa}%</td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${p.situacaoComercial === 'Fechado' ? 'text-purple-800' : 'text-amber-700'}`}><div>{formatCurrency(comissao)}</div><div className="text-[10px] font-sans font-bold uppercase">{p.situacaoComercial === 'Fechado' ? 'Efetiva' : 'Potencial'}</div></td>
                    </tr>;
                  })}
                  {pedidosFechadosEfetivos.length === 0 && pedidosEnviadosPipeline.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-400">Nenhum pedido encontrado neste período.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-ABA: MARCAS & CONDIÇÕES */}
      {subAba === 'marcas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Condição / Forma de Pagamento */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Vendas Fechadas por Condição de Pagamento
              </h3>
              <p className="text-2xs text-slate-500">Agrupado por prazo e boleto</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">Condição</th>
                    <th className="py-2.5 px-3 text-center">Pedidos</th>
                    <th className="py-2.5 px-4 text-right text-blue-700">IPI</th>
                    <th className="py-2.5 px-4 text-right">Total Fechado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatorioPorCondicao.map((c) => (
                    <tr key={c.condicao} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                        {c.condicao}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {c.qtdPedidos}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                        {formatCurrency(c.totalIpi)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(c.totalGeral)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por Representada */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Vendas Fechadas por Representada / Marca
              </h3>
              <p className="text-2xs text-slate-500">Volume consolidado por indústria emissora</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">Representada</th>
                    <th className="py-2.5 px-3 text-center">Pedidos</th>
                    <th className="py-2.5 px-4 text-right text-blue-700">IPI</th>
                    <th className="py-2.5 px-4 text-right">Total Fechado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relatorioPorRepresentada.map((r) => (
                    <tr key={r.nome} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.nome}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {r.qtdPedidos}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                        {formatCurrency(r.totalIpi)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(r.totalGeral)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
