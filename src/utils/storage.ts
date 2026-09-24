import {
  Cliente,
  Transportadora,
  Produto,
  Representada,
  Representante,
  CondicaoPagamento,
  Pedido,
} from '../types';
import { formatPedidoNumero } from './formatters';
import {
  INITIAL_CLIENTES,
  INITIAL_TRANSPORTADORAS,
  INITIAL_PRODUTOS,
  INITIAL_REPRESENTADAS,
  INITIAL_VENDEDORES,
  INITIAL_CONDICOES_PAGAMENTO,
  INITIAL_PEDIDOS,
} from '../data/mockData';

const KEYS = {
  CLIENTES: 'gestao_pedidos_clientes_v1',
  TRANSPORTADORAS: 'gestao_pedidos_transportadoras_v1',
  PRODUTOS: 'gestao_pedidos_produtos_v1',
  REPRESENTADAS: 'gestao_pedidos_representadas_v1',
  VENDEDORES: 'gestao_pedidos_vendedores_v1',
  CONDICOES: 'gestao_pedidos_condicoes_v1',
  PEDIDOS: 'gestao_pedidos_pedidos_v1',
  EMPRESA_PADRAO: 'gestao_pedidos_empresa_padrao_v1',
  SEQ_CLIENTE: 'gestao_pedidos_seq_cliente_v1',
  SEQ_PRODUTO: 'gestao_pedidos_seq_produto_v1',
  SEQ_PEDIDO: 'gestao_pedidos_seq_pedido_v1',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erro ao carregar dados do localStorage [${key}]:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao salvar dados no localStorage [${key}]:`, err);
  }
}

export const StorageService = {
  // Geração atômica e segura do próximo Código Interno de Cliente (ex: 000621 ou 000001)
  getNextCodigoCliente(): string {
    const clientes = this.getClientes();
    let maxSeq = getItem<number>(KEYS.SEQ_CLIENTE, 0);

    for (const c of clientes) {
      if (c.codigo) {
        const num = parseInt(c.codigo.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    setItem(KEYS.SEQ_CLIENTE, nextSeq);
    return String(nextSeq).padStart(6, '0');
  },

  // Geração atômica e segura do próximo Código Interno de Produto (ex: 000005 ou 000001)
  getNextCodigoProduto(): string {
    const produtos = this.getProdutos();
    let maxSeq = getItem<number>(KEYS.SEQ_PRODUTO, 0);

    for (const p of produtos) {
      if (p.codigoInterno) {
        const num = parseInt(p.codigoInterno.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    setItem(KEYS.SEQ_PRODUTO, nextSeq);
    return String(nextSeq).padStart(6, '0');
  },

  getClientes(): Cliente[] {
    const data = getItem<Cliente[]>(KEYS.CLIENTES, INITIAL_CLIENTES);
    const list = Array.isArray(data) ? data : INITIAL_CLIENTES;

    // Migração transparente: assegura que todo cliente tenha código formatado de 6 dígitos
    let alterou = false;
    const sanitized = list.map((c, idx) => {
      if (!c.codigo || c.codigo.startsWith('CLI-')) {
        alterou = true;
        const seq = 480 + idx;
        return { ...c, codigo: String(seq).padStart(6, '0') };
      }
      return c;
    });

    if (alterou) {
      this.saveClientes(sanitized);
    }
    return sanitized;
  },

  saveClientes(list: Cliente[]) {
    setItem(KEYS.CLIENTES, list);
  },

  findClienteByCpfCnpj(cpfCnpj: string): Cliente | undefined {
    const clean = cpfCnpj.replace(/\D/g, '');
    if (!clean) return undefined;
    const list = this.getClientes();
    return list.find((c) => c.cnpjCpf.replace(/\D/g, '') === clean);
  },

  // Pesquisa inteligente e unificada de clientes
  searchClientes(termo: string): Cliente[] {
    const q = termo.trim().toLowerCase();
    if (!q) return [];
    const list = this.getClientes();
    const cleanQ = q.replace(/\D/g, '');

    return list.filter((c) => {
      // 1. Busca por código interno (ex: 000483 ou 483)
      const codSemZeros = c.codigo.replace(/^0+/, '');
      const qSemZeros = q.replace(/^0+/, '');
      if (c.codigo.toLowerCase() === q || (qSemZeros && codSemZeros === qSemZeros)) {
        return true;
      }

      // 2. Busca por CPF / CNPJ limpo
      if (cleanQ.length >= 3) {
        const cleanCnpj = c.cnpjCpf.replace(/\D/g, '');
        if (cleanCnpj.includes(cleanQ)) return true;
      }

      // 3. Busca por Razão Social
      if (c.razaoSocial.toLowerCase().includes(q)) return true;

      // 4. Busca por Nome Fantasia
      if (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(q)) return true;

      return false;
    });
  },

  saveOrUpdateCliente(cliente: Cliente): { list: Cliente[]; isNew: boolean; clienteSalvo: Cliente } {
    const list = this.getClientes();
    const cleanCpf = cliente.cnpjCpf.replace(/\D/g, '');
    const existingIndex = list.findIndex(
      (c) => c.id === cliente.id || (cleanCpf && c.cnpjCpf.replace(/\D/g, '') === cleanCpf)
    );

    let updated: Cliente[];
    let isNew = false;
    let clienteSalvo: Cliente;

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      // Mantém código interno sequencial original se já existir
      const codigoDefinitivo = existing.codigo || cliente.codigo || this.getNextCodigoCliente();
      clienteSalvo = {
        ...existing,
        ...cliente,
        id: existing.id,
        codigo: codigoDefinitivo,
      };
      updated = [...list];
      updated[existingIndex] = clienteSalvo;
    } else {
      isNew = true;
      const codigoDefinitivo = cliente.codigo || this.getNextCodigoCliente();
      clienteSalvo = {
        ...cliente,
        codigo: codigoDefinitivo,
      };
      updated = [clienteSalvo, ...list];
    }

    this.saveClientes(updated);
    return { list: updated, isNew, clienteSalvo };
  },

  addCliente(cliente: Cliente): Cliente[] {
    const res = this.saveOrUpdateCliente(cliente);
    return res.list;
  },

  getTransportadoras(): Transportadora[] {
    const data = getItem<Transportadora[]>(KEYS.TRANSPORTADORAS, INITIAL_TRANSPORTADORAS);
    return Array.isArray(data) ? data : INITIAL_TRANSPORTADORAS;
  },
  saveTransportadoras(list: Transportadora[]) {
    setItem(KEYS.TRANSPORTADORAS, list);
  },
  addTransportadora(transp: Transportadora): Transportadora[] {
    const list = this.getTransportadoras();
    const updated = [transp, ...list.filter((t) => t.id !== transp.id)];
    this.saveTransportadoras(updated);
    return updated;
  },

  getProdutos(): Produto[] {
    const data = getItem<Produto[]>(KEYS.PRODUTOS, INITIAL_PRODUTOS);
    const list = Array.isArray(data) ? data : INITIAL_PRODUTOS;

    // Migração transparente de produtos para garantir codigoInterno e modelagem caixa/unidade
    let alterou = false;
    const sanitized = list.map((p, idx) => {
      let mod = false;
      let codigoInterno = p.codigoInterno;
      if (!codigoInterno) {
        codigoInterno = String(idx + 1).padStart(6, '0');
        mod = true;
      }

      // Quantidade por caixa e cálculos derivados
      let quantidadePorCaixa = p.quantidadePorCaixa;
      if (!quantidadePorCaixa) {
        if (p.qtdMilheiroPorCaixa && p.qtdMilheiroPorCaixa > 0) {
          quantidadePorCaixa = Math.round(p.qtdMilheiroPorCaixa * 1000);
          mod = true;
        } else if (p.qtdPorCaixa && p.qtdPorCaixa > 0) {
          quantidadePorCaixa = p.qtdPorCaixa;
          mod = true;
        } else if (p.unidadeMedida === 'CX') {
          quantidadePorCaixa = 1000;
          mod = true;
        } else {
          quantidadePorCaixa = 1;
        }
      }

      let precoMilheiro = p.precoMilheiro;
      let precoCaixa = p.precoCaixa;
      let precoUnidade = p.precoUnidade;

      if (precoMilheiro && precoMilheiro > 0) {
        precoUnidade = Number((precoMilheiro / 1000).toFixed(4));
        const calcCaixa = Number(((precoMilheiro * quantidadePorCaixa) / 1000).toFixed(2));
        if (p.unidadeMedida === 'CX' && (!precoCaixa || Math.abs(precoCaixa - calcCaixa) > 0.05)) {
          precoCaixa = calcCaixa;
          mod = true;
        }
      } else if (p.unidadeMedida === 'CX') {
        precoCaixa = precoCaixa || p.precoUnitario;
        if (!precoUnidade && quantidadePorCaixa > 0) {
          precoUnidade = Number((precoCaixa / quantidadePorCaixa).toFixed(4));
          mod = true;
        }
        if (!precoMilheiro && precoUnidade) {
          precoMilheiro = Number((precoUnidade * 1000).toFixed(2));
          mod = true;
        }
      } else {
        precoUnidade = precoUnidade || p.precoUnitario;
        precoCaixa = precoCaixa || precoUnidade;
        if (!precoMilheiro) {
          precoMilheiro = Number((precoUnidade * 1000).toFixed(2));
          mod = true;
        }
      }

      if (mod) {
        alterou = true;
        return {
          ...p,
          codigoInterno,
          quantidadePorCaixa,
          precoCaixa,
          precoUnidade,
          precoMilheiro,
        };
      }
      return p;
    });

    if (alterou) {
      this.saveProdutos(sanitized);
    }
    return sanitized;
  },

  saveProdutos(list: Produto[]) {
    setItem(KEYS.PRODUTOS, list);
  },

  addProduto(prod: Produto): Produto[] {
    const list = this.getProdutos();
    // Garante código interno único
    const codigoInterno = prod.codigoInterno || this.getNextCodigoProduto();
    const prodFinal: Produto = { ...prod, codigoInterno };
    const updated = [prodFinal, ...list.filter((p) => p.id !== prodFinal.id)];
    this.saveProdutos(updated);
    return updated;
  },

  // Pesquisa inteligente e unificada de produtos
  searchProdutos(termo: string): Produto[] {
    const q = termo.trim().toLowerCase();
    if (!q) return [];
    const list = this.getProdutos();
    const qSemZeros = q.replace(/^0+/, '');

    return list.filter((p) => {
      // 1. Código interno (ex: 000001 ou 1)
      const codIntSemZeros = (p.codigoInterno || '').replace(/^0+/, '');
      if (p.codigoInterno?.toLowerCase() === q || (qSemZeros && codIntSemZeros === qSemZeros)) {
        return true;
      }

      // 2. Código de fábrica / comercial / referência externa
      if (p.codigo && p.codigo.toLowerCase().includes(q)) return true;

      // 3. Descrição do produto
      if (p.descricao && p.descricao.toLowerCase().includes(q)) return true;

      // 4. Referência
      if (p.referencia && p.referencia.toLowerCase().includes(q)) return true;

      return false;
    });
  },

  getRepresentadas(): Representada[] {
    const data = getItem<Representada[]>(KEYS.REPRESENTADAS, INITIAL_REPRESENTADAS);
    return Array.isArray(data) ? data : INITIAL_REPRESENTADAS;
  },
  saveRepresentadas(list: Representada[]) {
    setItem(KEYS.REPRESENTADAS, list);
  },
  addRepresentada(rep: Representada): Representada[] {
    const list = this.getRepresentadas();
    const updated = [rep, ...list.filter((r) => r.id !== rep.id)];
    this.saveRepresentadas(updated);
    return updated;
  },

  getVendedores(): Representante[] {
    const data = getItem<Representante[]>(KEYS.VENDEDORES, INITIAL_VENDEDORES);
    return Array.isArray(data) ? data : INITIAL_VENDEDORES;
  },
  saveVendedores(list: Representante[]) {
    setItem(KEYS.VENDEDORES, list);
  },
  addVendedor(vend: Representante): Representante[] {
    const list = this.getVendedores();
    const updated = [vend, ...list.filter((v) => v.id !== vend.id)];
    this.saveVendedores(updated);
    return updated;
  },

  getCondicoes(): CondicaoPagamento[] {
    const data = getItem<CondicaoPagamento[]>(KEYS.CONDICOES, INITIAL_CONDICOES_PAGAMENTO);
    return Array.isArray(data) ? data : INITIAL_CONDICOES_PAGAMENTO;
  },
  saveCondicoes(list: CondicaoPagamento[]) {
    setItem(KEYS.CONDICOES, list);
  },
  addCondicao(cond: CondicaoPagamento): CondicaoPagamento[] {
    const list = this.getCondicoes();
    const updated = [cond, ...list.filter((c) => c.id !== cond.id)];
    this.saveCondicoes(updated);
    return updated;
  },

  getPedidos(): Pedido[] {
    const data = getItem<Pedido[]>(KEYS.PEDIDOS, INITIAL_PEDIDOS);
    const list = Array.isArray(data) ? data : INITIAL_PEDIDOS;

    // Migração transparente de pedidos legados
    let alterou = false;
    const migrados = list.map((p) => {
      let mod = false;
      const copia = { ...p };

      // Se possui número antigo ORC ou resíduos de 31089
      if (copia.numero && (copia.numero.startsWith('ORC') || copia.numero.includes('31089'))) {
        copia.numeroSequencial = 1;
        copia.numero = 'PED000001';
        mod = true;
      }

      // Migração de Ordem de Compra do Cliente (separado de Número da Indústria)
      if (!copia.ordemCompraCliente && copia.numeroPedidoCliente) {
        copia.ordemCompraCliente = copia.numeroPedidoCliente;
        mod = true;
      }

      // Migração de Situação Comercial ('Enviado' ou 'Fechado')
      if (!copia.situacaoComercial) {
        copia.situacaoComercial = copia.status === 'Faturado' || copia.status === 'Aprovado' ? 'Fechado' : 'Enviado';
        mod = true;
      }

      if (mod) alterou = true;
      return copia;
    });

    if (alterou) {
      setItem(KEYS.PEDIDOS, migrados);
      return migrados;
    }

    return list;
  },
  savePedidos(list: Pedido[]) {
    setItem(KEYS.PEDIDOS, list);
  },
  savePedido(pedido: Pedido): Pedido[] {
    const list = this.getPedidos();
    const idx = list.findIndex((p) => p.id === pedido.id);

    // Campos comerciais independentes
    pedido.numeroPedidoIndustria = (pedido.numeroPedidoIndustria || '').trim();
    pedido.ordemCompraCliente = (pedido.ordemCompraCliente || pedido.numeroPedidoCliente || '').trim();
    pedido.numeroPedidoCliente = pedido.ordemCompraCliente; // Compatibilidade legada
    
    // Situação comercial padrão
    if (!pedido.situacaoComercial) {
      pedido.situacaoComercial = pedido.status === 'Faturado' || pedido.status === 'Aprovado' ? 'Fechado' : 'Enviado';
    }

    // Regra do Momento da Numeração:
    // Se o pedido for Rascunho e ainda não possui número comercial consumido, não gasta o sequencial
    if (pedido.status === 'Rascunho' && !pedido.numeroSequencial) {
      pedido.numero = 'RASCUNHO';
    } else if (pedido.status !== 'Rascunho' && (!pedido.numeroSequencial || pedido.numero === 'RASCUNHO')) {
      // Pedido emitido/aprovado: consome o próximo número sequencial comercial (ex: PED000001)
      const proximo = this.consumirProximoNumeroPedido();
      pedido.numeroSequencial = proximo.numeroSequencial;
      pedido.numero = proximo.numero;
    } else if (pedido.numeroSequencial) {
      // Mantém a formatação padronizada do sequencial
      pedido.numero = formatPedidoNumero(pedido.numeroSequencial);
    }

    let updated: Pedido[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = pedido;
    } else {
      updated = [pedido, ...list];
    }
    this.savePedidos(updated);
    return updated;
  },

  // Alterna rapidamente entre 'Enviado' e 'Fechado' (permitido mesmo com pedido Emitido)
  toggleSituacaoComercial(id: string): Pedido[] {
    const list = this.getPedidos();
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return list;

    const atual = list[idx];
    const novaSituacao = atual.situacaoComercial === 'Fechado' ? 'Enviado' : 'Fechado';
    const atualizado: Pedido = { ...atual, situacaoComercial: novaSituacao };
    
    const novaLista = [...list];
    novaLista[idx] = atualizado;
    this.savePedidos(novaLista);
    return novaLista;
  },

  updateSituacaoComercial(id: string, situacao: 'Enviado' | 'Fechado'): Pedido[] {
    const list = this.getPedidos();
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return list;

    const atual = list[idx];
    const atualizado: Pedido = { ...atual, situacaoComercial: situacao };
    const novaLista = [...list];
    novaLista[idx] = atualizado;
    this.savePedidos(novaLista);
    return novaLista;
  },
  deletePedido(id: string): Pedido[] {
    const list = this.getPedidos();
    const updated = list.filter((p) => p.id !== id);
    this.savePedidos(updated);
    return updated;
  },

  resetAll(): void {
    setItem(KEYS.CLIENTES, INITIAL_CLIENTES);
    setItem(KEYS.TRANSPORTADORAS, INITIAL_TRANSPORTADORAS);
    setItem(KEYS.PRODUTOS, INITIAL_PRODUTOS);
    setItem(KEYS.REPRESENTADAS, INITIAL_REPRESENTADAS);
    setItem(KEYS.VENDEDORES, INITIAL_VENDEDORES);
    setItem(KEYS.CONDICOES, INITIAL_CONDICOES_PAGAMENTO);
    setItem(KEYS.PEDIDOS, INITIAL_PEDIDOS);
    setItem(KEYS.SEQ_PEDIDO, 1);
  },

  /**
   * Obtém o próximo número sequencial inteiro do sistema sem consumi-lo (apenas preview).
   * A sequência oficial começa em 1 (PED000001).
   */
  getProximoNumeroSequencialPreview(): number {
    const pedidos = this.getPedidos();
    let storedSeq = getItem<number>(KEYS.SEQ_PEDIDO, 0);

    // Limpa resíduos de sequências antigas inválidas (ex: 31089)
    if (storedSeq > 20000) {
      storedSeq = 0;
      setItem(KEYS.SEQ_PEDIDO, 0);
    }

    // Calcula o maior número sequencial legítimo já emitido entre os pedidos
    let maxEmPedidos = 0;
    for (const p of pedidos) {
      if (p.numeroSequencial && p.numeroSequencial < 20000) {
        if (p.numeroSequencial > maxEmPedidos) {
          maxEmPedidos = p.numeroSequencial;
        }
      } else if (p.numero && p.numero.startsWith('PED')) {
        const digits = parseInt(p.numero.replace(/\D/g, ''), 10);
        if (!isNaN(digits) && digits < 20000 && digits > maxEmPedidos) {
          maxEmPedidos = digits;
        }
      }
    }

    const currentMax = Math.max(storedSeq, maxEmPedidos);
    return currentMax + 1;
  },

  /**
   * Retorna a string formatada do próximo número de pedido (ex: "PED000001") sem consumi-lo.
   */
  getPreviewProximoNumeroPedido(): string {
    const nextSeq = this.getProximoNumeroSequencialPreview();
    return formatPedidoNumero(nextSeq);
  },

  /**
   * Consome o próximo número sequencial oficial do pedido, gravando no armazenamento.
   * NOTA PARA O SUPABASE / POSTGRESQL:
   * Na migração para o Supabase, este sequencial comercial será gerado com segurança
   * no banco de dados via SEQUENCE ou RPC atômica (ex: nextval('pedidos_numero_seq') ou trigger),
   * garantindo unicidade mesmo com múltiplos representantes emitindo em paralelo.
   */
  consumirProximoNumeroPedido(): { numeroSequencial: number; numero: string } {
    const nextSeq = this.getProximoNumeroSequencialPreview();
    setItem(KEYS.SEQ_PEDIDO, nextSeq);
    return {
      numeroSequencial: nextSeq,
      numero: formatPedidoNumero(nextSeq),
    };
  },

  /**
   * Mantido para compatibilidade com chamadas existentes no frontend.
   * Retorna o preview do próximo pedido gerado pelo sistema (PED000001, etc.).
   */
  getNextNumero(_tipo?: 'ORCAMENTO' | 'PEDIDO'): string {
    return this.getPreviewProximoNumeroPedido();
  },
};
