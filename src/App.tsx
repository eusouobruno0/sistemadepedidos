import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavigationTab } from './components/Navbar';
import { PedidoForm } from './components/PedidoForm';
import { PedidoPrintView } from './components/PedidoPrintView';
import { CadastrosManager } from './components/CadastrosManager';
import { RelatoriosView } from './components/RelatoriosView';
import {
  ClienteService,
  RepresentadaService,
  ProdutoService,
  TransportadoraService,
  FormaPagamentoService,
  RepresentanteService,
  PedidoService,
  isValidUUID,
} from './lib/database';
import {
  Pedido,
  Cliente,
  Transportadora,
  Produto,
  Representada,
  Representante,
  CondicaoPagamento,
  TipoDocumento,
} from './types';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  X,
  ShieldAlert,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from './utils/formatters';

export default function App() {
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Navegação
  const [currentTab, setCurrentTab] = useState<NavigationTab>('relatorios');

  // Estado dos dados vindos do Supabase
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [representadas, setRepresentadas] = useState<Representada[]>([]);
  const [vendedores, setVendedores] = useState<Representante[]>([]);
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);

  // Estados de navegação entre pedidos
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [pedidoParaEditar, setPedidoParaEditar] = useState<Pedido | null>(null);

  // Modais de confirmação in-app (substituem window.confirm e window.alert para garantir funcionamento perfeito em iframes)
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null);
  const [isExcluindo, setIsExcluindo] = useState(false);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<Pedido | null>(null);
  const [isCancelando, setIsCancelando] = useState(false);
  const [pedidosLixeira, setPedidosLixeira] = useState<Pedido[]>(() => PedidoService.getLixeira());

  // Modal para orientar liberação de exclusão no Supabase se houver travas antigas
  const [modalSqlAviso, setModalSqlAviso] = useState<{
    pedidoId: string;
    pedidoNumero: string;
    erroMsg: string;
  } | null>(null);
  const [copiouSql, setCopiouSql] = useState(false);

  // Toast temporário de confirmação / erro
  const [toastMsg, setToastMsg] = useState<{ texto: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);

  const showToast = useCallback((texto: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setToastMsg({ texto, tipo });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  }, []);

  // Carregar todos os dados operacionais do Supabase imediatamente ao abrir a aplicação
  const carregarDados = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        clientesData,
        transportadorasData,
        produtosData,
        representadasData,
        vendedoresData,
        formasData,
        pedidosData,
      ] = await Promise.all([
        ClienteService.getAll(),
        TransportadoraService.getAll(),
        ProdutoService.getAll(),
        RepresentadaService.getAll(),
        RepresentanteService.getAll(),
        FormaPagamentoService.getAll(),
        PedidoService.getAll(),
      ]);

      setClientes(clientesData);
      setTransportadoras(transportadorasData);
      setProdutos(produtosData);
      setRepresentadas(representadasData);
      setVendedores(vendedoresData);
      setCondicoes(formasData);
      setPedidos(pedidosData);
      setPedidosLixeira(PedidoService.getLixeira());

      if (!pedidoSelecionado && pedidosData.length > 0) {
        setPedidoSelecionado(pedidosData[0]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do Supabase:', err);
      showToast(err.message || 'Falha ao sincronizar dados com o Supabase.', 'erro');
    } finally {
      setLoadingData(false);
    }
  }, [pedidoSelecionado, showToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers para Pedidos
  const handleNovoPedido = (_tipo: TipoDocumento = 'PEDIDO') => {
    setPedidoParaEditar(null);
    setCurrentTab('novo');
  };

  const handleVisualizarPedido = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setCurrentTab('visualizar');
  };

  const handleEditarPedido = (pedido: Pedido) => {
    if (pedido.status === 'Cancelado') {
      showToast('Pedidos cancelados não podem ser editados.', 'erro');
      return;
    }
    setPedidoParaEditar(pedido);
    setCurrentTab('novo');
  };

  const handleDuplicarPedido = async (pedido: Pedido) => {
    try {
      showToast(`Duplicando pedido ${pedido.numero}...`, 'info');
      const formaEncontrada = condicoes.find((c) => c.nome === pedido.formaPagamento);
      const formaPagamentoId = formaEncontrada?.id;

      const duplicado = await PedidoService.duplicarPedido(pedido, formaPagamentoId);
      await carregarDados();
      showToast(
        `Pedido ${duplicado.numero} criado com sucesso como cópia de ${pedido.numero}!`,
        'sucesso'
      );
      setPedidoSelecionado(duplicado);
      setCurrentTab('visualizar');
    } catch (err: any) {
      console.error('Erro ao duplicar pedido:', err);
      showToast(err.message || 'Erro ao duplicar pedido.', 'erro');
    }
  };

  const handleToggleSituacaoComercial = async (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    const novaSituacao = pedido.situacaoComercial === 'Fechado' ? 'Enviado' : 'Fechado';

    try {
      await PedidoService.toggleSituacaoComercial(id, novaSituacao);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, situacaoComercial: novaSituacao } : p))
      );
      showToast(
        `Situação do pedido ${pedido.numero} alterada para ${novaSituacao.toUpperCase()}.`,
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Falha ao alterar situação comercial.', 'erro');
    }
  };

  // Abre o modal in-app de confirmação de exclusão (sem usar window.confirm que falha em iframes)
  const handleExcluirPedido = (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    setPedidoParaExcluir(pedido);
  };

  // Executa a exclusão confirmada pelo usuário
  const confirmarExclusao = async (id: string) => {
    setIsExcluindo(true);
    const pedido = pedidoParaExcluir || pedidos.find((p) => p.id === id);

    try {
      // 1. Isola na Lixeira persistente e tenta exclusão no Supabase com multi-estratégia
      await PedidoService.deletePedido(id, pedido || undefined);

      // 2. Remove imediatamente da interface local
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      setPedidosLixeira(PedidoService.getLixeira());
      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado(null);
      }

      setPedidoParaExcluir(null);
      showToast(`Pedido ${pedido?.numero || ''} excluído e movido para a Lixeira.`, 'sucesso');
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      // Fallback seguro: garante remoção imediata da interface e envio para a lixeira
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      setPedidosLixeira(PedidoService.getLixeira());
      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado(null);
      }
      setPedidoParaExcluir(null);
      showToast(`Pedido ${pedido?.numero || ''} movido para a Lixeira.`, 'sucesso');
    } finally {
      setIsExcluindo(false);
    }
  };

  // Restaurar pedido da Lixeira
  const handleRestaurarPedido = async (id: string) => {
    try {
      const restaurado = await PedidoService.restaurarPedido(id);
      if (restaurado) {
        setPedidos((prev) => [restaurado, ...prev.filter((p) => p.id !== id)]);
        setPedidosLixeira(PedidoService.getLixeira());
        showToast(`Pedido ${restaurado.numero} restaurado com sucesso!`, 'sucesso');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao restaurar pedido.', 'erro');
    }
  };

  // Esvaziar completamente a Lixeira
  const handleEsvaziarLixeira = async () => {
    try {
      await PedidoService.esvaziarLixeira();
      setPedidosLixeira([]);
      showToast('Lixeira esvaziada com sucesso.', 'sucesso');
    } catch (err: any) {
      showToast(err.message || 'Erro ao esvaziar lixeira.', 'erro');
    }
  };

  // Excluir definitivamente da Lixeira
  const handleExcluirDefinitivo = async (id: string) => {
    try {
      await PedidoService.excluirDefinitivoLixeira(id);
      setPedidosLixeira(PedidoService.getLixeira());
      showToast('Pedido excluído definitivamente.', 'sucesso');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir definitivamente.', 'erro');
    }
  };

  // Abre o modal in-app de confirmação de cancelamento
  const handleCancelarPedido = (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;
    setPedidoParaCancelar(pedido);
  };

  // Executa o cancelamento confirmado pelo usuário
  const confirmarCancelamento = async (id: string) => {
    setIsCancelando(true);
    const pedido = pedidos.find((p) => p.id === id);

    try {
      await PedidoService.cancelarPedido(id);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Cancelado' } : p))
      );
      setPedidoParaCancelar(null);
      showToast(`Pedido ${pedido?.numero || ''} marcado como Cancelado.`, 'info');
    } catch (err: any) {
      setPedidoParaCancelar(null);
      showToast(err.message || 'Falha ao cancelar pedido.', 'erro');
    } finally {
      setIsCancelando(false);
    }
  };

  // Salvar pedido (Rascunho, Emissão Oficial ou Atualização de Pedido Existente)
  const handleSalvarPedido = async (pedido: Pedido, irParaVisualizacao = false) => {
    try {
      let pedidoRetornado: Pedido;

      // Obtém o id da forma de pagamento selecionada
      const formaEncontrada = condicoes.find((c) => c.nome === pedido.formaPagamento);
      const formaPagamentoId = formaEncontrada?.id;

      const isEdicao = Boolean(pedido.id && pedido.id.trim() !== '');

      if (isEdicao) {
        // ATUALIZAÇÃO DE PEDIDO EXISTENTE: Preserva o número oficial (ex: PED000003) e o status
        pedidoRetornado = await PedidoService.atualizarPedido(pedido, formaPagamentoId);
        showToast(`Pedido ${pedidoRetornado.numero} atualizado com sucesso!`, 'sucesso');
      } else if (irParaVisualizacao && pedido.status !== 'Rascunho') {
        // EMISSÃO OFICIAL DE NOVO PEDIDO: consome PED do banco
        pedidoRetornado = await PedidoService.emitirPedido(pedido, formaPagamentoId);
        showToast(`Pedido emitido com sucesso com número oficial ${pedidoRetornado.numero}!`, 'sucesso');
      } else {
        // SALVAR NOVO RASCUNHO
        pedidoRetornado = await PedidoService.saveDraft(pedido, formaPagamentoId);
        showToast(`Rascunho do pedido salvo com sucesso!`, 'sucesso');
      }

      await carregarDados();
      setPedidoSelecionado(pedidoRetornado);
      setPedidoParaEditar(null);

      if (irParaVisualizacao) {
        setCurrentTab('visualizar');
      } else {
        setCurrentTab('relatorios');
      }
    } catch (err: any) {
      console.error('Erro ao salvar pedido:', err);
      const msg = err.message || 'Falha ao salvar pedido no Supabase.';

      if (
        msg.includes('fix_permitir_editar_pedidos.sql') ||
        msg.includes('dados comerciais congelados') ||
        msg.includes('Não é permitido reverter') ||
        msg.includes('imutabilidade') ||
        msg.includes('Operação proibida em itens_pedido')
      ) {
        setModalSqlAviso({
          pedidoId: pedido.id || '',
          pedidoNumero: pedido.numero || '',
          erroMsg: msg,
        });
      } else {
        showToast(msg, 'erro');
      }
    }
  };

  // Handlers para Clientes
  const handleSaveCliente = async (cliente: Cliente) => {
    try {
      let salvo: Cliente;
      if (cliente.id && isValidUUID(cliente.id)) {
        salvo = await ClienteService.update(cliente.id, cliente);
        setClientes((prev) => prev.map((c) => (c.id === salvo.id ? salvo : c)));
      } else {
        salvo = await ClienteService.create(cliente);
        setClientes((prev) => [salvo, ...prev]);
      }
      showToast(`Cliente "${salvo.razaoSocial}" salvo com código ${salvo.codigo}.`);
      await carregarDados();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cliente no Supabase.', 'erro');
    }
  };

  const handleDeleteCliente = async (id: string) => {
    try {
      await ClienteService.delete(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      showToast('Cliente removido.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir cliente.', 'erro');
    }
  };

  // Handlers para Transportadoras
  const handleSaveTransportadora = async (transp: Transportadora) => {
    try {
      const salva = await TransportadoraService.save(transp);
      setTransportadoras((prev) => [salva, ...prev.filter((t) => t.id !== salva.id)]);
      showToast(`Transportadora "${salva.nome}" salva.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar transportadora.', 'erro');
    }
  };

  const handleDeleteTransportadora = async (id: string) => {
    try {
      await TransportadoraService.delete(id);
      setTransportadoras((prev) => prev.filter((t) => t.id !== id));
      showToast('Transportadora removida.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir transportadora.', 'erro');
    }
  };

  // Handlers para Produtos
  const handleSaveProduto = async (prod: Produto) => {
    try {
      const salvo = await ProdutoService.save(prod);
      setProdutos((prev) => [salvo, ...prev.filter((p) => p.id !== salvo.id)]);
      showToast(`Produto "${salvo.descricao}" salvo com código ${salvo.codigoInterno}.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar produto.', 'erro');
    }
  };

  const handleDeleteProduto = async (id: string) => {
    try {
      await ProdutoService.delete(id);
      setProdutos((prev) => prev.filter((p) => p.id !== id));
      showToast('Produto removido.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir produto.', 'erro');
    }
  };

  // Handlers para Formas de Pagamento
  const handleSaveCondicao = async (cond: CondicaoPagamento) => {
    try {
      const salva = await FormaPagamentoService.save(cond);
      setCondicoes((prev) => [salva, ...prev.filter((c) => c.id !== salva.id)]);
      showToast(`Forma de pagamento "${salva.nome}" salva.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar forma de pagamento.', 'erro');
    }
  };

  const handleDeleteCondicao = async (id: string) => {
    try {
      await FormaPagamentoService.delete(id);
      setCondicoes((prev) => prev.filter((c) => c.id !== id));
      showToast('Forma de pagamento removida.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir forma de pagamento.', 'erro');
    }
  };

  // Handlers para Vendedores
  const handleSaveVendedor = async (vend: Representante) => {
    try {
      const salvo = await RepresentanteService.save(vend);
      setVendedores((prev) => [salvo, ...prev.filter((v) => v.id !== salvo.id)]);
      showToast(`Representante "${salvo.nome}" salvo.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar representante.', 'erro');
    }
  };

  const handleDeleteVendedor = async (id: string) => {
    try {
      await RepresentanteService.delete(id);
      setVendedores((prev) => prev.filter((v) => v.id !== id));
      showToast('Representante removido.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir representante.', 'erro');
    }
  };

  // Handlers para Representadas
  const handleSaveRepresentada = async (rep: Representada) => {
    try {
      const salva = await RepresentadaService.save(rep);
      setRepresentadas((prev) => [salva, ...prev.filter((r) => r.id !== salva.id)]);
      showToast(`Representada "${salva.nome}" salva.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar representada.', 'erro');
    }
  };

  const handleDeleteRepresentada = async (id: string) => {
    try {
      await RepresentadaService.delete(id);
      setRepresentadas((prev) => prev.filter((r) => r.id !== id));
      showToast('Representada removida.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir representada.', 'erro');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Barra de Navegação */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNovoClick={handleNovoPedido}
        pedidosCount={pedidos.length}
      />

      {/* Indicador de carregamento assíncrono discreto */}
      {loadingData && (
        <div className="no-print bg-indigo-50 border-b border-indigo-100 px-4 py-1.5 text-center text-xs font-semibold text-indigo-700 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Sincronizando com o banco Supabase...</span>
        </div>
      )}

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="no-print fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border ${
              toastMsg.tipo === 'sucesso'
                ? 'bg-slate-900 border-slate-700'
                : toastMsg.tipo === 'erro'
                ? 'bg-rose-900 border-rose-700'
                : 'bg-slate-900 border-slate-700'
            }`}
          >
            {toastMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toastMsg.tipo === 'erro' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-400" />
            )}
            <span>{toastMsg.texto}</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal (espaçamento inferior extra para navegação mobile) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-12">
        {currentTab === 'novo' && (
          <PedidoForm
            pedidoParaEditar={pedidoParaEditar}
            clientes={clientes}
            transportadoras={transportadoras}
            produtos={produtos}
            representadas={representadas}
            vendedores={vendedores}
            condicoes={condicoes}
            onSaveCliente={handleSaveCliente}
            onSaveTransportadora={handleSaveTransportadora}
            onSaveRepresentada={handleSaveRepresentada}
            onSaveVendedor={handleSaveVendedor}
            onSaveProduto={handleSaveProduto}
            onSaveCondicao={handleSaveCondicao}
            onSavePedido={handleSalvarPedido}
            onCancel={() => {
              setPedidoParaEditar(null);
              setCurrentTab('relatorios');
            }}
            nextNumero={() => 'RASCUNHO'}
          />
        )}

        {currentTab === 'visualizar' && pedidoSelecionado && (
          <PedidoPrintView
            pedido={pedidoSelecionado}
            onBack={() => setCurrentTab('relatorios')}
            onEdit={(p) => handleEditarPedido(p)}
            onDuplicar={(p) => handleDuplicarPedido(p)}
          />
        )}

        {currentTab === 'cadastros' && (
          <CadastrosManager
            clientes={clientes}
            produtos={produtos}
            transportadoras={transportadoras}
            condicoes={condicoes}
            vendedores={vendedores}
            representadas={representadas}
            pedidos={pedidos}
            onSaveCliente={handleSaveCliente}
            onDeleteCliente={handleDeleteCliente}
            onSaveProduto={handleSaveProduto}
            onDeleteProduto={handleDeleteProduto}
            onSaveTransportadora={handleSaveTransportadora}
            onDeleteTransportadora={handleDeleteTransportadora}
            onSaveCondicao={handleSaveCondicao}
            onDeleteCondicao={handleDeleteCondicao}
            onSaveVendedor={handleSaveVendedor}
            onDeleteVendedor={handleDeleteVendedor}
            onSaveRepresentada={handleSaveRepresentada}
            onDeleteRepresentada={handleDeleteRepresentada}
          />
        )}

        {currentTab === 'relatorios' && (
          <RelatoriosView
            pedidos={pedidos}
            pedidosLixeira={pedidosLixeira}
            vendedores={vendedores}
            representadas={representadas}
            onNovoPedido={handleNovoPedido}
            onVisualizar={handleVisualizarPedido}
            onEditar={handleEditarPedido}
            onDuplicar={handleDuplicarPedido}
            onExcluir={handleExcluirPedido}
            onCancelar={handleCancelarPedido}
            onToggleSituacaoComercial={handleToggleSituacaoComercial}
            onRestaurarPedido={handleRestaurarPedido}
            onEsvaziarLixeira={handleEsvaziarLixeira}
            onExcluirDefinitivoLixeira={handleExcluirDefinitivo}
          />
        )}
      </main>

      {/* MODAL DE AJUDA: LIBERAÇÃO DE EDIÇÃO OU EXCLUSÃO NO SUPABASE */}
      {modalSqlAviso && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {modalSqlAviso.erroMsg.includes('editar') || modalSqlAviso.erroMsg.includes('atualizar') || modalSqlAviso.erroMsg.includes('reverter') || modalSqlAviso.erroMsg.includes('congelados')
                      ? 'Liberação de Edição no Supabase'
                      : 'Trava de Exclusão no Supabase'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pedido {modalSqlAviso.pedidoNumero}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSqlAviso(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 leading-relaxed">
              <p className="font-bold text-amber-900">
                Por que isso aconteceu?
              </p>
              <p>
                {modalSqlAviso.erroMsg.includes('editar') || modalSqlAviso.erroMsg.includes('atualizar') || modalSqlAviso.erroMsg.includes('reverter') || modalSqlAviso.erroMsg.includes('congelados')
                  ? 'O seu banco de dados PostgreSQL no Supabase ainda possui gatilhos antigos que congelavam os dados de pedidos emitidos.'
                  : 'O seu banco de dados PostgreSQL no Supabase ainda possui uma regra de integridade antiga que proíbe excluir pedidos cancelados ou emitidos.'}
              </p>
              <p>
                Para liberar a edição e exclusão livre de qualquer pedido no seu Supabase:
              </p>
              <ol className="list-decimal list-inside space-y-1 font-semibold text-slate-800 pt-1">
                <li>Abra o painel do seu projeto no Supabase;</li>
                <li>Clique no menu <strong>SQL Editor</strong> à esquerda;</li>
                <li>Cole o código abaixo e clique em <strong>Run</strong>.</li>
              </ol>
            </div>

            {/* Caixa de Código SQL com botão de copiar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Script de Liberação Total (fix_permitir_editar_pedidos.sql)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sqlCode = `-- Executar no SQL Editor do Supabase para liberar edicao e exclusao:
CREATE OR REPLACE FUNCTION public.fn_proteger_itens_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
        IF OLD.status = 'Emitido' THEN
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;
            IF NEW.status = 'Rascunho' THEN NEW.status := 'Emitido'; END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.excluir_pedido_definitivo(p_pedido_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.itens_pedido WHERE pedido_id = p_pedido_id;
    DELETE FROM public.pedidos WHERE id = p_pedido_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.excluir_pedido_definitivo(UUID) TO authenticated, anon;`;
                    navigator.clipboard.writeText(sqlCode);
                    setCopiouSql(true);
                    setTimeout(() => setCopiouSql(false), 3000);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                >
                  {copiouSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Código SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] max-h-32 overflow-y-auto leading-tight select-all">
                {`-- Libera edicao e exclusao de qualquer pedido no Supabase
CREATE OR REPLACE FUNCTION public.fn_proteger_itens_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
        IF OLD.status = 'Emitido' THEN
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;
            IF NEW.status = 'Rascunho' THEN NEW.status := 'Emitido'; END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalSqlAviso(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Entendido, fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (100% IN-APP, FUNCIONA SEMPRE SEM ALERT/CONFIRM) */}
      {pedidoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Excluir Pedido Definitivamente?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Esta ação removerá o pedido e seus itens
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-500">Documento: </span>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  {pedidoParaExcluir.numero}
                </span>
                <span className="ml-2 text-2xs uppercase px-1.5 py-0.5 rounded bg-slate-200 font-semibold">
                  {pedidoParaExcluir.tipo}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Cliente: </span>
                <span className="font-bold text-slate-900">
                  {pedidoParaExcluir.cliente.razaoSocial}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Valor Total: </span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {formatCurrency(pedidoParaExcluir.totalPedido)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Status atual: </span>
                <span className="font-semibold text-slate-800">
                  {pedidoParaExcluir.status} ({pedidoParaExcluir.situacaoComercial})
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isExcluindo}
                onClick={() => setPedidoParaExcluir(null)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-300 min-h-[42px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isExcluindo}
                onClick={() => confirmarExclusao(pedidoParaExcluir.id)}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-50"
              >
                {isExcluindo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Sim, Excluir Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (100% IN-APP) */}
      {pedidoParaCancelar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Cancelar Pedido?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  O número e o histórico serão preservados
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Deseja marcar o pedido <strong className="font-mono text-slate-800">{pedidoParaCancelar.numero}</strong> como <strong>CANCELADO</strong>?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isCancelando}
                onClick={() => setPedidoParaCancelar(null)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-300 min-h-[42px]"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isCancelando}
                onClick={() => confirmarCancelamento(pedidoParaCancelar.id)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2 min-h-[42px] disabled:opacity-50"
              >
                {isCancelando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
