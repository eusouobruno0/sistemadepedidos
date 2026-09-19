import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavigationTab } from './components/Navbar';
import { PedidoForm } from './components/PedidoForm';
import { PedidosList } from './components/PedidosList';
import { PedidoPrintView } from './components/PedidoPrintView';
import { CadastrosManager } from './components/CadastrosManager';
import { RelatoriosView } from './components/RelatoriosView';
import { StorageService } from './utils/storage';
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
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('novo');

  // Estado dos dados em memória
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

  // Toast temporário de confirmação
  const [toastMsg, setToastMsg] = useState<{ texto: string; tipo: 'sucesso' | 'info' } | null>(
    null
  );

  const showToast = useCallback((texto: string, tipo: 'sucesso' | 'info' = 'sucesso') => {
    setToastMsg({ texto, tipo });
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  }, []);

  // Carregar dados no carregamento inicial
  const carregarDados = useCallback(() => {
    setClientes(StorageService.getClientes());
    setTransportadoras(StorageService.getTransportadoras());
    setProdutos(StorageService.getProdutos());
    setRepresentadas(StorageService.getRepresentadas());
    setVendedores(StorageService.getVendedores());
    setCondicoes(StorageService.getCondicoes());
    const listaPedidos = StorageService.getPedidos();
    setPedidos(listaPedidos);
    if (!pedidoSelecionado && listaPedidos.length > 0) {
      setPedidoSelecionado(listaPedidos[0]);
    }
  }, [pedidoSelecionado]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers para Pedidos
  const handleNovoPedido = (tipo: TipoDocumento = 'ORCAMENTO') => {
    setPedidoParaEditar(null);
    setCurrentTab('novo');
  };

  const handleVisualizarPedido = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setCurrentTab('visualizar');
  };

  const handleEditarPedido = (pedido: Pedido) => {
    setPedidoParaEditar(pedido);
    setCurrentTab('novo');
  };

  const handleDuplicarPedido = (pedido: Pedido) => {
    const novoTipo = pedido.tipo;
    const novoNumero = StorageService.getNextNumero(novoTipo);
    const duplicado: Pedido = {
      ...pedido,
      id: `ped-${Date.now()}`,
      numero: novoNumero,
      status: 'Rascunho',
      dataCadastro: new Date().toISOString(),
      numeroPedidoCliente: '',
    };
    const atualizados = StorageService.savePedido(duplicado);
    setPedidos(atualizados);
    setPedidoParaEditar(duplicado);
    setCurrentTab('novo');
    showToast(`Pedido duplicado como ${novoNumero} em rascunho.`);
  };

  const handleExcluirPedido = (id: string) => {
    const atualizados = StorageService.deletePedido(id);
    setPedidos(atualizados);
    if (pedidoSelecionado?.id === id) {
      setPedidoSelecionado(atualizados[0] || null);
    }
    showToast('Pedido excluído com sucesso.', 'info');
  };

  const handleSalvarPedido = (pedido: Pedido, irParaVisualizacao = false) => {
    const atualizados = StorageService.savePedido(pedido);
    setPedidos(atualizados);
    setPedidoSelecionado(pedido);
    setPedidoParaEditar(null);

    showToast(`${pedido.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'} ${pedido.numero} salvo!`);

    if (irParaVisualizacao) {
      setCurrentTab('visualizar');
    } else {
      setCurrentTab('pedidos');
    }
  };

  // Handlers para Clientes
  const handleSaveCliente = (cliente: Cliente) => {
    const atualizados = StorageService.addCliente(cliente);
    setClientes(atualizados);
    showToast(`Cliente "${cliente.razaoSocial}" salvo.`);
  };

  const handleDeleteCliente = (id: string) => {
    const atualizados = clientes.filter((c) => c.id !== id);
    StorageService.saveClientes(atualizados);
    setClientes(atualizados);
    showToast('Cliente removido.', 'info');
  };

  // Handlers para Transportadoras
  const handleSaveTransportadora = (transp: Transportadora) => {
    const atualizados = StorageService.addTransportadora(transp);
    setTransportadoras(atualizados);
    showToast(`Transportadora "${transp.nome}" salva.`);
  };

  const handleDeleteTransportadora = (id: string) => {
    const atualizados = transportadoras.filter((t) => t.id !== id);
    StorageService.saveTransportadoras(atualizados);
    setTransportadoras(atualizados);
    showToast('Transportadora removida.', 'info');
  };

  // Handlers para Produtos
  const handleSaveProduto = (prod: Produto) => {
    const atualizados = StorageService.addProduto(prod);
    setProdutos(atualizados);
    showToast(`Produto "${prod.descricao}" cadastrado.`);
  };

  const handleDeleteProduto = (id: string) => {
    const atualizados = produtos.filter((p) => p.id !== id);
    StorageService.saveProdutos(atualizados);
    setProdutos(atualizados);
    showToast('Produto removido.', 'info');
  };

  // Handlers para Condições
  const handleSaveCondicao = (cond: CondicaoPagamento) => {
    const atualizados = StorageService.addCondicao(cond);
    setCondicoes(atualizados);
    showToast(`Condição "${cond.nome}" adicionada.`);
  };

  const handleDeleteCondicao = (id: string) => {
    const atualizados = condicoes.filter((c) => c.id !== id);
    StorageService.saveCondicoes(atualizados);
    setCondicoes(atualizados);
    showToast('Condição removida.', 'info');
  };

  // Handlers para Vendedores
  const handleSaveVendedor = (vend: Representante) => {
    const atualizados = StorageService.addVendedor(vend);
    setVendedores(atualizados);
    showToast(`Vendedor "${vend.nome}" salvo.`);
  };

  const handleDeleteVendedor = (id: string) => {
    const atualizados = vendedores.filter((v) => v.id !== id);
    StorageService.saveVendedores(atualizados);
    setVendedores(atualizados);
    showToast('Vendedor removido.', 'info');
  };

  const handleSaveRepresentada = (rep: Representada) => {
    const atualizados = StorageService.addRepresentada(rep);
    setRepresentadas(atualizados);
    showToast(`Representada "${rep.nome}" salva.`);
  };

  // Reset para dados de exemplo do PDF
  const handleResetData = () => {
    if (
      confirm(
        'Deseja restaurar os dados iniciais do exemplo do orçamento (IMT, Metalúrgica Venâncio, etc.)?'
      )
    ) {
      StorageService.resetAll();
      carregarDados();
      showToast('Dados restaurados com o modelo padrão!', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Barra de Navegação */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNovoClick={handleNovoPedido}
        onResetData={handleResetData}
        pedidosCount={pedidos.length}
      />

      {/* Notificação Toast */}
      {toastMsg && (
        <div className="no-print fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700">
            {toastMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
            onSaveProduto={handleSaveProduto}
            onSaveCondicao={handleSaveCondicao}
            onSavePedido={handleSalvarPedido}
            onCancel={() => {
              setPedidoParaEditar(null);
              setCurrentTab('pedidos');
            }}
            nextNumero={(tipo) => StorageService.getNextNumero(tipo)}
          />
        )}

        {currentTab === 'visualizar' && pedidoSelecionado && (
          <PedidoPrintView
            pedido={pedidoSelecionado}
            onBack={() => setCurrentTab('pedidos')}
            onEdit={(p) => handleEditarPedido(p)}
          />
        )}

        {currentTab === 'pedidos' && (
          <PedidosList
            pedidos={pedidos}
            vendedores={vendedores}
            onNovoPedido={handleNovoPedido}
            onVisualizar={handleVisualizarPedido}
            onEditar={handleEditarPedido}
            onDuplicar={handleDuplicarPedido}
            onExcluir={handleExcluirPedido}
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
          />
        )}

        {currentTab === 'relatorios' && (
          <RelatoriosView
            pedidos={pedidos}
            vendedores={vendedores}
            representadas={representadas}
          />
        )}
      </main>
    </div>
  );
}
