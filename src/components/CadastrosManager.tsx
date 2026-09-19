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
  Check,
} from 'lucide-react';
import {
  Cliente,
  Produto,
  Transportadora,
  CondicaoPagamento,
  Representante,
  Representada,
} from '../types';
import { ClienteModal } from './modals/ClienteModal';
import { ProdutoModal } from './modals/ProdutoModal';
import { TransportadoraModal } from './modals/TransportadoraModal';
import { CondicaoPagamentoModal } from './modals/CondicaoPagamentoModal';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface CadastrosManagerProps {
  clientes: Cliente[];
  produtos: Produto[];
  transportadoras: Transportadora[];
  condicoes: CondicaoPagamento[];
  vendedores: Representante[];
  representadas: Representada[];
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
}

export const CadastrosManager: React.FC<CadastrosManagerProps> = ({
  clientes,
  produtos,
  transportadoras,
  condicoes,
  vendedores,
  representadas,
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
}) => {
  const [abaAtiva, setAbaAtiva] = useState<
    'clientes' | 'produtos' | 'transportadoras' | 'condicoes' | 'vendedores' | 'representadas'
  >('clientes');

  const [busca, setBusca] = useState('');

  // Modais
  const [modalCliente, setModalCliente] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);

  const [modalProduto, setModalProduto] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);

  const [modalTransp, setModalTransp] = useState(false);
  const [editTransp, setEditTransp] = useState<Transportadora | null>(null);

  const [modalCondicao, setModalCondicao] = useState(false);

  // Modal de vendedor simples inline
  const [modalVendedor, setModalVendedor] = useState(false);
  const [nomeVendedor, setNomeVendedor] = useState('');
  const [comissaoVendedor, setComissaoVendedor] = useState('5.0');

  return (
    <div className="space-y-6">
      {/* Abas Superiores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setAbaAtiva('clientes');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'clientes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes ({clientes.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('produtos');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'produtos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          Produtos & Itens ({produtos.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('transportadoras');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'transportadoras'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          Transportadoras ({transportadoras.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('condicoes');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'condicoes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Condições Pagamento ({condicoes.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('vendedores');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'vendedores'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Vendedores ({vendedores.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('representadas');
            setBusca('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'representadas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Representadas / Emissoras ({representadas.length})
        </button>
      </div>

      {/* 1. ABA CLIENTES */}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja excluir o cliente ${c.razaoSocial}?`)) {
                                onDeleteCliente(c.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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

      {/* 2. ABA PRODUTOS */}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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
                  <th className="py-2.5 px-3 text-right">Pr. Caixa</th>
                  <th className="py-2.5 px-3 text-right">Pr. Unidade</th>
                  <th className="py-2.5 px-3 text-right">Pr. Milheiro</th>
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
                      (p.qtdMilheiroPorCaixa ? Math.round(p.qtdMilheiroPorCaixa * 1000) : 1);
                    const prCx = p.precoCaixa || p.precoUnitario;
                    const prUn =
                      p.precoUnidade || (qtdCx > 0 ? Number((prCx / qtdCx).toFixed(4)) : prCx);
                    const prMil =
                      p.precoMilheiro || Number((prUn * 1000).toFixed(2));

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
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(prCx)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          R$ {prUn.toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                          {formatCurrency(prMil)}
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
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar produto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja excluir o produto ${p.descricao}?`)) {
                                  onDeleteProduto(p.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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

      {/* 3. ABA TRANSPORTADORAS */}
      {abaAtiva === 'transportadoras' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-xs font-bold text-slate-700">Transportadoras Cadastradas</div>
            <button
              type="button"
              onClick={() => {
                setEditTransp(null);
                setModalTransp(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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
                {transportadoras.map((t) => (
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
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja excluir a transportadora ${t.nome}?`)) {
                              onDeleteTransportadora(t.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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

      {/* 4. ABA CONDIÇÕES PAGAMENTO */}
      {abaAtiva === 'condicoes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-xs font-bold text-slate-700">Formas e Condições de Pagamento</div>
            <button
              type="button"
              onClick={() => setModalCondicao(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Condição
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {condicoes.map((cp) => (
              <div
                key={cp.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{cp.nome}</div>
                  {cp.descricao && (
                    <div className="text-2xs text-slate-500 mt-0.5">{cp.descricao}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir condição ${cp.nome}?`)) {
                      onDeleteCondicao(cp.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ABA VENDEDORES */}
      {abaAtiva === 'vendedores' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-xs font-bold text-slate-700">Representantes e Vendedores</div>
            <button
              type="button"
              onClick={() => {
                setNomeVendedor('');
                setComissaoVendedor('5.0');
                setModalVendedor(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Vendedor
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendedores.map((v) => (
              <div
                key={v.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">{v.nome}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Comissão Padrão: <strong className="text-blue-700">{v.comissaoPadrao}%</strong>
                  </div>
                  {v.email && <div className="text-2xs text-slate-400 mt-0.5">{v.email}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir vendedor ${v.nome}?`)) {
                      onDeleteVendedor(v.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ABA REPRESENTADAS */}
      {abaAtiva === 'representadas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-700">
              Representadas / Empresas Emissoras dos Pedidos
            </div>
            <p className="text-2xs text-slate-500 mt-0.5">
              Estes dados saem no cabeçalho impresso do orçamento (como a IMT no modelo anexado).
            </p>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {representadas.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="font-bold text-sm text-slate-900">{r.nome}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono">
                  <div>CNPJ: {r.cnpj}</div>
                  <div>IE: {r.ie}</div>
                </div>
                <div className="text-slate-600">
                  {r.endereco}, {r.bairro} - {r.cidade}/{r.estado}
                </div>
                <div className="text-slate-600">Telefone: {r.telefone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais Inline */}
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
      />

      {/* Modal Vendedor Simples */}
      {modalVendedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Novo Vendedor</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome</label>
              <input
                type="text"
                value={nomeVendedor}
                onChange={(e) => setNomeVendedor(e.target.value)}
                placeholder="Ex: DOUGLAS CARLOS TERNES"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Comissão (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={comissaoVendedor}
                onChange={(e) => setComissaoVendedor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalVendedor(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (nomeVendedor.trim()) {
                    onSaveVendedor({
                      id: `vend-${Date.now()}`,
                      nome: nomeVendedor.toUpperCase().trim(),
                      comissaoPadrao: parseFloat(comissaoVendedor) || 5.0,
                    });
                    setModalVendedor(false);
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                Salvar Vendedor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
