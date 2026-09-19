import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Printer,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Share2,
  Filter,
  FileText,
  DollarSign,
  Weight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Pedido, TipoDocumento, StatusPedido, Representante } from '../types';
import { formatCurrency, formatNumber, formatDateBR } from '../utils/formatters';

interface PedidosListProps {
  pedidos: Pedido[];
  vendedores: Representante[];
  onNovoPedido: (tipo: TipoDocumento) => void;
  onVisualizar: (pedido: Pedido) => void;
  onEditar: (pedido: Pedido) => void;
  onDuplicar: (pedido: Pedido) => void;
  onExcluir: (id: string) => void;
}

export const PedidosList: React.FC<PedidosListProps> = ({
  pedidos,
  vendedores,
  onNovoPedido,
  onVisualizar,
  onEditar,
  onDuplicar,
  onExcluir,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');

  // Filtragem
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) return false;
      if (filtroVendedor !== 'TODOS' && p.vendedor.id !== filtroVendedor) return false;

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      const matchNumero = p.numero?.toLowerCase().includes(termo);
      const matchCliente =
        p.cliente.razaoSocial?.toLowerCase().includes(termo) ||
        p.cliente.cnpjCpf?.includes(termo) ||
        p.cliente.cidade?.toLowerCase().includes(termo) ||
        p.cliente.codigo?.includes(termo);
      const matchVendedor = p.vendedor.nome?.toLowerCase().includes(termo);
      const matchPedidoCliente = p.numeroPedidoCliente?.toLowerCase().includes(termo);
      const matchItens = p.itens?.some(
        (it) =>
          it.descricao?.toLowerCase().includes(termo) || it.codigo?.toLowerCase().includes(termo)
      );

      return matchNumero || matchCliente || matchVendedor || matchPedidoCliente || matchItens;
    });
  }, [pedidos, busca, filtroTipo, filtroStatus, filtroVendedor]);

  // Resumo dos filtrados
  const resumo = useMemo(() => {
    const totalVendido = pedidosFiltrados.reduce((acc, p) => acc + (p.totalPedido || 0), 0);
    const totalItens = pedidosFiltrados.reduce((acc, p) => acc + (p.totalItens || 0), 0);
    const totalIpi = pedidosFiltrados.reduce((acc, p) => acc + (p.totalIpi || 0), 0);
    const pesoGeral = pedidosFiltrados.reduce((acc, p) => acc + (p.pesoTotalKg || 0), 0);
    return { totalVendido, totalItens, totalIpi, pesoGeral };
  }, [pedidosFiltrados]);

  return (
    <div className="space-y-6">
      {/* Top Banner de Resumo de Valores com IPI SEPARADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pedidos & Orçamentos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {pedidosFiltrados.length}
          </div>
          <div className="mt-1 text-2xs text-slate-400">Total na listagem atual</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Base Venda (Itens)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(resumo.totalItens)}
          </div>
          <div className="mt-1 text-2xs text-slate-400">Base sem IPI para comissões</div>
        </div>

        {/* IPI SEPARADO */}
        <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Total IPI
              </span>
              <span className="text-3xs bg-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                Isolado
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
            Segregado dos relatórios de comissão
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento Geral
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Weight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-700">
            {formatCurrency(resumo.totalVendido)}
          </div>
          <div className="mt-1 text-2xs text-slate-500">
            Peso Total: <strong className="text-slate-700">{formatNumber(resumo.pesoGeral, 2)} kg</strong>
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
              placeholder="Buscar por nº, cliente, CNPJ, vendedor ou produto..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filtros em Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="TODOS">Tipo: Todos</option>
              <option value="ORCAMENTO">Apenas Orçamentos</option>
              <option value="PEDIDO">Apenas Pedidos de Venda</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Pendente">Pendente</option>
              <option value="Faturado">Faturado</option>
              <option value="Cancelado">Cancelado</option>
            </select>

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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Orçamento
              </button>

              <button
                type="button"
                onClick={() => onNovoPedido('PEDIDO')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Pedido
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos */}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs"
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
                  <th className="py-3 px-4">Cliente & Local</th>
                  <th className="py-3 px-4">Vendedor & Pagamento</th>
                  <th className="py-3 px-4 text-center">Data / Previsão</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Total IPI</th>
                  <th className="py-3 px-4 text-right">Total Pedido</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Documento e Tipo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onVisualizar(p)}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          title="Visualizar modelo impresso"
                        >
                          {p.numero}
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

                    {/* Cliente */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">
                        {p.cliente.codigo ? `${p.cliente.codigo} - ` : ''}
                        {p.cliente.razaoSocial}
                      </div>
                      <div className="text-2xs text-slate-500 truncate mt-0.5">
                        {p.cliente.cidade}/{p.cliente.estado} • CNPJ: {p.cliente.cnpjCpf}
                      </div>
                      {p.numeroPedidoCliente && (
                        <div className="text-3xs font-mono text-slate-400 mt-0.5">
                          Ped. Cliente: {p.numeroPedidoCliente}
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
                        Transp: {p.transportadora.nome} ({p.tipoFrete})
                      </div>
                    </td>

                    {/* Datas */}
                    <td className="py-3 px-4 text-center">
                      <div className="text-slate-800 font-medium">
                        {formatDateBR(p.dataCadastro)}
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
                          className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors font-semibold"
                          title="Visualizar e Baixar PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditar(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar pedido"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicar(p)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Duplicar pedido"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir o pedido ${p.numero}?`)) {
                              onExcluir(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
