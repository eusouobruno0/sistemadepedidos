import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileCheck,
  FileText,
  Building2,
  Phone,
  Mail,
  MapPin,
  Truck,
  CreditCard,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Calculator,
  Loader2,
  User,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import {
  Cliente,
  Produto,
  Transportadora,
  CondicaoPagamento,
  Representada,
  Representante,
  ItemPedido,
  Pedido,
  TipoDocumento,
  StatusPedido,
  SituacaoComercial,
} from '../types';
import {
  formatCnpjCpf,
  formatPhone,
  formatCep,
  formatCurrency,
  formatNumber,
  cleanDigits,
  validateCpfCnpj,
} from '../utils/formatters';
import { TransportadoraModal } from './modals/TransportadoraModal';
import { RepresentadaModal } from './modals/RepresentadaModal';
import { RepresentanteModal } from './modals/RepresentanteModal';
import { ProdutoModal } from './modals/ProdutoModal';
import { CondicaoPagamentoModal } from './modals/CondicaoPagamentoModal';
import { isValidUUID } from '../lib/database';

interface PedidoFormProps {
  pedidoParaEditar?: Pedido | null;
  clientes: Cliente[];
  transportadoras: Transportadora[];
  produtos: Produto[];
  representadas: Representada[];
  vendedores: Representante[];
  condicoes: CondicaoPagamento[];
  onSaveCliente: (cliente: Cliente) => void;
  onSaveTransportadora: (transp: Transportadora) => void;
  onSaveRepresentada?: (rep: Representada) => void;
  onSaveVendedor?: (vend: Representante) => void;
  onSaveProduto: (prod: Produto) => void;
  onSaveCondicao: (cond: CondicaoPagamento) => void;
  onSavePedido: (pedido: Pedido, irParaVisualizacao?: boolean) => void;
  onCancel: () => void;
  nextNumero: (tipo: TipoDocumento) => string;
}

export const PedidoForm: React.FC<PedidoFormProps> = ({
  pedidoParaEditar,
  clientes,
  transportadoras,
  produtos,
  representadas,
  vendedores,
  condicoes,
  onSaveCliente,
  onSaveTransportadora,
  onSaveRepresentada,
  onSaveVendedor,
  onSaveProduto,
  onSaveCondicao,
  onSavePedido,
  onCancel,
  nextNumero,
}) => {
  // Número e Tipo de Documento
  const [tipo, setTipo] = useState<TipoDocumento>(pedidoParaEditar?.tipo || 'PEDIDO');
  const [numero, setNumero] = useState<string>(
    pedidoParaEditar?.numero || nextNumero('PEDIDO')
  );

  // =========================================================
  // 1. ESTADO DOS DADOS DO CLIENTE
  // =========================================================
  const [buscaClienteTermo, setBuscaClienteTermo] = useState<string>('');
  const [resultadosBuscaCliente, setResultadosBuscaCliente] = useState<Cliente[]>([]);
  const [isSearchingCliente, setIsSearchingCliente] = useState<boolean>(false);
  const [clienteOriginal, setClienteOriginal] = useState<Cliente | null>(null);

  const [clienteId, setClienteId] = useState<string>(pedidoParaEditar?.cliente?.id || '');
  const [clienteCodigo, setClienteCodigo] = useState<string>(pedidoParaEditar?.cliente?.codigo || '');
  const [clienteCpfCnpj, setClienteCpfCnpj] = useState<string>(pedidoParaEditar?.cliente?.cnpjCpf || '');
  const [clienteRazaoSocial, setClienteRazaoSocial] = useState<string>(pedidoParaEditar?.cliente?.razaoSocial || '');
  const [clienteNomeFantasia, setClienteNomeFantasia] = useState<string>(pedidoParaEditar?.cliente?.nomeFantasia || '');
  const [clienteTelefone, setClienteTelefone] = useState<string>(pedidoParaEditar?.cliente?.telefone || '');
  const [clienteEmail, setClienteEmail] = useState<string>(pedidoParaEditar?.cliente?.email || '');
  const [clienteRgIe, setClienteRgIe] = useState<string>(pedidoParaEditar?.cliente?.rgIe || '');
  const [clienteCep, setClienteCep] = useState<string>(pedidoParaEditar?.cliente?.cep || '');
  const [clienteEndereco, setClienteEndereco] = useState<string>(pedidoParaEditar?.cliente?.endereco || '');
  const [clienteNumero, setClienteNumero] = useState<string>(pedidoParaEditar?.cliente?.numero || '');
  const [clienteComplemento, setClienteComplemento] = useState<string>(pedidoParaEditar?.cliente?.complemento || '');
  const [clienteBairro, setClienteBairro] = useState<string>(pedidoParaEditar?.cliente?.bairro || '');
  const [clienteCidade, setClienteCidade] = useState<string>(pedidoParaEditar?.cliente?.cidade || '');
  const [clienteEstado, setClienteEstado] = useState<string>(pedidoParaEditar?.cliente?.estado || 'RS');

  const [clienteFeedback, setClienteFeedback] = useState<{
    tipo: 'encontrado' | 'novo' | 'salvo' | 'invalido' | 'erro' | null;
    mensagem: string;
  }>({ tipo: null, mensagem: '' });
  const [isSavingCliente, setIsSavingCliente] = useState<boolean>(false);

  // =========================================================
  // 2. ESTADO DOS DADOS DO PEDIDO
  // =========================================================
  const [numeroPedidoIndustria, setNumeroPedidoIndustria] = useState<string>(
    pedidoParaEditar?.numeroPedidoIndustria || ''
  );
  const [ordemCompraCliente, setOrdemCompraCliente] = useState<string>(
    pedidoParaEditar?.ordemCompraCliente || pedidoParaEditar?.numeroPedidoCliente || ''
  );
  const [situacaoComercial, setSituacaoComercial] = useState<SituacaoComercial>(
    pedidoParaEditar?.situacaoComercial || 'Enviado'
  );
  const [previsaoEntrega, setPrevisaoEntrega] = useState<string>(
    pedidoParaEditar?.dataPrevista ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [representadaId, setRepresentadaId] = useState<string>(
    pedidoParaEditar?.empresaEmissora?.id || representadas[0]?.id || ''
  );
  const [vendedorId, setVendedorId] = useState<string>(
    pedidoParaEditar?.vendedor?.id || vendedores[0]?.id || ''
  );
  const [transportadoraId, setTransportadoraId] = useState<string>(
    pedidoParaEditar?.transportadora?.id || transportadoras[0]?.id || ''
  );
  const [tipoFrete, setTipoFrete] = useState<'CIF' | 'FOB'>(
    pedidoParaEditar?.tipoFrete || 'CIF'
  );
  const [localEntrega, setLocalEntrega] = useState<string>(
    pedidoParaEditar?.localEntrega || ''
  );
  const [formaPagamento, setFormaPagamento] = useState<string>(
    pedidoParaEditar?.formaPagamento || 'Boleto bancário'
  );
  const [condicaoPagamentoLivre, setCondicaoPagamentoLivre] = useState<string>(
    pedidoParaEditar?.condicaoPagamento || '30/60/90 dias'
  );
  const [programado, setProgramado] = useState<boolean>(
    pedidoParaEditar?.programado || false
  );
  const [observacoes, setObservacoes] = useState<string>(
    pedidoParaEditar?.observacoes || ''
  );

  // =========================================================
  // 3. ESTADO DOS PRODUTOS E ITENS DO PEDIDO
  // =========================================================
  const [buscaProdutoTermo, setBuscaProdutoTermo] = useState<string>('');
  const [resultadosBuscaProduto, setResultadosBuscaProduto] = useState<Produto[]>([]);
  const [produtoNaoEncontrado, setProdutoNaoEncontrado] = useState<boolean>(false);
  const [mensagemProdutoAdicionado, setMensagemProdutoAdicionado] = useState<string>('');

  const [itens, setItens] = useState<ItemPedido[]>(() => {
    if (pedidoParaEditar?.itens && pedidoParaEditar.itens.length > 0) {
      return pedidoParaEditar.itens;
    }
    // Item inicial vazio se for novo pedido
    const p = produtos[0];
    if (p) {
      const qtdPorCaixa =
        p.quantidadePorCaixa ||
        (p.qtdMilheiroPorCaixa ? Math.round(p.qtdMilheiroPorCaixa * 1000) : 1000);
      const prMilheiro =
        p.precoMilheiro ||
        (p.precoUnidade
          ? Number((p.precoUnidade * 1000).toFixed(2))
          : p.precoCaixa && qtdPorCaixa > 0
          ? Number(((p.precoCaixa / qtdPorCaixa) * 1000).toFixed(2))
          : 90);
      const prUnidade = Number((prMilheiro / 1000).toFixed(4));
      const prCaixa = Number(((prMilheiro * qtdPorCaixa) / 1000).toFixed(2));
      const ipi = p.aliquotaIpi || 0;
      const valorUnitarioEfetivo =
        p.unidadeMedida === 'UN' ? prUnidade : p.unidadeMedida === 'MIL' ? prMilheiro : prCaixa;
      const valorItens = valorUnitarioEfetivo;
      const valorIpi = Number(((valorItens * ipi) / 100).toFixed(2));

      return [
        {
          id: '',
          produtoId: p.id,
          codigo: p.codigo,
          codigoInterno: p.codigoInterno || '000001',
          descricao: p.descricao,
          referencia: p.referencia || '',
          unidadeMedida: p.unidadeMedida || 'CX',
          quantidade: 1,
          quantidadePorCaixa: qtdPorCaixa,
          precoCaixa: prCaixa,
          precoUnidade: prUnidade,
          precoMilheiro: prMilheiro,
          qtdMilheiro: qtdPorCaixa / 1000,
          precoUnitario: valorUnitarioEfetivo,
          aliquotaIpi: ipi,
          valorItens,
          valorIpi,
          pesoTotalKg: p.pesoUnitarioKg || 0,
        },
      ];
    }
    return [];
  });

  // Modais auxiliares
  const [showTranspModal, setShowTranspModal] = useState<boolean>(false);
  const [showRepresentadaModal, setShowRepresentadaModal] = useState<boolean>(false);
  const [showRepresentanteModal, setShowRepresentanteModal] = useState<boolean>(false);
  const [showProdutoModal, setShowProdutoModal] = useState<boolean>(false);
  const [produtoModalInitialDesc, setProdutoModalInitialDesc] = useState<string>('');
  const [showCondicaoModal, setShowCondicaoModal] = useState<boolean>(false);
  const [isSubmittingPedido, setIsSubmittingPedido] = useState<boolean>(false);

  // Inicialização de cliente para edição
  useEffect(() => {
    if (pedidoParaEditar?.cliente) {
      const c = pedidoParaEditar.cliente;
      setClienteOriginal(c);
      setClienteId(c.id);
      setClienteCodigo(c.codigo || '');
      setClienteCpfCnpj(c.cnpjCpf);
      setClienteRazaoSocial(c.razaoSocial);
      setClienteNomeFantasia(c.nomeFantasia || '');
      setClienteTelefone(c.telefone || '');
      setClienteEmail(c.email || '');
      setClienteRgIe(c.rgIe || '');
      setClienteCep(c.cep || '');
      setClienteEndereco(c.endereco || '');
      setClienteNumero(c.numero || '');
      setClienteComplemento(c.complemento || '');
      setClienteBairro(c.bairro || '');
      setClienteCidade(c.cidade || '');
      setClienteEstado(c.estado || 'RS');
    }
  }, [pedidoParaEditar]);

  // Garante seleção do Representante Padrão do Supabase (ex: Douglas ou primeiro disponível)
  useEffect(() => {
    if (vendedores.length > 0) {
      const vendedorAtualExiste = vendedores.some((v) => v.id === vendedorId);
      if (!vendedorAtualExiste || !vendedorId || !isValidUUID(vendedorId)) {
        const douglas = vendedores.find((v) => v.nome.toLowerCase().includes('douglas'));
        setVendedorId(douglas ? douglas.id : vendedores[0].id);
      }
    }
  }, [vendedores, vendedorId]);

  // Garante seleção da Representada padrão
  useEffect(() => {
    if (representadas.length > 0) {
      const repExiste = representadas.some((r) => r.id === representadaId);
      if (!repExiste || !representadaId || !isValidUUID(representadaId)) {
        setRepresentadaId(representadas[0].id);
      }
    }
  }, [representadas, representadaId]);

  // Garante seleção da Transportadora padrão
  useEffect(() => {
    if (transportadoras.length > 0) {
      const transpExiste = transportadoras.some((t) => t.id === transportadoraId);
      if (!transpExiste || !transportadoraId || !isValidUUID(transportadoraId)) {
        setTransportadoraId(transportadoras[0].id);
      }
    }
  }, [transportadoras, transportadoraId]);

  // Atualiza o local de entrega automaticamente se estiver em branco ao preencher endereço do cliente
  useEffect(() => {
    if (!localEntrega && clienteEndereco) {
      const montado = [
        clienteEndereco,
        clienteNumero ? `nº ${clienteNumero}` : '',
        clienteBairro ? `- ${clienteBairro}` : '',
        clienteCidade ? `${clienteCidade}/${clienteEstado}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      setLocalEntrega(montado);
    }
  }, [clienteEndereco, clienteNumero, clienteBairro, clienteCidade, clienteEstado, localEntrega]);

  // Detecta se os dados de um cliente existente foram alterados durante o pedido
  const clienteFoiAlteradoManualmente = useMemo(() => {
    if (!clienteOriginal || !clienteId) return false;
    return (
      clienteRazaoSocial.trim() !== (clienteOriginal.razaoSocial || '').trim() ||
      clienteNomeFantasia.trim() !== (clienteOriginal.nomeFantasia || '').trim() ||
      cleanDigits(clienteCpfCnpj) !== cleanDigits(clienteOriginal.cnpjCpf || '') ||
      clienteTelefone.trim() !== (clienteOriginal.telefone || '').trim() ||
      clienteEmail.trim() !== (clienteOriginal.email || '').trim() ||
      clienteEndereco.trim() !== (clienteOriginal.endereco || '').trim() ||
      clienteNumero.trim() !== (clienteOriginal.numero || '').trim() ||
      clienteCidade.trim() !== (clienteOriginal.cidade || '').trim() ||
      clienteEstado.trim() !== (clienteOriginal.estado || '').trim()
    );
  }, [
    clienteOriginal,
    clienteId,
    clienteRazaoSocial,
    clienteNomeFantasia,
    clienteCpfCnpj,
    clienteTelefone,
    clienteEmail,
    clienteEndereco,
    clienteNumero,
    clienteCidade,
    clienteEstado,
  ]);

  // =========================================================
  // 1.1 LÓGICA DE PESQUISA UNIFICADA DE CLIENTES
  // =========================================================
  const selecionarCliente = (encontrado: Cliente) => {
    setClienteOriginal(encontrado);
    setClienteId(encontrado.id);
    setClienteCodigo(encontrado.codigo || '');
    setClienteCpfCnpj(formatCnpjCpf(encontrado.cnpjCpf));
    setClienteRazaoSocial(encontrado.razaoSocial || '');
    setClienteNomeFantasia(encontrado.nomeFantasia || '');
    setClienteTelefone(formatPhone(encontrado.telefone || encontrado.celular || ''));
    setClienteEmail(encontrado.email || '');
    setClienteRgIe(encontrado.rgIe || '');
    setClienteCep(formatCep(encontrado.cep || ''));
    setClienteEndereco(encontrado.endereco || '');
    setClienteNumero(encontrado.numero || '');
    setClienteComplemento(encontrado.complemento || '');
    setClienteBairro(encontrado.bairro || '');
    setClienteCidade(encontrado.cidade || '');
    setClienteEstado(encontrado.estado || 'RS');

    if (!localEntrega) {
      const enderecoCompleto = [
        encontrado.endereco,
        encontrado.numero ? `nº ${encontrado.numero}` : '',
        encontrado.bairro ? `- ${encontrado.bairro}` : '',
        encontrado.cidade ? `${encontrado.cidade}/${encontrado.estado}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      setLocalEntrega(enderecoCompleto);
    }

    setResultadosBuscaCliente([]);
    setClienteFeedback({
      tipo: 'encontrado',
      mensagem: `Cliente selecionado: Cód. ${encontrado.codigo} — ${encontrado.razaoSocial}`,
    });
  };

  const handlePesquisarCliente = () => {
    const termo = buscaClienteTermo.trim();
    if (!termo) {
      setClienteFeedback({
        tipo: 'erro',
        mensagem: 'Digite o código interno, CPF/CNPJ ou nome para pesquisar.',
      });
      return;
    }

    setIsSearchingCliente(true);
    setClienteFeedback({ tipo: null, mensagem: '' });
    setResultadosBuscaCliente([]);

    setTimeout(() => {
      setIsSearchingCliente(false);
      const cleanTermo = termo.toLowerCase();
      const cleanDigitsTermo = cleanDigits(termo);

      const encontrados = clientes.filter((c) => {
        const codSemZeros = (c.codigo || '').replace(/^0+/, '');
        const qSemZeros = cleanTermo.replace(/^0+/, '');
        if (c.codigo?.toLowerCase() === cleanTermo || (qSemZeros && codSemZeros === qSemZeros)) return true;
        if (cleanDigitsTermo.length >= 3) {
          const cleanDoc = (c.cnpjCpf || '').replace(/\D/g, '');
          if (cleanDoc.includes(cleanDigitsTermo)) return true;
        }
        if (c.razaoSocial?.toLowerCase().includes(cleanTermo)) return true;
        if (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(cleanTermo)) return true;
        return false;
      });

      if (encontrados.length === 1) {
        // Encontrou exatamente um cliente de maneira inequívoca
        selecionarCliente(encontrados[0]);
      } else if (encontrados.length > 1) {
        // Múltiplos resultados encontrados
        setResultadosBuscaCliente(encontrados);
        setClienteFeedback({
          tipo: 'encontrado',
          mensagem: `${encontrados.length} clientes encontrados. Escolha abaixo qual deseja selecionar:`,
        });
      } else {
        // Nenhum cliente encontrado
        setResultadosBuscaCliente([]);
        const digits = cleanDigits(termo);
        if (digits.length >= 9) {
          setClienteCpfCnpj(formatCnpjCpf(digits));
        } else {
          setClienteRazaoSocial(termo.toUpperCase());
        }
        setClienteId('');
        setClienteCodigo('');
        setClienteOriginal(null);

        setClienteFeedback({
          tipo: 'novo',
          mensagem: 'Cliente não cadastrado. Preencha os dados abaixo para cadastrá-lo com facilidade.',
        });
      }
    }, 150);
  };

  // Salvar cliente no sistema (botão no final dos dados cadastrais)
  const handleSalvarCliente = (atualizarPermanenteApenas = false) => {
    if (!clienteRazaoSocial.trim()) {
      setClienteFeedback({
        tipo: 'erro',
        mensagem: 'O campo Nome / Razão Social é obrigatório para salvar o cliente.',
      });
      return;
    }

    setIsSavingCliente(true);

    const novoCliente: Cliente = {
      id: clienteId || '',
      codigo: clienteCodigo || '',
      cnpjCpf: formatCnpjCpf(clienteCpfCnpj),
      razaoSocial: clienteRazaoSocial.toUpperCase().trim(),
      nomeFantasia: clienteNomeFantasia ? clienteNomeFantasia.toUpperCase().trim() : undefined,
      telefone: clienteTelefone.trim(),
      celular: clienteTelefone.trim(),
      email: clienteEmail.toLowerCase().trim() || undefined,
      rgIe: clienteRgIe.trim(),
      cep: formatCep(clienteCep),
      endereco: clienteEndereco.trim(),
      numero: clienteNumero.trim(),
      complemento: clienteComplemento.trim() || undefined,
      bairro: clienteBairro.trim(),
      cidade: clienteCidade.trim(),
      estado: (clienteEstado.trim() || 'RS').toUpperCase().slice(0, 2),
      localEntregaPadrao: localEntrega || undefined,
    };

    onSaveCliente(novoCliente);
    setIsSavingCliente(false);
    setClienteFeedback({
      tipo: 'salvo',
      mensagem: `Cliente salvo com sucesso no banco de dados.`,
    });
  };

  // =========================================================
  // 3.1 LÓGICA DE PESQUISA E ADIÇÃO DE PRODUTOS
  // =========================================================
  const adicionarProdutoAoPedido = (p: Produto) => {
    const qtdPorCaixa =
      p.quantidadePorCaixa ||
      (p.qtdMilheiroPorCaixa ? Math.round(p.qtdMilheiroPorCaixa * 1000) : 1000);
    const prMilheiro =
      p.precoMilheiro ||
      (p.precoUnidade
        ? Number((p.precoUnidade * 1000).toFixed(2))
        : p.precoCaixa && qtdPorCaixa > 0
        ? Number(((p.precoCaixa / qtdPorCaixa) * 1000).toFixed(2))
        : 90);
    const prUnidade = Number((prMilheiro / 1000).toFixed(4));
    const prCaixa = Number(((prMilheiro * qtdPorCaixa) / 1000).toFixed(2));
    const ipi = p.aliquotaIpi || 0;
    const valorUnitarioEfetivo =
      p.unidadeMedida === 'UN' ? prUnidade : p.unidadeMedida === 'MIL' ? prMilheiro : prCaixa;
    const valorItens = valorUnitarioEfetivo;
    const valorIpi = Number(((valorItens * ipi) / 100).toFixed(2));

    const novoItem: ItemPedido = {
      id: '',
      produtoId: p.id,
      codigo: p.codigo,
      codigoInterno: p.codigoInterno,
      descricao: p.descricao,
      referencia: p.referencia || '',
      unidadeMedida: p.unidadeMedida || 'CX',
      quantidade: 1,
      quantidadePorCaixa: qtdPorCaixa,
      precoCaixa: prCaixa,
      precoUnidade: prUnidade,
      precoMilheiro: prMilheiro,
      qtdMilheiro: qtdPorCaixa / 1000,
      precoUnitario: valorUnitarioEfetivo,
      aliquotaIpi: ipi,
      valorItens,
      valorIpi,
      pesoTotalKg: p.pesoUnitarioKg || 0,
    };

    setItens((prev) => [...prev, novoItem]);
    setResultadosBuscaProduto([]);
    setProdutoNaoEncontrado(false);
    setBuscaProdutoTermo('');
    setMensagemProdutoAdicionado(`Produto "${p.descricao}" adicionado ao pedido!`);
    setTimeout(() => setMensagemProdutoAdicionado(''), 4000);
  };

  const handlePesquisarProduto = () => {
    const termo = buscaProdutoTermo.trim();
    if (!termo) {
      setResultadosBuscaProduto([]);
      setProdutoNaoEncontrado(false);
      return;
    }

    const cleanQ = termo.toLowerCase();
    const cleanQSemZeros = cleanQ.replace(/^0+/, '');

    // Filtra produtos respeitando a representada do pedido (se já selecionada)
    const produtosFiltrados = representadaId
      ? produtos.filter((p) => !p.representadaId || p.representadaId === representadaId)
      : produtos;

    const encontrados = produtosFiltrados.filter((p) => {
      const codIntSemZeros = (p.codigoInterno || '').replace(/^0+/, '');
      if (p.codigoInterno?.toLowerCase() === cleanQ || (cleanQSemZeros && codIntSemZeros === cleanQSemZeros)) return true;
      if (p.codigo && p.codigo.toLowerCase().includes(cleanQ)) return true;
      if (p.descricao && p.descricao.toLowerCase().includes(cleanQ)) return true;
      if (p.referencia && p.referencia.toLowerCase().includes(cleanQ)) return true;
      return false;
    });

    if (encontrados.length === 1) {
      // Exatamente 1 produto encontrado: adiciona diretamente ao pedido!
      adicionarProdutoAoPedido(encontrados[0]);
    } else if (encontrados.length > 1) {
      setResultadosBuscaProduto(encontrados);
      setProdutoNaoEncontrado(false);
    } else {
      setResultadosBuscaProduto([]);
      setProdutoNaoEncontrado(true);
    }
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  // Edição segura de item no pedido (Lógica invertida: milheiro cadastra, sistema soma caixa)
  const atualizarItemPedido = (
    index: number,
    campo: 'quantidade' | 'unidadeMedida' | 'precoMilheiro' | 'precoCaixa' | 'aliquotaIpi',
    valor: any
  ) => {
    const novos = [...itens];
    const item = { ...novos[index] };
    const pOriginal = produtos.find((prod) => prod.id === item.produtoId);
    const qtdPorCx = item.quantidadePorCaixa || pOriginal?.quantidadePorCaixa || 1000;

    if (campo === 'quantidade') {
      const qtd = Math.max(1, Number(valor) || 1);
      item.quantidade = qtd;
      if (pOriginal) {
        item.pesoTotalKg = (pOriginal.pesoUnitarioKg || 0) * qtd;
      }
    } else if (campo === 'unidadeMedida') {
      const novaUn = valor as string;
      item.unidadeMedida = novaUn;
      if (novaUn === 'UN') {
        item.precoUnitario = item.precoUnidade || Number(((item.precoMilheiro || 0) / 1000).toFixed(4));
      } else if (novaUn === 'MIL') {
        item.precoUnitario = item.precoMilheiro || 0;
      } else {
        item.precoUnitario = item.precoCaixa || 0;
      }
    } else if (campo === 'precoMilheiro') {
      // ENTRADA PRINCIPAL: Altera o Milheiro -> Sistema recalcula e soma a Caixa
      const prMil = Math.max(0, Number(valor) || 0);
      item.precoMilheiro = prMil;
      item.precoUnidade = Number((prMil / 1000).toFixed(4));
      item.precoCaixa = Number(((prMil * qtdPorCx) / 1000).toFixed(2));
      item.precoUnitario =
        item.unidadeMedida === 'UN'
          ? item.precoUnidade
          : item.unidadeMedida === 'MIL'
          ? prMil
          : item.precoCaixa;
    } else if (campo === 'precoCaixa') {
      // Ajuste direto da Caixa -> sincroniza Milheiro
      const prCx = Math.max(0, Number(valor) || 0);
      item.precoCaixa = prCx;
      item.precoUnidade = Number((prCx / Math.max(1, qtdPorCx)).toFixed(4));
      item.precoMilheiro = Number((item.precoUnidade * 1000).toFixed(2));
      item.precoUnitario =
        item.unidadeMedida === 'UN'
          ? item.precoUnidade
          : item.unidadeMedida === 'MIL'
          ? item.precoMilheiro
          : prCx;
    } else if (campo === 'aliquotaIpi') {
      item.aliquotaIpi = Math.max(0, Number(valor) || 0);
    }

    // Recálculo do Subtotal e IPI
    const qtd = item.quantidade || 1;
    const precoEfetivo = item.precoUnitario || 0;
    const aliquotaIpi = item.aliquotaIpi || 0;

    item.valorItens = Number((qtd * precoEfetivo).toFixed(2));
    item.valorIpi = Number(((item.valorItens * aliquotaIpi) / 100).toFixed(2));

    novos[index] = item;
    setItens(novos);
  };

  // =========================================================
  // 4. TOTAIS E CÁLCULOS FINANCEIROS (IPI Segregado)
  // =========================================================
  const totais = useMemo(() => {
    const totalItens = itens.reduce((acc, it) => acc + (it.valorItens || 0), 0);
    const totalIpi = itens.reduce((acc, it) => acc + (it.valorIpi || 0), 0);
    const pesoTotalKg = itens.reduce((acc, it) => acc + (it.pesoTotalKg || 0), 0);
    const totalPedido = Number((totalItens + totalIpi).toFixed(2));

    return {
      totalItens: Number(totalItens.toFixed(2)),
      totalIpi: Number(totalIpi.toFixed(2)),
      pesoTotalKg: Number(pesoTotalKg.toFixed(2)),
      totalPedido,
    };
  }, [itens]);

  // =========================================================
  // FINALIZAÇÃO DO PEDIDO
  // =========================================================
  const handleFinalizarPedido = (statusAlvo: StatusPedido, irParaVisualizacao: boolean) => {
    if (!clienteRazaoSocial.trim()) {
      alert('Por favor, informe a Razão Social ou Nome do cliente antes de gerar o pedido.');
      return;
    }

    if (itens.length === 0) {
      alert('Adicione pelo menos um produto ao pedido.');
      return;
    }

    setIsSubmittingPedido(true);

    const transp = transportadoras.find((t) => t.id === transportadoraId) || transportadoras[0];
    const vendedorEncontrado =
      vendedores.find((v) => v.id === vendedorId) ||
      vendedores.find((v) => v.nome.toLowerCase().includes('douglas')) ||
      vendedores[0];

    const vendedor = vendedorEncontrado
      ? {
          id: vendedorEncontrado.id,
          nome: vendedorEncontrado.nome,
          comissaoPadrao: vendedorEncontrado.comissaoPadrao || 5.0,
        }
      : {
          id: '',
          nome: 'Douglas',
          comissaoPadrao: 5.0,
        };

    const codigoClienteGarantido =
      clienteCodigo && clienteCodigo.trim() !== ''
        ? clienteCodigo
        : '';

    const clienteSnapshot: Cliente = {
      id: clienteId || '',
      codigo: codigoClienteGarantido,
      cnpjCpf: formatCnpjCpf(clienteCpfCnpj),
      razaoSocial: clienteRazaoSocial.toUpperCase().trim(),
      nomeFantasia: clienteNomeFantasia ? clienteNomeFantasia.toUpperCase().trim() : undefined,
      telefone: clienteTelefone.trim(),
      celular: clienteTelefone.trim(),
      email: clienteEmail.toLowerCase().trim() || undefined,
      rgIe: clienteRgIe.trim(),
      cep: formatCep(clienteCep),
      endereco: clienteEndereco.trim(),
      numero: clienteNumero.trim(),
      complemento: clienteComplemento.trim() || undefined,
      bairro: clienteBairro.trim(),
      cidade: clienteCidade.trim(),
      estado: (clienteEstado.trim() || 'RS').toUpperCase().slice(0, 2),
      localEntregaPadrao: localEntrega || undefined,
    };

    const transpFinal =
      transp ||
      transportadoras.find((t) => t.id === transportadoraId) ||
      transportadoras[0];

    const empresaFinal =
      representadas.find((r) => r.id === representadaId) ||
      pedidoParaEditar?.empresaEmissora ||
      representadas[0];

    if (!empresaFinal) {
      alert('Por favor, selecione ou cadastre uma representada antes de gerar o pedido.');
      setIsSubmittingPedido(false);
      return;
    }

    const industriaNum = numeroPedidoIndustria.trim();
    const ocCliente = ordemCompraCliente.trim();
    const pedidoSalvo: Pedido = {
      id: pedidoParaEditar?.id || '',
      numeroSequencial: pedidoParaEditar?.numeroSequencial,
      numero: pedidoParaEditar?.numero || (statusAlvo === 'Rascunho' ? 'RASCUNHO' : numero),
      tipo,
      status: statusAlvo,
      situacaoComercial,
      dataCadastro: pedidoParaEditar?.dataCadastro || new Date().toISOString(),
      dataPrevista: previsaoEntrega,
      numeroPedidoIndustria: industriaNum,
      ordemCompraCliente: ocCliente,
      numeroPedidoCliente: ocCliente,
      empresaEmissora: empresaFinal,
      cliente: clienteSnapshot,
      localEntrega: localEntrega.trim(),
      transportadora: transpFinal,
      tipoFrete,
      vendedor,
      formaPagamento: formaPagamento.trim(),
      condicaoPagamento: condicaoPagamentoLivre.trim(),
      itens,
      totalItens: totais.totalItens,
      frete: 0,
      totalAcrescimos: 0,
      substituicaoTributaria: 0,
      totalIpi: totais.totalIpi,
      totalPedido: totais.totalPedido,
      pesoTotalKg: totais.pesoTotalKg,
      programado,
      observacoes: observacoes.trim(),
    };

    setTimeout(() => {
      setIsSubmittingPedido(false);
      onSavePedido(pedidoSalvo, irParaVisualizacao);
    }, 150);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 text-slate-900">
      {/* Título Principal */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            Emissão Comercial
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {pedidoParaEditar ? `Editar ${pedidoParaEditar.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'}` : 'Novo Pedido de Venda'}
          </h1>
          <p className="text-base text-slate-600 mt-1">
            Sistema ágil com preenchimento simplificado e cálculos automáticos de caixa e unidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border-2 border-slate-300 rounded-xl px-4 py-2.5 shadow-xs">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              Nº do Pedido
            </span>
            <span className="text-xl font-black text-indigo-700 tracking-wider font-mono">
              {numero}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              Gerado automaticamente pelo sistema
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* ========================================================= */}
        {/* 1. SEÇÃO DO CLIENTE                                      */}
        {/* ========================================================= */}
        <section
          id="secao-cliente"
          className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs"
        >
          {/* Cabeçalho Limpo da Seção 1 (SEM o botão de salvar no topo) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Dados do Cliente
                  </h2>
                  {clienteCodigo && (
                    <span className="px-3 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold text-xs rounded-full border border-indigo-200">
                      Cód. {clienteCodigo}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  Pesquise por código, CPF/CNPJ ou nome para localizar, ou preencha para cadastrar
                </p>
              </div>
            </div>
          </div>

          {/* ÁREA DE PESQUISA UNIFICADA DE CLIENTES */}
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-5 mb-6">
            <label
              htmlFor="busca-cliente-input"
              className="block text-base font-black text-slate-900 uppercase tracking-wide mb-2"
            >
              BUSCAR CLIENTE
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="busca-cliente-input"
                  value={buscaClienteTermo}
                  onChange={(e) => setBuscaClienteTermo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePesquisarCliente();
                    }
                  }}
                  placeholder="Digite o código interno (ex: 000483), CPF/CNPJ ou Razão Social..."
                  className="w-full h-13 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
                />
              </div>

              <button
                type="button"
                id="btn-pesquisar-cliente"
                onClick={handlePesquisarCliente}
                disabled={isSearchingCliente}
                className="h-13 px-8 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSearchingCliente ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span>Pesquisar</span>
              </button>
            </div>

            {/* MENSAGEM DE STATUS / ORIENTAÇÃO */}
            {clienteFeedback.tipo && (
              <div
                className={`mt-4 p-4 rounded-xl flex items-start gap-3 border-2 ${
                  clienteFeedback.tipo === 'encontrado' || clienteFeedback.tipo === 'salvo'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : clienteFeedback.tipo === 'novo'
                    ? 'bg-blue-50 border-blue-300 text-blue-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {clienteFeedback.tipo === 'encontrado' || clienteFeedback.tipo === 'salvo' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-base">{clienteFeedback.mensagem}</p>
                </div>
              </div>
            )}

            {/* LISTA DE MÚLTIPLOS RESULTADOS DE CLIENTES */}
            {resultadosBuscaCliente.length > 0 && (
              <div className="mt-4 bg-white border-2 border-indigo-300 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-black text-indigo-900 uppercase block">
                  Selecione um dos clientes encontrados:
                </span>
                <div className="divide-y divide-slate-200 max-h-72 overflow-y-auto pr-1">
                  {resultadosBuscaCliente.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-sm">
                            Cód. {c.codigo}
                          </span>
                          <span className="font-black text-slate-900 text-base">
                            {c.razaoSocial}
                          </span>
                          {c.nomeFantasia && (
                            <span className="text-xs font-medium text-slate-500">
                              ({c.nomeFantasia})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1 flex flex-wrap gap-x-4">
                          <span>CNPJ/CPF: {formatCnpjCpf(c.cnpjCpf)}</span>
                          <span>
                            {c.cidade}/{c.estado}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => selecionarCliente(c)}
                        className="h-10 px-5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
                      >
                        <Check className="w-4 h-4" />
                        <span>Selecionar</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CAMPOS DE DADOS CADASTRAIS DO CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* CÓDIGO INTERNO (GERADO AUTOMATICAMENTE PELO SISTEMA) */}
            <div className="md:col-span-3">
              <label
                htmlFor="cliente-codigo-display"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Cód. Interno
              </label>
              <div className="h-12 px-4 bg-slate-100 border-2 border-slate-300 rounded-xl flex items-center justify-between">
                <span className="font-mono font-black text-base text-slate-800">
                  {clienteCodigo || 'Será gerado'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                  Automático
                </span>
              </div>
            </div>

            {/* CPF / CNPJ */}
            <div className="md:col-span-4">
              <label
                htmlFor="cliente-cpf-cnpj"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                CPF / CNPJ <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="cliente-cpf-cnpj"
                value={clienteCpfCnpj}
                onChange={(e) => setClienteCpfCnpj(formatCnpjCpf(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="w-full h-12 px-4 text-base font-mono font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Nome / Razão Social */}
            <div className="md:col-span-5">
              <label
                htmlFor="cliente-razao-social"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Nome / Razão Social <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="cliente-razao-social"
                value={clienteRazaoSocial}
                onChange={(e) => setClienteRazaoSocial(e.target.value)}
                placeholder="Ex: METALURGICA VENANCIO LTDA"
                className="w-full h-12 px-4 text-base font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden uppercase"
              />
            </div>

            {/* Nome Fantasia */}
            <div className="md:col-span-4">
              <label
                htmlFor="cliente-nome-fantasia"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Nome Fantasia
              </label>
              <input
                type="text"
                id="cliente-nome-fantasia"
                value={clienteNomeFantasia}
                onChange={(e) => setClienteNomeFantasia(e.target.value)}
                placeholder="Ex: VENANCIO METAL"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden uppercase"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div className="md:col-span-4">
              <label
                htmlFor="cliente-telefone"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                id="cliente-telefone"
                value={clienteTelefone}
                onChange={(e) => setClienteTelefone(formatPhone(e.target.value))}
                placeholder="(51) 99999-9999"
                className="w-full h-12 px-4 text-base font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Inscrição Estadual / RG */}
            <div className="md:col-span-4">
              <label
                htmlFor="cliente-rg-ie"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Inscrição Estadual / RG
              </label>
              <input
                type="text"
                id="cliente-rg-ie"
                value={clienteRgIe}
                onChange={(e) => setClienteRgIe(e.target.value)}
                placeholder="Ex: 108/0073280 ou Isento"
                className="w-full h-12 px-4 text-base font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden uppercase"
              />
            </div>

            {/* E-mail */}
            <div className="md:col-span-6">
              <label
                htmlFor="cliente-email"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                E-mail para Envio
              </label>
              <input
                type="email"
                id="cliente-email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="compras@empresa.com.br"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* CEP */}
            <div className="md:col-span-6">
              <label
                htmlFor="cliente-cep"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                CEP
              </label>
              <input
                type="text"
                id="cliente-cep"
                value={clienteCep}
                onChange={(e) => setClienteCep(formatCep(e.target.value))}
                placeholder="95800-000"
                className="w-full h-12 px-4 text-base font-mono bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-6">
              <label
                htmlFor="cliente-endereco"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Endereço
              </label>
              <input
                type="text"
                id="cliente-endereco"
                value={clienteEndereco}
                onChange={(e) => setClienteEndereco(e.target.value)}
                placeholder="Rua / Avenida"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Número */}
            <div className="md:col-span-2">
              <label
                htmlFor="cliente-numero"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Número
              </label>
              <input
                type="text"
                id="cliente-numero"
                value={clienteNumero}
                onChange={(e) => setClienteNumero(e.target.value)}
                placeholder="1000"
                className="w-full h-12 px-4 text-base font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Bairro */}
            <div className="md:col-span-4">
              <label
                htmlFor="cliente-bairro"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Bairro
              </label>
              <input
                type="text"
                id="cliente-bairro"
                value={clienteBairro}
                onChange={(e) => setClienteBairro(e.target.value)}
                placeholder="Distrito Industrial"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Cidade */}
            <div className="md:col-span-5">
              <label
                htmlFor="cliente-cidade"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Cidade
              </label>
              <input
                type="text"
                id="cliente-cidade"
                value={clienteCidade}
                onChange={(e) => setClienteCidade(e.target.value)}
                placeholder="Porto Alegre"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* UF */}
            <div className="md:col-span-2">
              <label
                htmlFor="cliente-uf"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                UF
              </label>
              <input
                type="text"
                id="cliente-uf"
                maxLength={2}
                value={clienteEstado}
                onChange={(e) => setClienteEstado(e.target.value.toUpperCase())}
                placeholder="RS"
                className="w-full h-12 px-4 text-base font-bold text-center bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Complemento */}
            <div className="md:col-span-5">
              <label
                htmlFor="cliente-complemento"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Complemento
              </label>
              <input
                type="text"
                id="cliente-complemento"
                value={clienteComplemento}
                onChange={(e) => setClienteComplemento(e.target.value)}
                placeholder="Galpão B, Sala 10"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>
          </div>

          {/* PAINEL DE SALVAR CLIENTE (LOCALIZADO NO FINAL DOS DADOS CADASTRAIS) */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/80 p-5 rounded-2xl">
            <div>
              <span className="text-sm font-bold text-slate-900 block">
                {clienteId ? 'Status do Cadastro do Cliente' : 'Cadastro Rápido de Novo Cliente'}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {clienteId
                  ? clienteFoiAlteradoManualmente
                    ? 'Dados alterados para este pedido. Você pode atualizar o cadastro permanente se desejar.'
                    : `Cliente carregado do sistema (Cód. ${clienteCodigo}).`
                  : 'Ao clicar em salvar, um código sequencial será gerado sem sair da tela.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {clienteId && clienteFoiAlteradoManualmente && (
                <button
                  type="button"
                  id="btn-atualizar-cliente-permanente"
                  onClick={() => handleSalvarCliente(true)}
                  disabled={isSavingCliente}
                  className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Salvar alterações no cadastro permanente
                </button>
              )}

              <button
                type="button"
                id="btn-salvar-cliente-final"
                onClick={() => handleSalvarCliente(false)}
                disabled={isSavingCliente}
                className="px-7 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-base shadow-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingCliente ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 text-indigo-400" />
                )}
                <span>{clienteId ? 'Salvar Cliente' : 'SALVAR CLIENTE'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. SEÇÃO DADOS DO PEDIDO                                 */}
        {/* ========================================================= */}
        <section
          id="secao-dados-pedido"
          className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-lg">
              2
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Dados do Pedido
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Prazos, frete, transportadora e condições comerciais
              </p>
            </div>
          </div>

          {/* SELETOR DE SITUAÇÃO COMERCIAL (ENVIADO / FECHADO) */}
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Situação Comercial da Negociação <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Classificação para acompanhamento do funil de vendas (independente do status técnico do pedido)
                </p>
              </div>

              <div className="inline-flex p-1 bg-white border-2 border-slate-300 rounded-xl gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSituacaoComercial('Enviado')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    situacaoComercial === 'Enviado'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>PEDIDO ENVIADO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSituacaoComercial('Fechado')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    situacaoComercial === 'Fechado'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PEDIDO FECHADO</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* ORDEM DE COMPRA DO CLIENTE */}
            <div className="md:col-span-4">
              <label
                htmlFor="pedido-ordem-compra"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Ordem de Compra do Cliente
              </label>
              <input
                type="text"
                id="pedido-ordem-compra"
                value={ordemCompraCliente}
                onChange={(e) => setOrdemCompraCliente(e.target.value)}
                placeholder="Ex: OC-2026-001 ou nº do comprador"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden font-medium"
              />
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Identificador gerado pelo cliente. Preenchimento manual.
              </p>
            </div>

            {/* Nº PEDIDO DA INDÚSTRIA */}
            <div className="md:col-span-4">
              <label
                htmlFor="pedido-num-industria"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Nº pedido da indústria
              </label>
              <input
                type="text"
                id="pedido-num-industria"
                value={numeroPedidoIndustria}
                onChange={(e) => setNumeroPedidoIndustria(e.target.value)}
                placeholder="Digite o número informado pela indústria"
                className="w-full h-12 px-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden font-medium"
              />
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Número fornecido pela indústria parceira. Preenchimento manual.
              </p>
            </div>

            {/* Previsão de entrega */}
            <div className="md:col-span-4">
              <label
                htmlFor="pedido-previsao-entrega"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Previsão de entrega <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                id="pedido-previsao-entrega"
                value={previsaoEntrega}
                onChange={(e) => setPrevisaoEntrega(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Representada / Empresa Emissora */}
            <div className="md:col-span-6">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pedido-representada"
                  className="text-base font-bold text-slate-800"
                >
                  Representada (Empresa Emissora) <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  id="btn-nova-representada"
                  onClick={() => setShowRepresentadaModal(true)}
                  className="text-sm font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova representada</span>
                </button>
              </div>
              <select
                id="pedido-representada"
                value={representadaId}
                onChange={(e) => setRepresentadaId(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              >
                {representadas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Representante / Vendedor */}
            <div className="md:col-span-6">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pedido-vendedor"
                  className="text-base font-bold text-slate-800"
                >
                  Representante / Vendedor <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  id="btn-novo-representante"
                  onClick={() => setShowRepresentanteModal(true)}
                  className="text-sm font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo representante</span>
                </button>
              </div>
              <select
                id="pedido-vendedor"
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              >
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} ({v.comissaoPadrao || 5}% comissão)
                  </option>
                ))}
              </select>
            </div>

            {/* Transportadora */}
            <div className="md:col-span-7">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pedido-transportadora"
                  className="text-base font-bold text-slate-800"
                >
                  Transportadora
                </label>
                <button
                  type="button"
                  id="btn-nova-transportadora"
                  onClick={() => setShowTranspModal(true)}
                  className="text-sm font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova transportadora</span>
                </button>
              </div>
              <select
                id="pedido-transportadora"
                value={transportadoraId}
                onChange={(e) => setTransportadoraId(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              >
                {transportadoras.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} {t.cidade ? `(${t.cidade}/${t.estado})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Frete CIF / FOB */}
            <div className="md:col-span-5">
              <label className="block text-base font-bold text-slate-800 mb-2">
                Frete
              </label>
              <div className="grid grid-cols-2 gap-3 h-12">
                <label
                  className={`flex items-center gap-2 px-3 border-2 rounded-xl cursor-pointer transition-colors ${
                    tipoFrete === 'CIF'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                      : 'border-slate-300 bg-white text-slate-700 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoFrete"
                    value="CIF"
                    checked={tipoFrete === 'CIF'}
                    onChange={() => setTipoFrete('CIF')}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <div className="leading-tight">
                    <span className="block text-sm">CIF</span>
                    <span className="block text-xs text-slate-500 font-normal">remetente paga</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 px-3 border-2 rounded-xl cursor-pointer transition-colors ${
                    tipoFrete === 'FOB'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                      : 'border-slate-300 bg-white text-slate-700 font-medium'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoFrete"
                    value="FOB"
                    checked={tipoFrete === 'FOB'}
                    onChange={() => setTipoFrete('FOB')}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <div className="leading-tight">
                    <span className="block text-sm">FOB</span>
                    <span className="block text-xs text-slate-500 font-normal">destinatário paga</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Local de Entrega */}
            <div className="md:col-span-12">
              <label
                htmlFor="pedido-local-entrega"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Local de Entrega
              </label>
              <input
                type="text"
                id="pedido-local-entrega"
                value={localEntrega}
                onChange={(e) => setLocalEntrega(e.target.value)}
                placeholder="Endereço de entrega / filial de recebimento..."
                className="w-full h-12 px-4 text-base font-medium bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="md:col-span-6">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pedido-forma-pagamento"
                  className="text-base font-bold text-slate-800"
                >
                  Forma de pagamento
                </label>
                <button
                  type="button"
                  id="btn-nova-forma-pagamento"
                  onClick={() => setShowCondicaoModal(true)}
                  className="text-sm font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova forma</span>
                </button>
              </div>
              <select
                id="pedido-forma-pagamento"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              >
                <option value="Boleto bancário">Boleto bancário</option>
                <option value="PIX / Transferência">PIX / Transferência</option>
                <option value="À vista">À vista</option>
                <option value="Depósito antecipado">Depósito antecipado</option>
                {condicoes.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Condição de Pagamento */}
            <div className="md:col-span-6">
              <label
                htmlFor="pedido-condicao-pagamento"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Condição de pagamento (campo livre)
              </label>
              <input
                type="text"
                id="pedido-condicao-pagamento"
                value={condicaoPagamentoLivre}
                onChange={(e) => setCondicaoPagamentoLivre(e.target.value)}
                placeholder="Ex: 30/60/90 dias, 28 DDL, À vista..."
                className="w-full h-12 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
              />
            </div>

            {/* Pedido programado */}
            <div className="md:col-span-12">
              <label className="inline-flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="pedido-programado"
                  checked={programado}
                  onChange={(e) => setProgramado(e.target.checked)}
                  className="w-6 h-6 text-indigo-600 rounded-md"
                />
                <span className="text-base font-bold text-slate-800">
                  Pedido programado (entrega futura / programada)
                </span>
              </label>
            </div>

            {/* Observações */}
            <div className="md:col-span-12">
              <label
                htmlFor="pedido-observacoes"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Observações do pedido
              </label>
              <textarea
                id="pedido-observacoes"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Instruções adicionais, horários de recebimento, validade da proposta comercial, detalhes de entrega..."
                className="w-full p-4 text-base bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden resize-y"
              />
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. SEÇÃO PRODUTOS DO PEDIDO                               */}
        {/* ========================================================= */}
        <section
          id="secao-produtos-pedido"
          className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Produtos do Pedido
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  Pesquise no catálogo ou selecione produtos com conferência imediata de caixa e unidade
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-cadastrar-novo-produto"
              onClick={() => {
                setProdutoModalInitialDesc('');
                setShowProdutoModal(true);
              }}
              className="h-12 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer border border-slate-300"
            >
              <Plus className="w-4 h-4 text-indigo-700" />
              <span>+ Cadastrar novo produto no catálogo</span>
            </button>
          </div>

          {/* ÁREA DE PESQUISA DE PRODUTO */}
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-5 mb-6">
            <label
              htmlFor="busca-produto-input"
              className="block text-base font-black text-slate-900 uppercase tracking-wide mb-2"
            >
              BUSCAR PRODUTO
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="busca-produto-input"
                  value={buscaProdutoTermo}
                  onChange={(e) => setBuscaProdutoTermo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePesquisarProduto();
                    }
                  }}
                  placeholder="Código interno (ex: 000001), código fábrica ou descrição do produto..."
                  className="w-full h-13 px-4 text-base font-semibold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
                />
              </div>

              <button
                type="button"
                id="btn-pesquisar-produto"
                onClick={handlePesquisarProduto}
                className="h-13 px-8 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Search className="w-5 h-5" />
                <span>Pesquisar produto</span>
              </button>
            </div>

            {/* FEEDBACK DE PRODUTO ADICIONADO */}
            {mensagemProdutoAdicionado && (
              <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{mensagemProdutoAdicionado}</span>
              </div>
            )}

            {/* SE NÃO ENCONTRAR PRODUTO CORRESPONDENTE */}
            {produtoNaoEncontrado && (
              <div className="mt-4 p-5 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-base font-black text-amber-900 block">
                    Nenhum produto encontrado com "{buscaProdutoTermo}"
                  </span>
                  <span className="text-sm text-amber-800">
                    Você pode cadastrar esse item agora mesmo no catálogo com código sequencial automático.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProdutoModalInitialDesc(buscaProdutoTermo);
                    setShowProdutoModal(true);
                  }}
                  className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-base inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ Cadastrar novo produto</span>
                </button>
              </div>
            )}

            {/* LISTA DE MÚLTIPLOS PRODUTOS ENCONTRADOS */}
            {resultadosBuscaProduto.length > 0 && (
              <div className="mt-4 bg-white border-2 border-indigo-300 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-black text-indigo-900 uppercase block">
                  Selecione o produto para adicionar ao pedido:
                </span>
                <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto pr-1">
                  {resultadosBuscaProduto.map((p) => {
                    const repNome =
                      representadas.find((r) => r.id === p.representadaId)?.nome ||
                      representadas[0]?.nome ||
                      'Não informada';
                    const qtdCx =
                      p.quantidadePorCaixa ||
                      (p.qtdMilheiroPorCaixa ? Math.round(p.qtdMilheiroPorCaixa * 1000) : 1);
                    const prCx = p.precoCaixa || p.precoUnitario;
                    const prUn = p.precoUnidade || (qtdCx > 0 ? prCx / qtdCx : prCx);

                    return (
                      <div
                        key={p.id}
                        className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 p-2.5 rounded-xl transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-sm">
                              Cód. {p.codigoInterno || p.codigo}
                            </span>
                            {p.codigo && p.codigo !== p.codigoInterno && (
                              <span className="font-mono text-xs text-slate-500 font-semibold">
                                (Fábrica: {p.codigo})
                              </span>
                            )}
                            <span className="font-black text-slate-900 text-base">
                              {p.descricao}
                            </span>
                            {p.referencia && (
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {p.referencia}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 text-xs font-semibold text-slate-600">
                            <span>Marca: {repNome}</span>
                            <span>
                              {p.unidadeMedida === 'CX'
                                ? `1 caixa = ${qtdCx.toLocaleString('pt-BR')} unidades`
                                : `Unidade: ${p.unidadeMedida}`}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 text-xs font-bold text-slate-800 pt-1">
                            <span className="text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                              R$ {(p.precoMilheiro || (p.precoUnidade ? p.precoUnidade * 1000 : (prCx / (qtdCx || 1)) * 1000)).toFixed(2)} / milheiro
                            </span>
                            <span className="text-slate-700">
                              {formatCurrency(prCx)} / {p.unidadeMedida === 'CX' ? 'caixa' : 'unidade'}
                            </span>
                            {p.unidadeMedida === 'CX' && (
                              <span className="text-slate-500 font-medium">
                                (R$ {prUn.toFixed(4)} / un.)
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => adicionarProdutoAoPedido(p)}
                          className="h-11 px-6 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-black text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer self-start md:self-center shrink-0 shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* LISTAGEM DOS PRODUTOS ADICIONADOS AO PEDIDO */}
          {itens.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
              <Package className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-lg font-bold text-slate-700">Nenhum produto adicionado ainda</p>
              <p className="text-sm text-slate-500 mb-4">
                Use a busca acima para encontrar e adicionar itens ao pedido
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {itens.map((item, idx) => {
                const prodRef = produtos.find((p) => p.id === item.produtoId);
                const representadaNome =
                  representadas.find((r) => r.id === prodRef?.representadaId)?.nome ||
                  representadas[0]?.nome ||
                  'Não informada';

                const qtdCx =
                  item.quantidadePorCaixa ||
                  prodRef?.quantidadePorCaixa ||
                  (prodRef?.qtdMilheiroPorCaixa ? Math.round(prodRef.qtdMilheiroPorCaixa * 1000) : 1000);

                const prCaixaEfetivo = item.precoCaixa || item.precoUnitario;
                const prUnEfetivo =
                  item.precoUnidade ||
                  (qtdCx > 0 ? Number((prCaixaEfetivo / qtdCx).toFixed(4)) : prCaixaEfetivo);
                const prMilEfetivo =
                  item.precoMilheiro || Number((prUnEfetivo * 1000).toFixed(2));

                return (
                  <div
                    key={item.id || `${item.produtoId}-${idx}`}
                    className="p-5 sm:p-6 bg-white border-2 border-slate-300 rounded-2xl hover:border-indigo-400 transition-all shadow-xs space-y-4"
                  >
                    {/* CABEÇALHO DO ITEM */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                          Cód. {item.codigoInterno || item.codigo}
                        </span>
                        {item.codigo && item.codigo !== item.codigoInterno && (
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            Fábrica: {item.codigo}
                          </span>
                        )}
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {item.descricao}
                        </h3>
                        {item.referencia && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.referencia}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                          {representadaNome}
                        </span>
                      </div>
                    </div>

                    {/* DADOS DA EMBALAGEM / CONVERSÃO */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>
                        {item.unidadeMedida === 'CX'
                          ? `1 caixa contém ${qtdCx.toLocaleString('pt-BR')} unidades`
                          : `Comercializado por ${item.unidadeMedida}`}
                      </span>
                    </div>

                    {/* CAMPOS DE OPERAÇÃO DO ITEM (LÓGICA INVERTIDA: MILHEIRO -> SOMA CAIXA) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* QUANTIDADE */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          {item.unidadeMedida === 'CX' ? 'Qtd. Caixas' : 'Quantidade'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItemPedido(idx, 'quantidade', e.target.value)
                          }
                          className="w-full h-12 px-3 text-lg font-mono font-black text-center bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
                        />
                      </div>

                      {/* UNIDADE DE VENDA */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Unidade
                        </label>
                        <select
                          value={item.unidadeMedida}
                          onChange={(e) =>
                            atualizarItemPedido(idx, 'unidadeMedida', e.target.value)
                          }
                          className="w-full h-12 px-2 text-base font-black text-center bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
                        >
                          <option value="CX">CX (Caixa)</option>
                          <option value="UN">UN (Unidade)</option>
                          <option value="MIL">MIL (Milheiro)</option>
                          <option value="KG">KG (Quilo)</option>
                          <option value="PC">PC (Peça)</option>
                        </select>
                      </div>

                      {/* ENTRADA 1: PREÇO POR MILHEIRO (VALOR BASE INFORMADO) */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-black text-indigo-950 uppercase mb-1 flex items-center justify-between">
                          <span>Pr. Milheiro (R$) *</span>
                          <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                            Base
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precoMilheiro || 0}
                          onChange={(e) =>
                            atualizarItemPedido(idx, 'precoMilheiro', e.target.value)
                          }
                          className="w-full h-12 px-3 text-lg font-mono font-black text-right text-indigo-950 bg-white border-2 border-indigo-500 rounded-xl focus:border-indigo-700 outline-hidden shadow-xs"
                        />
                      </div>

                      {/* ENTRADA 2: PREÇO DA CAIXA (SOMA DO SISTEMA) */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                          <span>{item.unidadeMedida === 'CX' ? 'Pr. Caixa (R$)' : 'Pr. Unitário (R$)'}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">
                            Soma do sistema
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unidadeMedida === 'CX' ? item.precoCaixa : item.precoUnitario}
                          onChange={(e) =>
                            atualizarItemPedido(idx, 'precoCaixa', e.target.value)
                          }
                          className="w-full h-12 px-3 text-lg font-mono font-bold text-right text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
                        />
                      </div>

                      {/* ALÍQUOTA IPI */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          IPI (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.aliquotaIpi}
                          onChange={(e) =>
                            atualizarItemPedido(idx, 'aliquotaIpi', e.target.value)
                          }
                          className="w-full h-12 px-3 text-base font-mono font-bold text-center bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden"
                        />
                      </div>
                    </div>

                    {/* PAINEL DE CONFERÊNCIA IMEDIATA DO DOUGLAS (SEM CALCULADORA) */}
                    <div className="bg-slate-50 border-2 border-indigo-100 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">
                          Preço do Milheiro (Base)
                        </span>
                        <span className="text-lg font-black text-indigo-900 font-mono">
                          R$ {prMilEfetivo.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-500 block">/ 1.000 un.</span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">
                          Preço da Caixa (Soma)
                        </span>
                        <span className="text-lg font-black text-emerald-800 font-mono">
                          R$ {prCaixaEfetivo.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-500 block">({qtdCx.toLocaleString('pt-BR')} un./cx)</span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">
                          IPI Segregado
                        </span>
                        <span className="text-lg font-black text-amber-800 font-mono">
                          {formatCurrency(item.valorIpi)} ({item.aliquotaIpi}%)
                        </span>
                        <span className="text-[11px] text-slate-500 block">Un: R$ {prUnEfetivo.toFixed(4)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-500 uppercase block">
                          Subtotal dos Produtos
                        </span>
                        <span className="text-xl font-black text-emerald-800 font-mono">
                          {formatCurrency(item.valorItens)}
                        </span>
                      </div>
                    </div>

                    {/* BOTÃO EXCLUIR PRODUTO */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl border border-red-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remover produto</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 4. SEÇÃO RESUMO DO PEDIDO                                 */}
        {/* ========================================================= */}
        <section
          id="secao-resumo-pedido"
          className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg">
              4
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Resumo dos Valores</h2>
              <p className="text-sm text-slate-400 font-medium">
                Conferência clara dos valores com IPI segregado (não compõe comissão)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
              <span className="text-sm font-bold text-slate-400 uppercase block mb-1">
                Total dos Produtos
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {formatCurrency(totais.totalItens)}
              </span>
              <span className="text-xs text-slate-400 block mt-2">
                {itens.length} {itens.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
              <span className="text-sm font-bold text-amber-400 uppercase block mb-1">
                Total de IPI (Segregado)
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {formatCurrency(totais.totalIpi)}
              </span>
              <span className="text-xs text-amber-400/80 block mt-2">
                Excluído da base de comissão do vendedor
              </span>
            </div>

            <div className="bg-indigo-950 border-2 border-indigo-500 rounded-xl p-5">
              <span className="text-sm font-bold text-indigo-300 uppercase block mb-1">
                TOTAL GERAL DO PEDIDO
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {formatCurrency(totais.totalPedido)}
              </span>
              <span className="text-xs text-indigo-300 block mt-2">
                Peso total estimado: {formatNumber(totais.pesoTotalKg, 2)} kg
              </span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO PRINCIPAIS */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto h-14 px-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-base transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                id="btn-salvar-rascunho"
                onClick={() => handleFinalizarPedido('Rascunho', false)}
                disabled={isSubmittingPedido}
                className="w-full sm:w-auto h-14 px-8 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-base transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5 text-slate-500" />
                <span>Salvar como rascunho</span>
              </button>

              <button
                type="button"
                id="btn-gerar-pedido"
                onClick={() => handleFinalizarPedido('Aprovado', true)}
                disabled={isSubmittingPedido}
                className="w-full sm:w-auto h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-3"
              >
                {isSubmittingPedido ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <FileCheck className="w-6 h-6 text-emerald-300" />
                )}
                <span>GERAR PEDIDO</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MODAIS AUXILIARES */}
      {showTranspModal && (
        <TransportadoraModal
          isOpen={showTranspModal}
          onClose={() => setShowTranspModal(false)}
          onSave={(nova) => {
            onSaveTransportadora(nova);
            setTransportadoraId(nova.id);
            setShowTranspModal(false);
          }}
        />
      )}

      {showRepresentadaModal && (
        <RepresentadaModal
          isOpen={showRepresentadaModal}
          onClose={() => setShowRepresentadaModal(false)}
          onSave={(nova) => {
            if (onSaveRepresentada) {
              onSaveRepresentada(nova);
            }
            setRepresentadaId(nova.id);
            setShowRepresentadaModal(false);
          }}
        />
      )}

      {showRepresentanteModal && (
        <RepresentanteModal
          isOpen={showRepresentanteModal}
          onClose={() => setShowRepresentanteModal(false)}
          onSave={(novo) => {
            if (onSaveVendedor) {
              onSaveVendedor(novo);
            }
            setVendedorId(novo.id);
            setShowRepresentanteModal(false);
          }}
        />
      )}

      {showProdutoModal && (
        <ProdutoModal
          isOpen={showProdutoModal}
          onClose={() => setShowProdutoModal(false)}
          representadas={representadas}
          initialData={
            produtoModalInitialDesc
              ? ({
                  descricao: produtoModalInitialDesc,
                } as any)
              : null
          }
          onSave={(novo) => {
            onSaveProduto(novo);
            adicionarProdutoAoPedido(novo);
            setShowProdutoModal(false);
          }}
        />
      )}

      {showCondicaoModal && (
        <CondicaoPagamentoModal
          isOpen={showCondicaoModal}
          onClose={() => setShowCondicaoModal(false)}
          onSave={(nova) => {
            onSaveCondicao(nova);
            setFormaPagamento(nova.nome);
            setShowCondicaoModal(false);
          }}
        />
      )}
    </div>
  );
};
