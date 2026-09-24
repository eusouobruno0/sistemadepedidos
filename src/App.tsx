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
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
      const duplicado: Pedido = {
        ...pedido,
        id: '',
        numeroSequencial: undefined,
        numero: 'RASCUNHO',
        status: 'Rascunho',
        situacaoComercial: 'Enviado',
        dataCadastro: new Date().toISOString(),
        numeroPedidoIndustria: '',
        ordemCompraCliente: '',
        numeroPedidoCliente: '',
      };
      const salvo = await PedidoService.saveDraft(duplicado);
      await carregarDados();
      setPedidoParaEditar(salvo);
      setCurrentTab('novo');
      showToast('Pedido duplicado em rascunho com sucesso!');
    } catch (err: any) {
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

  const handleExcluirPedido = async (id: string) => {
    const confirmou = window.confirm('Tem certeza que deseja excluir este pedido?');
    if (!confirmou) return;

    try {
      // 1. Exclui no Supabase (primeiro itens_pedido, depois pedidos) e aguarda resposta real
      await PedidoService.deletePedido(id);

      // 2. Se funcionar, remove imediatamente da interface local
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado(null);
      }

      // 3. Refetch dos pedidos a partir do Supabase para atualizar relatórios e listagens
      const pedidosAtualizados = await PedidoService.getAll();
      setPedidos(pedidosAtualizados);

      showToast('Pedido excluído com sucesso.', 'info');
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      // Mostra o erro real retornado pelo Supabase
      showToast(err.message || 'Falha ao excluir pedido.', 'erro');
    }
  };

  const handleCancelarPedido = async (id: string) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return;

    try {
      await PedidoService.cancelarPedido(id);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Cancelado' } : p))
      );
      showToast(`Pedido ${pedido.numero} marcado como Cancelado.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Falha ao cancelar pedido.', 'erro');
    }
  };

  // Salvar pedido (Rascunho ou Emissão Oficial)
  const handleSalvarPedido = async (pedido: Pedido, irParaVisualizacao = false) => {
    try {
      let pedidoRetornado: Pedido;

      // Obtém o id da forma de pagamento selecionada
      const formaEncontrada = condicoes.find((c) => c.nome === pedido.formaPagamento);
      const formaPagamentoId = formaEncontrada?.id;

      if (irParaVisualizacao && pedido.status !== 'Rascunho') {
        // EMISSÃO OFICIAL: consome PED do banco
        pedidoRetornado = await PedidoService.emitirPedido(pedido, formaPagamentoId);
        showToast(`Pedido emitido com sucesso com número oficial ${pedidoRetornado.numero}!`);
      } else {
        // SALVAR RASCUNHO
        pedidoRetornado = await PedidoService.saveDraft(pedido, formaPagamentoId);
        showToast(`Rascunho do pedido salvo com sucesso!`);
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
      showToast(err.message || 'Falha ao salvar pedido no Supabase.', 'erro');
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

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            vendedores={vendedores}
            representadas={representadas}
            onNovoPedido={handleNovoPedido}
            onVisualizar={handleVisualizarPedido}
            onEditar={handleEditarPedido}
            onDuplicar={handleDuplicarPedido}
            onExcluir={handleExcluirPedido}
            onCancelar={handleCancelarPedido}
            onToggleSituacaoComercial={handleToggleSituacaoComercial}
          />
        )}
      </main>
    </div>
  );
}
