import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Printer,
  Edit2,
  Copy,
  Trash2,
  FileText,
  DollarSign,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRightLeft,
  Calendar,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Pedido, TipoDocumento, Representante } from '../types';
import { formatCurrency, formatNumber, formatDateBR } from '../utils/formatters';

interface PedidosListProps {
  pedidos: Pedido[];
  pedidosLixeira?: Pedido[];
  vendedores: Representante[];
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

export const PedidosList: React.FC<PedidosListProps> = ({
  pedidos,
  pedidosLixeira = [],
  vendedores,
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
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('TODOS');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');

  // Modo de visualização: Pedidos Ativos vs Lixeira
  const [modoVisualizacao, setModoVisualizacao] = useState<'ativos' | 'lixeira'>('ativos');
  const [confirmEsvaziar, setConfirmEsvaziar] = useState(false);
  const [pedidoDefinitivoId, setPedidoDefinitivoId] = useState<string | null>(null);

  // Filtragem completa dependendo do modo
  const pedidosFiltrados = useMemo(() => {
    const listaBase = modoVisualizacao === 'lixeira' ? pedidosLixeira : pedidos;

    return listaBase.filter((p) => {
      if (modoVisualizacao === 'ativos') {
        if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false;
        if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
        if (filtroSituacao !== 'TODOS' && p.situacaoComercial !== filtroSituacao) return false;
        if (filtroVendedor !== 'TODOS' && p.vendedor?.id !== filtroVendedor) return false;
      }

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase().trim();
      const termoDigitos = termo.replace(/\D/g, '');

      // 1. Número do pedido do sistema
      const matchNumero =
        p.numero?.toLowerCase().includes(termo) ||
        (termoDigitos.length > 0 && p.numeroSequencial?.toString() === termoDigitos) ||
        (termoDigitos.length > 0 && p.numero?.replace(/\D/g, '').endsWith(termoDigitos));

      // 2. Cliente
      const matchCliente =
        p.cliente?.razaoSocial?.toLowerCase().includes(termo) ||
        p.cliente?.cnpjCpf?.includes(termo) ||
        p.cliente?.cidade?.toLowerCase().includes(termo) ||
        p.cliente?.codigo?.includes(termo);

      // 3. Vendedor
      const matchVendedor = p.vendedor?.nome?.toLowerCase().includes(termo);

      // 4. Ordem de Compra do Cliente
      const matchOC =
        (p.ordemCompraCliente && p.ordemCompraCliente.toLowerCase().includes(termo)) ||
        (p.numeroPedidoCliente && p.numeroPedidoCliente.toLowerCase().includes(termo));

      // 5. Nº Pedido da Indústria
      const matchPedidoIndustria =
        p.numeroPedidoIndustria && p.numeroPedidoIndustria.toLowerCase().includes(termo);

      // 6. Itens
      const matchItens = p.itens?.some(
        (it) =>
          it.descricao?.toLowerCase().includes(termo) ||
          it.codigo?.toLowerCase().includes(termo) ||
          it.codigoInterno?.includes(termo)
      );

      return matchNumero || matchCliente || matchVendedor || matchOC || matchPedidoIndustria || matchItens;
    });
  }, [pedidos, pedidosLixeira, modoVisualizacao, busca, filtroTipo, filtroStatus, filtroSituacao, filtroVendedor]);

  // Resumo analítico com segregação comercial de Enviados x Fechados (somente para pedidos ativos)
  const resumo = useMemo(() => {
    const pedidosFechados = pedidos.filter(
      (p) => p.situacaoComercial === 'Fechado' && p.status !== 'Cancelado'
    );
    const totalFechado = pedidosFechados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);

    const pedidosEnviados = pedidos.filter((p) => p.situacaoComercial === 'Enviado');
    const totalEnviado = pedidosEnviados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);

    const totalIpi = pedidos.reduce((acc, p) => acc + (p.totalIpi || 0), 0);

    return {
      qtdTotal: pedidos.length,
      qtdFechados: pedidosFechados.length,
      totalFechado,
      qtdEnviados: pedidosEnviados.length,
      totalEnviado,
      totalIpi,
    };
  }, [pedidos]);

  return (
    <div className="space-y-6">
      {/* Top Banner de Resumo com Separação Enviados x Fechados (Apenas em Pedidos Ativos) */}
      {modoVisualizacao === 'ativos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total na Listagem */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total de Pedidos
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {resumo.qtdTotal}
            </div>
            <div className="mt-1 text-2xs text-slate-400">
              {resumo.qtdFechados} fechados | {resumo.qtdEnviados} enviados
            </div>
          </div>

          {/* Vendas Fechadas */}
          <div className="bg-white rounded-2xl border-2 border-emerald-300 bg-emerald-50/20 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Vendas Fechadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black font-mono text-emerald-900">
              {formatCurrency(resumo.totalFechado)}
            </div>
            <div className="mt-1 text-2xs text-emerald-700 font-semibold">
              Critério oficial: Fechado (Venda Efetiva)
            </div>
          </div>

          {/* Propostas Enviadas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Propostas Enviadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-800">
              {formatCurrency(resumo.totalEnviado)}
            </div>
            <div className="mt-1 text-2xs text-amber-600 font-medium">
              Pipeline em negociação comercial
            </div>
          </div>

          {/* Total IPI Destacado */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total IPI Destacado
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-blue-800">
              {formatCurrency(resumo.totalIpi)}
            </div>
            <div className="mt-1 text-2xs text-blue-600 font-medium">
              Imposto destacado fora da base de comissão
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Alternador Pedidos Ativos vs Lixeira */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModoVisualizacao('ativos')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modoVisualizacao === 'ativos'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pedidos Ativos ({pedidos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('lixeira')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modoVisualizacao === 'lixeira'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Lixeira</span>
              {pedidosLixeira.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-2xs font-black ${
                    modoVisualizacao === 'lixeira'
                      ? 'bg-white text-red-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {pedidosLixeira.length}
                </span>
              )}
            </button>
          </div>

          {modoVisualizacao === 'lixeira' && pedidosLixeira.length > 0 && onEsvaziarLixeira && (
            <button
              type="button"
              onClick={() => setConfirmEsvaziar(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Esvaziar Lixeira</span>
            </button>
          )}
        </div>

        {/* Banner Informativo da Lixeira */}
        {modoVisualizacao === 'lixeira' && (
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-xs text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Lixeira:</strong> Pedidos excluídos ficam guardados aqui. Você pode <strong>restaurar</strong> qualquer pedido a qualquer momento para os pedidos ativos ou <strong>excluir definitivamente</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModoVisualizacao('ativos')}
              className="px-3 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer shrink-0 transition-colors"
            >
              Voltar aos Pedidos Ativos
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                modoVisualizacao === 'lixeira'
                  ? 'Buscar na lixeira por nº, cliente, CNPJ...'
                  : 'Buscar por nº, cliente, CNPJ, OC, indústria ou produto...'
              }
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {/* Filtros em Dropdowns (Apenas em Pedidos Ativos) */}
          {modoVisualizacao === 'ativos' && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
              {/* Filtro de Situação Comercial */}
              <select
                value={filtroSituacao}
                onChange={(e) => setFiltroSituacao(e.target.value)}
                className="px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none w-full sm:w-auto"
              >
                <option value="TODOS">Situação: Todas</option>
                <option value="Enviado">Apenas Enviados</option>
                <option value="Fechado">Apenas Fechados</option>
              </select>

              {/* Filtro de Status Técnico */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none w-full sm:w-auto"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Pendente">Pendente</option>
                <option value="Faturado">Faturado</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              {/* Filtro de Tipo */}
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none w-full sm:w-auto"
              >
                <option value="TODOS">Tipo: Todos</option>
                <option value="ORCAMENTO">Orçamento</option>
                <option value="PEDIDO">Pedido de Venda</option>
              </select>

              {/* Filtro de Vendedor */}
              <select
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none w-full sm:w-auto"
              >
                <option value="TODOS">Vendedor: Todos</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>

              {/* Botões de Ação Novo */}
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2 w-full sm:w-auto ml-auto">
                <button
                  type="button"
                  onClick={() => onNovoPedido('ORCAMENTO')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Orçamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNovoPedido('PEDIDO')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Pedido</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Listagem de Pedidos (Cards em Celular e Tabela em Computador) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {pedidosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            {modoVisualizacao === 'lixeira' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">A lixeira está vazia</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Nenhum pedido foi excluído ou descartado no momento.
                </p>
                <button
                  type="button"
                  onClick={() => setModoVisualizacao('ativos')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Pedidos Ativos</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">Nenhum pedido ou orçamento encontrado</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Ajuste os filtros de busca ou crie um novo pedido para começar.
                </p>
                <button
                  type="button"
                  onClick={() => onNovoPedido('ORCAMENTO')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Novo Orçamento</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* VISÃO EM CARDS PARA CELULAR (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100">
              {pedidosFiltrados.map((p) => {
                const ocCliente = p.ordemCompraCliente || p.numeroPedidoCliente;
                const situacao = p.situacaoComercial || 'Enviado';

                return (
                  <div key={p.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition-colors">
                    {/* Topo do card: Número + Badges + Situação Comercial */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onVisualizar(p)}
                          className="font-mono font-black text-base text-indigo-700 hover:text-indigo-900 cursor-pointer"
                        >
                          {p.numero === 'RASCUNHO' ? (
                            <span className="inline-block bg-amber-100 text-amber-900 font-sans font-bold px-2 py-0.5 rounded text-xs">
                              RASCUNHO
                            </span>
                          ) : (
                            p.numero
                          )}
                        </button>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            p.tipo === 'ORCAMENTO' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            p.status === 'Cancelado'
                              ? 'bg-red-100 text-red-800'
                              : p.status === 'Rascunho'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      {/* Situação Comercial */}
                      {modoVisualizacao === 'ativos' && onToggleSituacaoComercial && (
                        <button
                          type="button"
                          onClick={() => onToggleSituacaoComercial(p.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            situacao === 'Fechado'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white shadow-xs'
                          }`}
                          title="Clique para alternar entre Fechado e Enviado"
                        >
                          <span>{situacao.toUpperCase()}</span>
                          <ArrowRightLeft className="w-3 h-3 opacity-80" />
                        </button>
                      )}
                    </div>

                    {/* Cliente e Valor */}
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-slate-900 leading-snug">
                        {p.cliente?.razaoSocial || 'Cliente não identificado'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{p.cliente?.cidade ? `${p.cliente.cidade}/${p.cliente.estado}` : '-'}</span>
                        <span className="font-mono font-black text-sm text-emerald-700">
                          {formatCurrency(p.totalPedido)}
                        </span>
                      </div>
                      {ocCliente && (
                        <div className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                          OC Cliente: {ocCliente}
                        </div>
                      )}
                    </div>

                    {/* Vendedor e Data */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div>Vendedor: <span className="font-semibold text-slate-700">{p.vendedor?.nome || '-'}</span></div>
                      <div>Prev: <span className="font-bold font-mono text-slate-700">{p.dataPrevista ? formatDateBR(p.dataPrevista) : '-'}</span></div>
                    </div>

                    {/* Barra de Ações com botões confortáveis */}
                    <div className="pt-2 border-t border-slate-100">
                      {modoVisualizacao === 'lixeira' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onRestaurarPedido?.(p.id)}
                            className="py-2.5 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer"
                            title="Restaurar pedido para pedidos ativos"
                          >
                            <RotateCcw className="w-4 h-4 text-emerald-600" />
                            <span>Restaurar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPedidoDefinitivoId(p.id)}
                            className="py-2.5 px-3 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer"
                            title="Excluir definitivamente"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Excluir Definitivo</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => onVisualizar(p)}
                            className="col-span-2 py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer"
                            title="Visualizar e Baixar PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Ver / PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditar(p)}
                            className="py-2 px-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                            title="Editar pedido"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onExcluir(p.id)}
                            className="py-2 px-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center justify-center gap-1 min-h-[42px] cursor-pointer"
                            title="Excluir pedido / Mover para lixeira"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISÃO EM TABELA PARA COMPUTADOR (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4 text-center">Situação Comercial</th>
                    <th className="py-3 px-4">Cliente & Ordem de Compra</th>
                    <th className="py-3 px-4">Vendedor & Pagamento</th>
                    <th className="py-3 px-4 text-center">Data Real / Prev.</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosFiltrados.map((p) => {
                    const ocCliente = p.ordemCompraCliente || p.numeroPedidoCliente;
                    const situacao = p.situacaoComercial || 'Enviado';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. DOCUMENTO */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              type="button"
                              onClick={() => onVisualizar(p)}
                              className="font-mono font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer text-sm"
                            >
                              {p.numero === 'RASCUNHO' ? (
                                <span className="inline-block bg-amber-100 text-amber-900 font-sans font-bold px-2 py-0.5 rounded text-xs">
                                  RASCUNHO
                                </span>
                              ) : (
                                p.numero
                              )}
                            </button>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                  p.tipo === 'ORCAMENTO' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {p.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                  p.status === 'Cancelado'
                                    ? 'bg-red-100 text-red-800'
                                    : p.status === 'Rascunho'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. SITUAÇÃO COMERCIAL */}
                        <td className="py-3 px-4 text-center">
                          {modoVisualizacao === 'ativos' && onToggleSituacaoComercial ? (
                            <button
                              type="button"
                              onClick={() => onToggleSituacaoComercial(p.id)}
                              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                situacao === 'Fechado'
                                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                  : 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                              }`}
                              title="Clique para alternar entre Fechado e Enviado"
                            >
                              <span>{situacao.toUpperCase()}</span>
                              <ArrowRightLeft className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                            </button>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-2xs font-bold uppercase ${
                                situacao === 'Fechado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {situacao}
                            </span>
                          )}
                        </td>

                        {/* 3. CLIENTE & ORDEM DE COMPRA */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 max-w-xs truncate">
                            {p.cliente?.razaoSocial || 'Cliente não identificado'}
                          </div>
                          <div className="text-2xs text-slate-500 flex items-center gap-2">
                            <span>{p.cliente?.cidade ? `${p.cliente.cidade}/${p.cliente.estado}` : '-'}</span>
                            {p.cliente?.cnpjCpf && <span>• {p.cliente.cnpjCpf}</span>}
                          </div>
                          {ocCliente && (
                            <div className="mt-1 text-2xs font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                              OC Cliente: {ocCliente}
                            </div>
                          )}
                        </td>

                        {/* 4. VENDEDOR & FORMA DE PAGAMENTO */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">
                            {p.vendedor?.nome || 'Vendedor Padrão'}
                          </div>
                          <div className="text-2xs text-slate-500">
                            {p.formaPagamento ? `${p.formaPagamento} - ` : ''}
                            {p.condicaoPagamento || 'À vista'}
                          </div>
                        </td>

                        {/* 5. DATA CADASTRO & PREVISTA */}
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono text-slate-700 font-medium">
                            {formatDateBR(p.dataCadastro)}
                          </div>
                          {p.dataPrevista ? (
                            <div className="text-2xs text-indigo-700 font-mono font-bold mt-0.5 flex items-center justify-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDateBR(p.dataPrevista)}</span>
                            </div>
                          ) : (
                            <span className="text-2xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* 6. VALOR TOTAL */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(p.totalPedido)}
                          </div>
                          {p.totalIpi > 0 && (
                            <div className="text-2xs text-blue-600 font-mono">
                              +IPI: {formatCurrency(p.totalIpi)}
                            </div>
                          )}
                        </td>

                        {/* 7. AÇÕES */}
                        <td className="py-3 px-4 text-right">
                          {modoVisualizacao === 'lixeira' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onRestaurarPedido?.(p.id)}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="Restaurar pedido para pedidos ativos"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Restaurar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPedidoDefinitivoId(p.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir definitivamente da lixeira"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => onVisualizar(p)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Visualizar pedido"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditar(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar pedido"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicar(p)}
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Duplicar pedido"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {onCancelar && p.status !== 'Cancelado' && (
                                <button
                                  type="button"
                                  onClick={() => onCancelar(p.id)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar pedido"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onExcluir(p.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir pedido / Mover para lixeira"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO: ESVAZIAR LIXEIRA */}
      {confirmEsvaziar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Esvaziar Lixeira?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {pedidosLixeira.length} pedido(s) serão removidos definitivamente
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja esvaziar a lixeira? Todos os pedidos descartados serão removidos permanentemente e não poderão ser recuperados.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmEsvaziar(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onEsvaziarLixeira?.();
                  setConfirmEsvaziar(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Sim, Esvaziar Lixeira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR DEFINITIVO ÚNICO PEDIDO DA LIXEIRA */}
      {pedidoDefinitivoId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Excluir Definitivamente?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  O registro será removido permanentemente da lixeira
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente apagar este pedido de forma definitiva? Esta ação é irreversível.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPedidoDefinitivoId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onExcluirDefinitivoLixeira?.(pedidoDefinitivoId);
                  setPedidoDefinitivoId(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Sim, Excluir Definitivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
