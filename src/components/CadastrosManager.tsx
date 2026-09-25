import React, { useState } from 'react';
import {
  Users,
  Package,
  Truck,
  CreditCard,
  Building,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  AlertTriangle,
} from 'lucide-react';
import {
  Cliente,
  Produto,
  Transportadora,
  CondicaoPagamento,
  Representante,
  Representada,
  Pedido,
} from '../types';
import { ClienteModal } from './modals/ClienteModal';
import { ProdutoModal } from './modals/ProdutoModal';
import { TransportadoraModal } from './modals/TransportadoraModal';
import { CondicaoPagamentoModal } from './modals/CondicaoPagamentoModal';
import { RepresentanteModal } from './modals/RepresentanteModal';
import { RepresentadaModal } from './modals/RepresentadaModal';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface CadastrosManagerProps {
  clientes: Cliente[];
  produtos: Produto[];
  transportadoras: Transportadora[];
  condicoes: CondicaoPagamento[];
  vendedores: Representante[];
  representadas: Representada[];
  pedidos?: Pedido[];
  onSaveCliente: (c: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  onSaveProduto: (p: Produto) => void;
  onDeleteProduto: (id: string) => void;
  onSaveTransportadora: (t: Transportadora) => void;
  onDeleteTransportadora: (id: string) => void;
  onSaveCondicao: (cp: CondicaoPagamento) => void;
  onDeleteCondicao: (id: string) => void;
  onSaveVendedor: (v: Representante) => void;
  onDeleteVendedor: (id: string) => void;
  onSaveRepresentada: (r: Representada) => void;
  onDeleteRepresentada?: (id: string) => void;
}

export const CadastrosManager: React.FC<CadastrosManagerProps> = ({
  clientes,
  produtos,
  transportadoras,
  condicoes,
  vendedores,
  representadas,
  pedidos = [],
  onSaveCliente,
  onDeleteCliente,
  onSaveProduto,
  onDeleteProduto,
  onSaveTransportadora,
  onDeleteTransportadora,
  onSaveCondicao,
  onDeleteCondicao,
  onSaveVendedor,
  onDeleteVendedor,
  onSaveRepresentada,
  onDeleteRepresentada,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<
    'clientes' | 'produtos' | 'transportadoras' | 'condicoes' | 'vendedores' | 'representadas' | null
  >(null);

  const [busca, setBusca] = useState('');

  // Modais e edição de cada entidade
  const [modalCliente, setModalCliente] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);

  const [modalProduto, setModalProduto] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);

  const [modalTransp, setModalTransp] = useState(false);
  const [editTransp, setEditTransp] = useState<Transportadora | null>(null);

  const [modalCondicao, setModalCondicao] = useState(false);
  const [editCondicao, setEditCondicao] = useState<CondicaoPagamento | null>(null);

  const [modalVendedor, setModalVendedor] = useState(false);
  const [editVendedor, setEditVendedor] = useState<Representante | null>(null);

  const [modalRepresentada, setModalRepresentada] = useState(false);
  const [editRepresentada, setEditRepresentada] = useState<Representada | null>(null);

  // Verificações de integridade relacional para exclusão segura
  const checkIntegridadeCliente = (id: string, nome: string): boolean => {
    const emPedidos = pedidos.some((p) => p.cliente?.id === id);
    if (emPedidos) {
      alert(
        `Integridade Comercial: Não é permitido excluir o cliente "${nome}", pois existem pedidos vinculados a ele no histórico. O registro foi mantido.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir o cliente "${nome}"?`);
  };

  const checkIntegridadeProduto = (id: string, desc: string): boolean => {
    const emPedidos = pedidos.some((p) => p.itens?.some((it) => it.produtoId === id));
    if (emPedidos) {
      alert(
        `Integridade Comercial: Não é permitido excluir o produto "${desc}", pois ele já foi utilizado em pedidos do sistema. O registro foi mantido.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir o produto "${desc}"?`);
  };

  const checkIntegridadeTransportadora = (id: string, nome: string): boolean => {
    const emPedidos = pedidos.some((p) => p.transportadora?.id === id);
    if (emPedidos) {
      alert(
        `Integridade Comercial: Não é permitido excluir a transportadora "${nome}", pois existem pedidos com ela associada. O registro foi mantido.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir a transportadora "${nome}"?`);
  };

  const checkIntegridadeCondicao = (id: string, nome: string): boolean => {
    const emPedidos = pedidos.some((p) => p.condicaoPagamento?.toUpperCase() === nome.toUpperCase());
    if (emPedidos) {
      alert(
        `Integridade Comercial: A condição de pagamento "${nome}" está em uso em pedidos existentes e não pode ser excluída. O registro foi mantido.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir a condição "${nome}"?`);
  };

  const checkIntegridadeVendedor = (id: string, nome: string): boolean => {
    const emPedidos = pedidos.some((p) => p.vendedor?.id === id);
    if (emPedidos) {
      alert(
        `Integridade Comercial: O representante/vendedor "${nome}" possui pedidos emitidos em seu nome e não pode ser excluído. O registro foi preservado.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir o representante "${nome}"?`);
  };

  const checkIntegridadeRepresentada = (id: string, nome: string): boolean => {
    const emPedidos = pedidos.some((p) => p.empresaEmissora?.id === id);
    const emProdutos = produtos.some((pr) => pr.representadaId === id);
    if (emPedidos || emProdutos) {
      alert(
        `Integridade Comercial: A representada "${nome}" possui pedidos ou produtos vinculados no sistema e não pode ser excluída do histórico. O registro foi preservado.`
      );
      return false;
    }
    return confirm(`Deseja realmente excluir a representada "${nome}"?`);
  };

  const modulos = [
    {
      id: 'clientes' as const,
      titulo: 'Clientes',
      descricao: 'Gestão da carteira de clientes, CNPJ/CPF, endereços e contatos',
      total: clientes.length,
      icone: Users,
      corIcone: 'text-blue-600 bg-blue-50 border-blue-200 group-hover:bg-blue-600 group-hover:text-white',
      badgeCor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'produtos' as const,
      titulo: 'Produtos & Itens',
      descricao: 'Catálogo de produtos, preços por caixa/unidade, IPI e referências',
      total: produtos.length,
      icone: Package,
      corIcone: 'text-emerald-600 bg-emerald-50 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white',
      badgeCor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'representadas' as const,
      titulo: 'Representadas / Indústrias',
      descricao: 'Empresas emissoras, fabricantes e cabeçalhos fiscais de pedidos',
      total: representadas.length,
      icone: Building,
      corIcone: 'text-indigo-600 bg-indigo-50 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white',
      badgeCor: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'vendedores' as const,
      titulo: 'Representantes / Vendedores',
      descricao: 'Equipe comercial, taxas de comissão e dados de contato',
      total: vendedores.length,
      icone: UserCheck,
      corIcone: 'text-amber-600 bg-amber-50 border-amber-200 group-hover:bg-amber-600 group-hover:text-white',
      badgeCor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'transportadoras' as const,
      titulo: 'Transportadoras',
      descricao: 'Empresas de frete, tipo FOB/CIF padrão e cidades de atendimento',
      total: transportadoras.length,
      icone: Truck,
      corIcone: 'text-purple-600 bg-purple-50 border-purple-200 group-hover:bg-purple-600 group-hover:text-white',
      badgeCor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'condicoes' as const,
      titulo: 'Condições de Pagamento',
      descricao: 'Prazos de faturamento pré-cadastrados, boletos e formas de pagamento',
      total: condicoes.length,
      icone: CreditCard,
      corIcone: 'text-rose-600 bg-rose-50 border-rose-200 group-hover:bg-rose-600 group-hover:text-white',
      badgeCor: 'bg-rose-100 text-rose-800',
    },
  ];

  const moduloAtual = modulos.find((m) => m.id === abaAtiva);

  return (
    <div className="space-y-6">
      {/* SE NENHUMA ABA SELECIONADA: EXIBE MENU PRINCIPAL DE CADASTROS */}
      {abaAtiva === null && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Central de Cadastros</h2>
                <p className="text-xs text-slate-500">
                  Selecione uma das opções abaixo para gerenciar os registros padronizados do sistema
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((mod) => {
              const Icone = mod.icone;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setAbaAtiva(mod.id);
                    setBusca('');
                  }}
                  className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 text-left shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl border transition-colors ${mod.corIcone}`}>
                        <Icone className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${mod.badgeCor}`}>
                        {mod.total} cadastrado{mod.total !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {mod.titulo}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {mod.descricao}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-blue-600">
                    <span>Abrir lista e gerenciar</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QUANDO UMA ABA ESTÁ SELECIONADA: CABEÇALHO PADRONIZADO E NAVEGAÇÃO ENTRE ABAS */}
      {abaAtiva !== null && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAbaAtiva(null);
                  setBusca('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                title="Voltar ao menu de cadastros"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar aos Cadastros</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              {moduloAtual && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{moduloAtual.titulo}</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {moduloAtual.total} registros
                  </span>
                </div>
              )}
            </div>

            {/* Alternância Rápida entre Cadastros (Scroll horizontal em celular) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
              {modulos.map((m) => {
                const Icone = m.icone;
                const isCurrent = abaAtiva === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAbaAtiva(m.id);
                      setBusca('');
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icone className="w-3.5 h-3.5" />
                    <span>{m.titulo.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. ABA CLIENTES (FORMATO LISTA PADRÃO) */}
      {abaAtiva === 'clientes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por razão social, CNPJ ou cidade..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditCliente(null);
                setModalCliente(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Cliente
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Código</th>
                  <th className="py-2.5 px-4">Razão Social / Nome</th>
                  <th className="py-2.5 px-4">CNPJ / CPF</th>
                  <th className="py-2.5 px-4">Cidade / UF</th>
                  <th className="py-2.5 px-4">Telefone / Celular</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes
                  .filter(
                    (c) =>
                      !busca ||
                      c.codigo?.toLowerCase().includes(busca.toLowerCase()) ||
                      c.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
                      (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(busca.toLowerCase())) ||
                      c.cnpjCpf.includes(busca) ||
                      c.cidade.toLowerCase().includes(busca.toLowerCase())
                  )
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                        {c.codigo || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{c.razaoSocial}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{c.cnpjCpf}</td>
                      <td className="py-2.5 px-4">
                        {c.cidade} - {c.estado}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {c.telefone || c.celular || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditCliente(c);
                              setModalCliente(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (checkIntegridadeCliente(c.id, c.razaoSocial)) {
                                onDeleteCliente(c.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ABA PRODUTOS (FORMATO LISTA PADRÃO) */}
      {abaAtiva === 'produtos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por descrição ou código..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditProduto(null);
                setModalProduto(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Cód. Interno</th>
                  <th className="py-2.5 px-3">Cód. Fábrica</th>
                  <th className="py-2.5 px-4">Descrição & Ref.</th>
                  <th className="py-2.5 px-3 text-center">Embalagem</th>
                  <th className="py-2.5 px-3 text-right text-indigo-950 font-black">Pr. Milheiro (Base)</th>
                  <th className="py-2.5 px-3 text-right">Pr. Caixa (Soma)</th>
                  <th className="py-2.5 px-3 text-right">Pr. Unidade</th>
                  <th className="py-2.5 px-3 text-center">IPI</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos
                  .filter(
                    (p) =>
                      !busca ||
                      p.codigoInterno?.toLowerCase().includes(busca.toLowerCase()) ||
                      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                      p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
                      (p.referencia && p.referencia.toLowerCase().includes(busca.toLowerCase()))
                  )
                  .map((p) => {
                    const qtdCx =
                      p.quantidadePorCaixa ||
                      (p.qtdMilheiroPorCaixa ? Math.round(p.qtdMilheiroPorCaixa * 1000) : 1000);
                    const prMil =
                      p.precoMilheiro ||
                      (p.precoUnidade
                        ? Number((p.precoUnidade * 1000).toFixed(2))
                        : p.precoCaixa && qtdCx > 0
                        ? Number(((p.precoCaixa / qtdCx) * 1000).toFixed(2))
                        : 90);
                    const prUn = Number((prMil / 1000).toFixed(4));
                    const prCx = Number(((prMil * qtdCx) / 1000).toFixed(2));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {p.codigoInterno || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                          {p.codigo}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {p.descricao} {p.referencia ? `(${p.referencia})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                          {p.unidadeMedida === 'CX' ? `1 cx = ${qtdCx.toLocaleString('pt-BR')} un` : p.unidadeMedida}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/40">
                          {formatCurrency(prMil)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(prCx)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          R$ {prUn.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                          {p.aliquotaIpi}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditProduto(p);
                                setModalProduto(true);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Editar produto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (checkIntegridadeProduto(p.id, p.descricao)) {
                                  onDeleteProduto(p.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Excluir produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ABA TRANSPORTADORAS (FORMATO LISTA PADRÃO) */}
      {abaAtiva === 'transportadoras' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, CNPJ ou cidade..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditTransp(null);
                setModalTransp(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Transportadora
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Nome da Transportadora</th>
                  <th className="py-2.5 px-4">CNPJ</th>
                  <th className="py-2.5 px-4">Telefone</th>
                  <th className="py-2.5 px-4">Cidade / UF</th>
                  <th className="py-2.5 px-4 text-center">Frete Padrão</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transportadoras
                  .filter(
                    (t) =>
                      !busca ||
                      t.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      t.cnpj?.includes(busca) ||
                      t.cidade?.toLowerCase().includes(busca.toLowerCase())
                  )
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{t.nome}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{t.cnpj || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{t.telefone || '-'}</td>
                      <td className="py-2.5 px-4">
                        {t.cidade ? `${t.cidade}/${t.estado}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-3xs ${
                            t.tipoFretePadrao === 'FOB'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.tipoFretePadrao}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTransp(t);
                              setModalTransp(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Editar transportadora"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (checkIntegridadeTransportadora(t.id, t.nome)) {
                                onDeleteTransportadora(t.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir transportadora"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ABA CONDICOES DE PAGAMENTO (PADRONIZADA EM LISTA/TABELA) */}
      {abaAtiva === 'condicoes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por prazo ou descrição..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditCondicao(null);
                setModalCondicao(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Condição
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Condição / Prazo de Pagamento</th>
                  <th className="py-2.5 px-4">Descrição / Observações de Cobrança</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {condicoes
                  .filter(
                    (cp) =>
                      !busca ||
                      cp.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      (cp.descricao && cp.descricao.toLowerCase().includes(busca.toLowerCase()))
                  )
                  .map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold font-mono text-slate-900">{cp.nome}</td>
                      <td className="py-2.5 px-4 text-slate-600">{cp.descricao || '-'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditCondicao(cp);
                              setModalCondicao(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Editar condição"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (checkIntegridadeCondicao(cp.id, cp.nome)) {
                                onDeleteCondicao(cp.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir condição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ABA VENDEDORES / REPRESENTANTES (PADRONIZADA EM LISTA/TABELA) */}
      {abaAtiva === 'vendedores' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditVendedor(null);
                setModalVendedor(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Representante
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Nome do Representante</th>
                  <th className="py-2.5 px-4 text-center">Comissão Padrão</th>
                  <th className="py-2.5 px-4">E-mail</th>
                  <th className="py-2.5 px-4">Telefone / Celular</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendedores
                  .filter(
                    (v) =>
                      !busca ||
                      v.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      (v.email && v.email.toLowerCase().includes(busca.toLowerCase())) ||
                      (v.telefone && v.telefone.includes(busca))
                  )
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{v.nome}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-700">
                        {v.comissaoPadrao}%
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-mono">{v.email || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{v.telefone || '-'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditVendedor(v);
                              setModalVendedor(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Editar representante"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (checkIntegridadeVendedor(v.id, v.nome)) {
                                onDeleteVendedor(v.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir representante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. ABA REPRESENTADAS (PADRONIZADA EM LISTA/TABELA) */}
      {abaAtiva === 'representadas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por marca, razão social, CNPJ ou cidade..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditRepresentada(null);
                setModalRepresentada(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Representada
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Nome Fantasia / Marca</th>
                  <th className="py-2.5 px-4">Razão Social</th>
                  <th className="py-2.5 px-4">CNPJ / IE</th>
                  <th className="py-2.5 px-4">Cidade / UF</th>
                  <th className="py-2.5 px-4">Telefone</th>
                  <th className="py-2.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {representadas
                  .filter(
                    (r) =>
                      !busca ||
                      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      (r.razaoSocial && r.razaoSocial.toLowerCase().includes(busca.toLowerCase())) ||
                      r.cnpj.includes(busca) ||
                      r.cidade.toLowerCase().includes(busca.toLowerCase())
                  )
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.nome}</td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">{r.razaoSocial || '-'}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        <div>{r.cnpj}</div>
                        <div className="text-3xs text-slate-400">IE: {r.ie || 'ISENTO'}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        {r.cidade} - {r.estado}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{r.telefone || '-'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditRepresentada(r);
                              setModalRepresentada(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Editar representada"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteRepresentada && (
                            <button
                              type="button"
                              onClick={() => {
                                if (checkIntegridadeRepresentada(r.id, r.nome)) {
                                  onDeleteRepresentada(r.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Excluir representada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais Completos e Padronizados */}
      <ClienteModal
        isOpen={modalCliente}
        onClose={() => setModalCliente(false)}
        onSave={onSaveCliente}
        initialData={editCliente}
      />

      <ProdutoModal
        isOpen={modalProduto}
        onClose={() => setModalProduto(false)}
        onSave={onSaveProduto}
        representadas={representadas}
        initialData={editProduto}
      />

      <TransportadoraModal
        isOpen={modalTransp}
        onClose={() => setModalTransp(false)}
        onSave={onSaveTransportadora}
        initialData={editTransp}
      />

      <CondicaoPagamentoModal
        isOpen={modalCondicao}
        onClose={() => setModalCondicao(false)}
        onSave={onSaveCondicao}
        initialData={editCondicao}
      />

      <RepresentanteModal
        isOpen={modalVendedor}
        onClose={() => setModalVendedor(false)}
        onSave={onSaveVendedor}
        initialData={editVendedor}
      />

      <RepresentadaModal
        isOpen={modalRepresentada}
        onClose={() => setModalRepresentada(false)}
        onSave={onSaveRepresentada}
        initialData={editRepresentada}
      />
    </div>
  );
};
