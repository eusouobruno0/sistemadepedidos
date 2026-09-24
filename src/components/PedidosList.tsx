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
} from 'lucide-react';
import { Pedido, TipoDocumento, Representante } from '../types';
import { formatCurrency, formatNumber, formatDateBR } from '../utils/formatters';

interface PedidosListProps {
  pedidos: Pedido[];
  vendedores: Representante[];
  onNovoPedido: (tipo: TipoDocumento) => void;
  onVisualizar: (pedido: Pedido) => void;
  onEditar: (pedido: Pedido) => void;
  onDuplicar: (pedido: Pedido) => void;
  onExcluir: (id: string) => void;
  onCancelar?: (id: string) => void;
  onToggleSituacaoComercial?: (id: string) => void;
}

export const PedidosList: React.FC<PedidosListProps> = ({
  pedidos,
  vendedores,
  onNovoPedido,
  onVisualizar,
  onEditar,
  onDuplicar,
  onExcluir,
  onCancelar,
  onToggleSituacaoComercial,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('TODOS');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');

  // Filtragem completa
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
      if (filtroSituacao !== 'TODOS' && p.situacaoComercial !== filtroSituacao) return false;
      if (filtroVendedor !== 'TODOS' && p.vendedor.id !== filtroVendedor) return false;

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
        p.cliente.razaoSocial?.toLowerCase().includes(termo) ||
        p.cliente.cnpjCpf?.includes(termo) ||
        p.cliente.cidade?.toLowerCase().includes(termo) ||
        p.cliente.codigo?.includes(termo);

      // 3. Vendedor
      const matchVendedor = p.vendedor.nome?.toLowerCase().includes(termo);

      // 4. Ordem de Compra do Cliente (independente)
      const matchOC =
        (p.ordemCompraCliente && p.ordemCompraCliente.toLowerCase().includes(termo)) ||
        (p.numeroPedidoCliente && p.numeroPedidoCliente.toLowerCase().includes(termo));

      // 5. Nº Pedido da Indústria (independente)
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
  }, [pedidos, busca, filtroTipo, filtroStatus, filtroSituacao, filtroVendedor]);

  // Resumo analítico com segregação comercial de Enviados x Fechados
  const resumo = useMemo(() => {
    // Pedidos Fechados (venda efetiva - exclui Cancelados)
    const pedidosFechados = pedidosFiltrados.filter(
      (p) => p.situacaoComercial === 'Fechado' && p.status !== 'Cancelado'
    );
    const totalFechado = pedidosFechados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);

    // Pedidos Enviados (pipeline / em negociação)
    const pedidosEnviados = pedidosFiltrados.filter((p) => p.situacaoComercial === 'Enviado');
    const totalEnviado = pedidosEnviados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);

    // Total IPI segregado
    const totalIpi = pedidosFiltrados.reduce((acc, p) => acc + (p.totalIpi || 0), 0);

    return {
      qtdTotal: pedidosFiltrados.length,
      qtdFechados: pedidosFechados.length,
      totalFechado,
      qtdEnviados: pedidosEnviados.length,
      totalEnviado,
      totalIpi,
    };
  }, [pedidosFiltrados]);

  return (
    <div className="space-y-6">
      {/* Top Banner de Resumo com Separação Enviados x Fechados */}
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
          <div className="mt-1 text-2xs text-slate-400">Total filtrado na visualização</div>
        </div>

        {/* Venda Efetiva (FECHADOS) */}
        <div className="bg-white rounded-2xl border border-emerald-300 bg-emerald-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Venda Efetiva (Fechados)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            {formatCurrency(resumo.totalFechado)}
          </div>
          <div className="mt-1 text-2xs text-emerald-600 font-semibold">
            {resumo.qtdFechados} pedido{resumo.qtdFechados !== 1 ? 's' : ''} confirmado{resumo.qtdFechados !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Em Negociação (ENVIADOS) */}
        <div className="bg-white rounded-2xl border border-amber-300 bg-amber-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Em Negociação (Enviados)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700">
            {formatCurrency(resumo.totalEnviado)}
          </div>
          <div className="mt-1 text-2xs text-amber-600 font-semibold">
            {resumo.qtdEnviados} proposta{resumo.qtdEnviados !== 1 ? 's' : ''} enviada{resumo.qtdEnviados !== 1 ? 's' : ''}
          </div>
        </div>

        {/* IPI Segregado */}
        <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Total IPI
              </span>
              <span className="text-3xs bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                Segregado
              </span>
            </div>
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

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nº, cliente, CNPJ, OC, indústria ou produto..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {/* Filtros em Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            {/* Filtro de Situação Comercial (NOVO) */}
            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none"
            >
              <option value="TODOS">Situação: Todas</option>
              <option value="Enviado">Apenas Enviados</option>
              <option value="Fechado">Apenas Fechados</option>
            </select>

            {/* Filtro de Status Técnico */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="TODOS">Tipo: Todos</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="PEDIDO">Pedido de Venda</option>
            </select>

            {/* Filtro de Vendedor */}
            <select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="TODOS">Vendedor: Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>

            {/* Botões de Ação Novo */}
            <div className="flex items-center gap-2 ml-auto lg:ml-2">
              <button
                type="button"
                onClick={() => onNovoPedido('ORCAMENTO')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Orçamento
              </button>

              <button
                type="button"
                onClick={() => onNovoPedido('PEDIDO')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Pedido
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos com Data Nítida e Situação Comercial Alternável */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {pedidosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
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
              Criar Novo Orçamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4 text-center">Situação Comercial</th>
                  <th className="py-3 px-4">Cliente & Ordem de Compra</th>
                  <th className="py-3 px-4">Vendedor & Pagamento</th>
                  <th className="py-3 px-4 text-center">Data Real / Prev.</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Total IPI</th>
                  <th className="py-3 px-4 text-right">Total Pedido</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosFiltrados.map((p) => {
                  const dataCadastroLimpa = p.dataCadastro ? formatDateBR(p.dataCadastro) : '-';
                  const ocCliente = p.ordemCompraCliente || p.numeroPedidoCliente;
                  const situacao = p.situacaoComercial || 'Enviado';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Documento e Tipo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onVisualizar(p)}
                            className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                            title="Visualizar modelo impresso e PDF"
                          >
                            {p.numero === 'RASCUNHO' ? (
                              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 font-sans font-bold px-2 py-0.5 rounded text-2xs">
                                RASCUNHO
                              </span>
                            ) : (
                              p.numero
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-3xs px-1.5 py-0.5 rounded font-bold uppercase ${
                              p.tipo === 'ORCAMENTO'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {p.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'}
                          </span>
                          <span
                            className={`text-3xs px-1.5 py-0.5 rounded font-bold uppercase ${
                              p.status === 'Aprovado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'Faturado'
                                ? 'bg-blue-100 text-blue-800'
                                : p.status === 'Cancelado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </td>

                      {/* Situação Comercial com Alternância Simples (1 Clique) */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleSituacaoComercial) {
                              onToggleSituacaoComercial(p.id);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold transition-all shadow-2xs cursor-pointer border ${
                            situacao === 'Fechado'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                          title={`Clique para alternar para ${situacao === 'Fechado' ? 'ENVIADO' : 'FECHADO'}`}
                        >
                          {situacao === 'Fechado' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{situacao === 'Fechado' ? 'FECHADO' : 'ENVIADO'}</span>
                          <ArrowRightLeft className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
                      </td>

                      {/* Cliente e Identificadores (OC Cliente e Nº Indústria) */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">
                          {p.cliente.codigo ? `${p.cliente.codigo} - ` : ''}
                          {p.cliente.razaoSocial}
                        </div>
                        <div className="text-2xs text-slate-500 truncate mt-0.5">
                          {p.cliente.cidade}/{p.cliente.estado} • CNPJ: {p.cliente.cnpjCpf}
                        </div>

                        {/* Ordem de Compra do Cliente (destacada) */}
                        {ocCliente && (
                          <div className="text-3xs font-mono text-slate-600 mt-1 flex items-center gap-1">
                            <span className="font-bold text-slate-700">Ordem de Compra:</span>
                            <span className="bg-slate-100 text-indigo-900 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                              {ocCliente}
                            </span>
                          </div>
                        )}

                        {/* Nº Pedido da Indústria */}
                        {p.numeroPedidoIndustria && (
                          <div className="text-3xs font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                            <span className="font-semibold text-slate-600">Nº Indústria:</span>
                            <span className="bg-slate-50 text-slate-700 font-medium px-1 rounded">
                              {p.numeroPedidoIndustria}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Vendedor e Pagamento */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.vendedor.nome}</div>
                        <div className="text-2xs text-slate-500 font-mono mt-0.5">
                          Cond: <span className="font-bold text-slate-700">{p.condicaoPagamento}</span>
                        </div>
                        <div className="text-3xs text-slate-400">
                          {p.empresaEmissora.nome} • Transp: {p.transportadora.nome} ({p.tipoFrete})
                        </div>
                      </td>

                      {/* Datas (Data Real do Pedido Destacada) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-slate-900 font-bold font-mono text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dataCadastroLimpa}</span>
                        </div>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          Prev: <span className="font-bold text-slate-700">{formatDateBR(p.dataPrevista)}</span>
                        </div>
                        {p.programado && (
                          <span className="inline-block mt-1 text-3xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                            Prog: {p.dataProgramada || 'SIM'}
                          </span>
                        )}
                      </td>

                      {/* Subtotal Itens */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(p.totalItens, false)}
                      </td>

                      {/* IPI SEPARADO */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                        {formatCurrency(p.totalIpi, false)}
                      </td>

                      {/* Total Geral */}
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(p.totalPedido)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onVisualizar(p)}
                            className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors font-semibold cursor-pointer"
                            title="Visualizar e Baixar PDF"
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
                              onClick={() => {
                                if (
                                  confirm(
                                    `Deseja marcar o pedido ${p.numero} como CANCELADO?\nO número e o histórico serão preservados.`
                                  )
                                ) {
                                  onCancelar(p.id);
                                }
                              }}
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
                            title="Excluir pedido"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
