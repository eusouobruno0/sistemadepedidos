import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Users,
  Building,
  CreditCard,
  Printer,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Pedido, Representante, Representada } from '../types';
import { formatCurrency, formatNumber, formatDateBR } from '../utils/formatters';

interface RelatoriosViewProps {
  pedidos: Pedido[];
  vendedores: Representante[];
  representadas: Representada[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  pedidos,
  vendedores,
  representadas,
}) => {
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');
  const [filtroRepresentada, setFiltroRepresentada] = useState<string>('TODOS');
  const [filtroCondicao, setFiltroCondicao] = useState<string>('TODOS');

  // Filtragem dos pedidos válidos (excluindo cancelados do faturamento)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroVendedor !== 'TODOS' && p.vendedor.id !== filtroVendedor) return false;
      if (filtroRepresentada !== 'TODOS' && p.empresaEmissora.id !== filtroRepresentada) return false;
      if (filtroCondicao !== 'TODOS' && p.condicaoPagamento !== filtroCondicao) return false;

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
  }, [pedidos, filtroVendedor, filtroRepresentada, filtroCondicao, dataInicio, dataFim]);

  // Pedidos válidos para comissão (Aprovado e Faturado)
  const pedidosAtivos = useMemo(() => {
    return pedidosFiltrados.filter((p) => p.status !== 'Cancelado');
  }, [pedidosFiltrados]);

  // Totais Gerais
  const totais = useMemo(() => {
    const totalGeral = pedidosAtivos.reduce((acc, p) => acc + (p.totalPedido || 0), 0);
    const baseItensSemIpi = pedidosAtivos.reduce((acc, p) => acc + (p.totalItens || 0), 0);
    const totalIpi = pedidosAtivos.reduce((acc, p) => acc + (p.totalIpi || 0), 0);
    const totalFrete = pedidosAtivos.reduce((acc, p) => acc + (p.frete || 0), 0);
    const cancelados = pedidosFiltrados.filter((p) => p.status === 'Cancelado').length;

    // Comissão estimada: calcula sobre cada pedido com base no representante e sua taxa sobre a base de itens (SEM IPI!)
    let totalComissao = 0;
    pedidosAtivos.forEach((p) => {
      const taxa = p.vendedor.comissaoPadrao || 5.0;
      const baseLiquida = p.totalItens || 0; // REQUISITO: IPI NUNCA ENTRA NA BASE DE COMISSÃO
      totalComissao += (baseLiquida * taxa) / 100;
    });

    return { totalGeral, baseItensSemIpi, totalIpi, totalFrete, totalComissao, cancelados };
  }, [pedidosAtivos, pedidosFiltrados]);

  // Agrupamento por Representante / Vendedor
  const relatorioPorVendedor = useMemo(() => {
    const mapa = new Map<
      string,
      {
        vendedor: Representante;
        qtdPedidos: number;
        totalItens: number;
        totalIpi: number;
        totalGeral: number;
        comissaoValor: number;
      }
    >();

    pedidosAtivos.forEach((p) => {
      const vId = p.vendedor.id;
      if (!mapa.has(vId)) {
        mapa.set(vId, {
          vendedor: p.vendedor,
          qtdPedidos: 0,
          totalItens: 0,
          totalIpi: 0,
          totalGeral: 0,
          comissaoValor: 0,
        });
      }
      const item = mapa.get(vId)!;
      item.qtdPedidos += 1;
      item.totalItens += p.totalItens;
      item.totalIpi += p.totalIpi;
      item.totalGeral += p.totalPedido;
      const taxa = p.vendedor.comissaoPadrao || 5.0;
      item.comissaoValor += (p.totalItens * taxa) / 100;
    });

    return Array.from(mapa.values());
  }, [pedidosAtivos]);

  // Agrupamento por Forma de Pagamento / Boleto
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

    pedidosAtivos.forEach((p) => {
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
  }, [pedidosAtivos]);

  // Agrupamento por Representada
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

    pedidosAtivos.forEach((p) => {
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
  }, [pedidosAtivos]);

  return (
    <div className="space-y-6">
      {/* Alerta de Regra de Negócio: IPI Isolado */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Regra de Fechamento Comercial:</strong> O IPI é mantido em
          coluna própria segregada e <u>nunca entra</u> na base de cálculo da comissão dos
          representantes. Os relatórios abaixo podem ser visualizados por Vendedor, Representada ou
          Forma de Pagamento (Boleto).
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              Forma / Boleto
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

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Total Faturado Geral
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {formatCurrency(totais.totalGeral)}
          </div>
          <div className="text-2xs text-slate-400 mt-1">
            {pedidosAtivos.length} pedidos ativos • {totais.cancelados} cancelados
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-xs">
          <div className="text-2xs font-bold text-emerald-800 uppercase tracking-wider">
            Base Líquida (Produtos)
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-2">
            {formatCurrency(totais.baseItensSemIpi)}
          </div>
          <div className="text-2xs text-emerald-600 font-semibold mt-1">
            Base oficial de cálculo das comissões
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-xs">
          <div className="text-2xs font-bold text-blue-800 uppercase tracking-wider flex items-center justify-between">
            <span>Total IPI Segregado</span>
            <span className="text-3xs bg-blue-200 text-blue-800 px-1 rounded">Isolado</span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-800 mt-2">
            {formatCurrency(totais.totalIpi)}
          </div>
          <div className="text-2xs text-blue-600 mt-1">Fora da base de comissão</div>
        </div>

        <div className="bg-white rounded-2xl border border-purple-200 bg-purple-50/20 p-4 shadow-xs">
          <div className="text-2xs font-bold text-purple-800 uppercase tracking-wider">
            Comissão Total Estimada
          </div>
          <div className="text-2xl font-bold font-mono text-purple-800 mt-2">
            {formatCurrency(totais.totalComissao)}
          </div>
          <div className="text-2xs text-purple-600 mt-1">Calculada sobre itens líquidos</div>
        </div>
      </div>

      {/* 1. RELATÓRIO POR VENDEDOR E COMISSÃO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Desempenho por Representante & Comissões
            </h3>
            <p className="text-2xs text-slate-500">
              IPI exibido em coluna separada e excluído da comissão
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4">Representante</th>
                <th className="py-2.5 px-3 text-center">Qtd. Pedidos</th>
                <th className="py-2.5 px-4 text-right">Base Itens (Sem IPI)</th>
                <th className="py-2.5 px-4 text-right text-blue-700">Total IPI</th>
                <th className="py-2.5 px-4 text-right">Faturamento Geral</th>
                <th className="py-2.5 px-3 text-center">% Comis.</th>
                <th className="py-2.5 px-4 text-right text-purple-700">Valor Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {relatorioPorVendedor.map((item) => (
                <tr key={item.vendedor.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{item.vendedor.nome}</td>
                  <td className="py-2.5 px-3 text-center font-bold font-mono">
                    {item.qtdPedidos}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                    {formatCurrency(item.totalItens)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-blue-700 bg-blue-50/30">
                    {formatCurrency(item.totalIpi)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                    {formatCurrency(item.totalGeral)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                    {item.vendedor.comissaoPadrao}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-black text-purple-800 bg-purple-50/30">
                    {formatCurrency(item.comissaoValor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. RELATÓRIO POR FORMA DE PAGAMENTO / BOLETO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Boletos / Formas de Pagamento */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Separação por Forma de Pagamento / Boleto
            </h3>
            <p className="text-2xs text-slate-500">Agrupado por condição de faturamento</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Condição / Boleto</th>
                  <th className="py-2.5 px-3 text-center">Pedidos</th>
                  <th className="py-2.5 px-4 text-right text-blue-700">IPI</th>
                  <th className="py-2.5 px-4 text-right">Total Faturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relatorioPorCondicao.map((c) => (
                  <tr key={c.condicao} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-slate-900 uppercase font-mono">
                      {c.condicao}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{c.qtdPedidos}</td>
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
              Vendas por Representada / Distribuidora
            </h3>
            <p className="text-2xs text-slate-500">Divisão do volume por marca</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Representada</th>
                  <th className="py-2.5 px-3 text-center">Pedidos</th>
                  <th className="py-2.5 px-4 text-right text-blue-700">IPI</th>
                  <th className="py-2.5 px-4 text-right">Total Faturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relatorioPorRepresentada.map((r) => (
                  <tr key={r.nome} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.nome}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{r.qtdPedidos}</td>
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
    </div>
  );
};
