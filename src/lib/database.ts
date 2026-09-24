import { supabase } from '../lib/supabase';
import {
  Cliente,
  Produto,
  Transportadora,
  Representada,
  Representante,
  CondicaoPagamento,
  Pedido,
  ItemPedido,
  SituacaoComercial,
} from '../types';

// ============================================================================
// VALIDADOR DE UUID (Garante que apenas UUIDs do PostgreSQL sejam usados)
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
}

// ============================================================================
// SERVIÇO DE AUTENTICAÇÃO SUPABASE
// ============================================================================
export const AuthService = {
  async getSession() {
    if (!supabase) return { session: null, user: null };
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session, user: data.session?.user ?? null };
  },

  async signInWithPassword(email: string, password: string) {
    if (!supabase) throw new Error('Cliente Supabase não configurado');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, nome?: string) {
    if (!supabase) throw new Error('Cliente Supabase não configurado');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: nome || email.split('@')[0] },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================================
// SERVIÇO DE CLIENTES (public.clientes)
// ============================================================================
export const ClienteService = {
  async getAll(): Promise<Cliente[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('codigo', { ascending: true });

    if (error) {
      console.error('Erro ao buscar clientes no Supabase:', error);
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia || undefined,
      cnpjCpf: row.cnpj_cpf,
      rgIe: row.rg_ie || '',
      telefone: row.telefone || '',
      celular: row.celular || undefined,
      email: row.email || undefined,
      contato: row.contato || undefined,
      cep: row.cep || '',
      endereco: row.endereco || '',
      numero: row.numero || '',
      complemento: row.complemento || undefined,
      bairro: row.bairro || '',
      cidade: row.cidade || '',
      estado: row.estado || 'RS',
      localEntregaPadrao: row.local_entrega_padrao || undefined,
    }));
  },

  async create(cliente: Partial<Cliente>): Promise<Cliente> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload = {
      razao_social: cliente.razaoSocial?.toUpperCase().trim(),
      nome_fantasia: cliente.nomeFantasia?.toUpperCase().trim() || null,
      cnpj_cpf: cliente.cnpjCpf?.trim(),
      rg_ie: cliente.rgIe?.trim() || null,
      telefone: cliente.telefone?.trim() || null,
      celular: cliente.celular?.trim() || null,
      email: cliente.email?.trim() || null,
      contato: cliente.contato?.trim() || null,
      cep: cliente.cep?.trim() || null,
      endereco: cliente.endereco?.trim() || null,
      numero: cliente.numero?.trim() || null,
      complemento: cliente.complemento?.trim() || null,
      bairro: cliente.bairro?.trim() || null,
      cidade: cliente.cidade?.trim() || null,
      estado: (cliente.estado?.trim() || 'RS').toUpperCase(),
      local_entrega_padrao: cliente.localEntregaPadrao?.trim() || null,
      ativo: true,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Falha ao cadastrar cliente: ${error.message}`);

    return {
      id: data.id,
      codigo: data.codigo,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || undefined,
      cnpjCpf: data.cnpj_cpf,
      rgIe: data.rg_ie || '',
      telefone: data.telefone || '',
      celular: data.celular || undefined,
      email: data.email || undefined,
      contato: data.contato || undefined,
      cep: data.cep || '',
      endereco: data.endereco || '',
      numero: data.numero || '',
      complemento: data.complemento || undefined,
      bairro: data.bairro || '',
      cidade: data.cidade || '',
      estado: data.estado || 'RS',
      localEntregaPadrao: data.local_entrega_padrao || undefined,
    };
  },

  async save(cliente: Partial<Cliente>): Promise<Cliente> {
    if (cliente.id && isValidUUID(cliente.id)) {
      return this.update(cliente.id, cliente);
    }
    return this.create(cliente);
  },

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) {
      throw new Error(`ID de cliente inválido: "${id}". Operação de atualização requer UUID real do banco.`);
    }
    const payload = {
      razao_social: cliente.razaoSocial?.toUpperCase().trim(),
      nome_fantasia: cliente.nomeFantasia?.toUpperCase().trim() || null,
      cnpj_cpf: cliente.cnpjCpf?.trim(),
      rg_ie: cliente.rgIe?.trim() || null,
      telefone: cliente.telefone?.trim() || null,
      celular: cliente.celular?.trim() || null,
      email: cliente.email?.trim() || null,
      contato: cliente.contato?.trim() || null,
      cep: cliente.cep?.trim() || null,
      endereco: cliente.endereco?.trim() || null,
      numero: cliente.numero?.trim() || null,
      complemento: cliente.complemento?.trim() || null,
      bairro: cliente.bairro?.trim() || null,
      cidade: cliente.cidade?.trim() || null,
      estado: (cliente.estado?.trim() || 'RS').toUpperCase(),
      local_entrega_padrao: cliente.localEntregaPadrao?.trim() || null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar cliente: ${error.message}`);

    return {
      id: data.id,
      codigo: data.codigo,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || undefined,
      cnpjCpf: data.cnpj_cpf,
      rgIe: data.rg_ie || '',
      telefone: data.telefone || '',
      celular: data.celular || undefined,
      email: data.email || undefined,
      contato: data.contato || undefined,
      cep: data.cep || '',
      endereco: data.endereco || '',
      numero: data.numero || '',
      complemento: data.complemento || undefined,
      bairro: data.bairro || '',
      cidade: data.cidade || '',
      estado: data.estado || 'RS',
      localEntregaPadrao: data.local_entrega_padrao || undefined,
    };
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir cliente: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE REPRESENTADAS (public.representadas)
// ============================================================================
export const RepresentadaService = {
  async getAll(): Promise<Representada[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('representadas')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar representadas no Supabase:', error);
      throw new Error(`Erro ao buscar representadas: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      razaoSocial: row.razao_social || undefined,
      cnpj: row.cnpj,
      ie: row.ie || '',
      telefone: row.telefone || '',
      endereco: row.endereco || '',
      bairro: row.bairro || '',
      cidade: row.cidade || '',
      estado: row.estado || '',
      cep: row.cep || undefined,
      logoUrl: row.logo_url || undefined,
    }));
  },

  async save(rep: Partial<Representada>): Promise<Representada> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload = {
      nome: rep.nome?.trim(),
      razao_social: rep.razaoSocial?.trim() || null,
      cnpj: rep.cnpj?.trim(),
      ie: rep.ie?.trim() || null,
      telefone: rep.telefone?.trim() || null,
      endereco: rep.endereco?.trim() || null,
      bairro: rep.bairro?.trim() || null,
      cidade: rep.cidade?.trim() || null,
      estado: (rep.estado?.trim() || 'RS').toUpperCase(),
      cep: rep.cep?.trim() || null,
      logo_url: rep.logoUrl?.trim() || null,
      ativo: true,
    };

    if (rep.id && isValidUUID(rep.id)) {
      const { data, error } = await supabase
        .from('representadas')
        .update(payload)
        .eq('id', rep.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar representada: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        razaoSocial: data.razao_social || undefined,
        cnpj: data.cnpj,
        ie: data.ie || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || undefined,
        logoUrl: data.logo_url || undefined,
      };
    } else {
      const { data, error } = await supabase
        .from('representadas')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao criar representada: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        razaoSocial: data.razao_social || undefined,
        cnpj: data.cnpj,
        ie: data.ie || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || undefined,
        logoUrl: data.logo_url || undefined,
      };
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('representadas').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir representada: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE PRODUTOS (public.produtos)
// Regra: preco_milheiro é a fonte de verdade; banco deriva preco_unidade e preco_caixa
// ============================================================================
export const ProdutoService = {
  async getAll(): Promise<Produto[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('codigo_interno', { ascending: true });

    if (error) {
      console.error('Erro ao buscar produtos no Supabase:', error);
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      codigo: row.codigo,
      codigoInterno: row.codigo_interno,
      descricao: row.descricao,
      referencia: row.referencia || '',
      unidadeMedida: row.unidade_medida,
      quantidadePorCaixa: row.quantidade_por_caixa,
      precoMilheiro: Number(row.preco_milheiro),
      precoUnidade: Number(row.preco_unidade),
      precoCaixa: Number(row.preco_caixa),
      precoUnitario: row.unidade_medida === 'CX' ? Number(row.preco_caixa) : Number(row.preco_unidade),
      aliquotaIpi: Number(row.aliquota_ipi),
      pesoUnitarioKg: Number(row.peso_unitario_kg),
      representadaId: row.representada_id,
    }));
  },

  async save(prod: Partial<Produto>): Promise<Produto> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload: any = {
      codigo: prod.codigo?.trim() || prod.codigoInterno || 'PROD',
      descricao: prod.descricao?.trim(),
      referencia: prod.referencia?.trim() || null,
      unidade_medida: prod.unidadeMedida || 'CX',
      quantidade_por_caixa: prod.quantidadePorCaixa && prod.quantidadePorCaixa > 0 ? prod.quantidadePorCaixa : 1,
      preco_milheiro: prod.precoMilheiro !== undefined ? prod.precoMilheiro : 0,
      aliquota_ipi: prod.aliquotaIpi || 0,
      peso_unitario_kg: prod.pesoUnitarioKg || 0,
      representada_id: isValidUUID(prod.representadaId) ? prod.representadaId : null,
      ativo: true,
    };

    if (prod.id && isValidUUID(prod.id)) {
      const { data, error } = await supabase
        .from('produtos')
        .update(payload)
        .eq('id', prod.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar produto: ${error.message}`);
      return {
        id: data.id,
        codigo: data.codigo,
        codigoInterno: data.codigo_interno,
        descricao: data.descricao,
        referencia: data.referencia || '',
        unidadeMedida: data.unidade_medida,
        quantidadePorCaixa: data.quantidade_por_caixa,
        precoMilheiro: Number(data.preco_milheiro),
        precoUnidade: Number(data.preco_unidade),
        precoCaixa: Number(data.preco_caixa),
        precoUnitario: data.unidade_medida === 'CX' ? Number(data.preco_caixa) : Number(data.preco_unidade),
        aliquotaIpi: Number(data.aliquota_ipi),
        pesoUnitarioKg: Number(data.peso_unitario_kg),
        representadaId: data.representada_id,
      };
    } else {
      const { data, error } = await supabase
        .from('produtos')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao cadastrar produto: ${error.message}`);
      return {
        id: data.id,
        codigo: data.codigo,
        codigoInterno: data.codigo_interno,
        descricao: data.descricao,
        referencia: data.referencia || '',
        unidadeMedida: data.unidade_medida,
        quantidadePorCaixa: data.quantidade_por_caixa,
        precoMilheiro: Number(data.preco_milheiro),
        precoUnidade: Number(data.preco_unidade),
        precoCaixa: Number(data.preco_caixa),
        precoUnitario: data.unidade_medida === 'CX' ? Number(data.preco_caixa) : Number(data.preco_unidade),
        aliquotaIpi: Number(data.aliquota_ipi),
        pesoUnitarioKg: Number(data.peso_unitario_kg),
        representadaId: data.representada_id,
      };
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir produto: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE TRANSPORTADORAS (public.transportadoras)
// ============================================================================
export const TransportadoraService = {
  async getAll(): Promise<Transportadora[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('transportadoras')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar transportadoras no Supabase:', error);
      throw new Error(`Erro ao buscar transportadoras: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      cnpj: row.cnpj || undefined,
      telefone: row.telefone || undefined,
      cidade: row.cidade || undefined,
      estado: row.estado || undefined,
      tipoFretePadrao: row.tipo_frete_padrao as 'FOB' | 'CIF',
    }));
  },

  async save(transp: Partial<Transportadora>): Promise<Transportadora> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload = {
      nome: transp.nome?.trim(),
      cnpj: transp.cnpj?.trim() || null,
      telefone: transp.telefone?.trim() || null,
      cidade: transp.cidade?.trim() || null,
      estado: transp.estado?.trim() || null,
      tipo_frete_padrao: transp.tipoFretePadrao || 'FOB',
      ativo: true,
    };

    if (transp.id && isValidUUID(transp.id)) {
      const { data, error } = await supabase
        .from('transportadoras')
        .update(payload)
        .eq('id', transp.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar transportadora: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        cnpj: data.cnpj || undefined,
        telefone: data.telefone || undefined,
        cidade: data.cidade || undefined,
        estado: data.estado || undefined,
        tipoFretePadrao: data.tipo_frete_padrao as 'FOB' | 'CIF',
      };
    } else {
      const { data, error } = await supabase
        .from('transportadoras')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao cadastrar transportadora: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        cnpj: data.cnpj || undefined,
        telefone: data.telefone || undefined,
        cidade: data.cidade || undefined,
        estado: data.estado || undefined,
        tipoFretePadrao: data.tipo_frete_padrao as 'FOB' | 'CIF',
      };
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('transportadoras').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir transportadora: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE FORMAS DE PAGAMENTO (public.formas_pagamento)
// ============================================================================
export const FormaPagamentoService = {
  async getAll(): Promise<CondicaoPagamento[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('formas_pagamento')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar formas de pagamento no Supabase:', error);
      throw new Error(`Erro ao buscar formas de pagamento: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao || undefined,
    }));
  },

  async save(fp: Partial<CondicaoPagamento>): Promise<CondicaoPagamento> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload = {
      nome: fp.nome?.trim(),
      descricao: fp.descricao?.trim() || null,
      ativo: true,
    };

    if (fp.id && isValidUUID(fp.id)) {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .update(payload)
        .eq('id', fp.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar forma de pagamento: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        descricao: data.descricao || undefined,
      };
    } else {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao cadastrar forma de pagamento: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        descricao: data.descricao || undefined,
      };
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('formas_pagamento').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir forma de pagamento: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE REPRESENTANTES / VENDEDORES (public.representantes)
// ============================================================================
export const RepresentanteService = {
  async getAll(): Promise<Representante[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('representantes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar representantes no Supabase:', error);
      throw new Error(`Erro ao buscar representantes: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      email: row.email || undefined,
      telefone: row.telefone || undefined,
      comissaoPadrao: Number(row.comissao_padrao || 0),
    }));
  },

  async save(rep: Partial<Representante>): Promise<Representante> {
    if (!supabase) throw new Error('Supabase desconectado');
    const payload = {
      nome: rep.nome?.trim(),
      email: rep.email?.trim() || null,
      telefone: rep.telefone?.trim() || null,
      comissao_padrao: rep.comissaoPadrao !== undefined ? rep.comissaoPadrao : 5.0,
      ativo: true,
    };

    if (rep.id && isValidUUID(rep.id)) {
      const { data, error } = await supabase
        .from('representantes')
        .update(payload)
        .eq('id', rep.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar representante: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        comissaoPadrao: Number(data.comissao_padrao || 0),
      };
    } else {
      const { data, error } = await supabase
        .from('representantes')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao cadastrar representante: ${error.message}`);
      return {
        id: data.id,
        nome: data.nome,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        comissaoPadrao: Number(data.comissao_padrao || 0),
      };
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase.from('representantes').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir representante: ${error.message}`);
  },
};

// ============================================================================
// SERVIÇO DE PEDIDOS E ITENS (public.pedidos & public.itens_pedido)
// ============================================================================
export const PedidoService = {
  async getAll(): Promise<Pedido[]> {
    if (!supabase) return [];
    // Busca pedidos com joins nas tabelas vinculadas
    const { data: pedidosRows, error: pError } = await supabase
      .from('pedidos')
      .select(`
        *,
        cliente:clientes(*),
        empresa:representadas(*),
        transportadora:transportadoras(*),
        vendedor:representantes(*)
      `)
      .order('data_cadastro', { ascending: false });

    if (pError) {
      console.error('Erro ao buscar pedidos no Supabase:', pError);
      throw new Error(`Erro ao buscar pedidos: ${pError.message}`);
    }

    if (!pedidosRows || pedidosRows.length === 0) return [];

    // Busca os itens de todos os pedidos
    const pedidoIds = pedidosRows.map((p: any) => p.id);
    const { data: itensRows, error: iError } = await supabase
      .from('itens_pedido')
      .select('*')
      .in('pedido_id', pedidoIds)
      .order('created_at', { ascending: true });

    if (iError) {
      console.error('Erro ao buscar itens de pedido no Supabase:', iError);
      throw new Error(`Erro ao buscar itens de pedidos: ${iError.message}`);
    }

    const itensPorPedido: Record<string, ItemPedido[]> = {};
    (itensRows || []).forEach((row: any) => {
      if (!itensPorPedido[row.pedido_id]) itensPorPedido[row.pedido_id] = [];
      itensPorPedido[row.pedido_id].push({
        id: row.id,
        produtoId: row.produto_id,
        codigo: row.codigo,
        codigoInterno: row.codigo_interno || undefined,
        descricao: row.descricao,
        referencia: row.referencia || '',
        unidadeMedida: row.unidade_medida,
        quantidade: Number(row.quantidade),
        quantidadePorCaixa: row.quantidade_por_caixa,
        precoMilheiro: Number(row.preco_milheiro),
        precoUnidade: Number(row.preco_unidade),
        precoCaixa: Number(row.preco_caixa),
        precoUnitario: Number(row.preco_unitario),
        aliquotaIpi: Number(row.aliquota_ipi),
        valorIpi: Number(row.valor_ipi),
        valorItens: Number(row.valor_itens),
        pesoTotalKg: Number(row.peso_total_kg),
      });
    });

    return pedidosRows.map((row: any): Pedido => {
      const clienteRow = row.cliente || {};
      const empresaRow = row.empresa || {};
      const transpRow = row.transportadora || {};
      const vendRow = row.vendedor || {};

      return {
        id: row.id,
        numeroSequencial: row.numero_sequencial || undefined,
        numero: row.numero_formatado || 'RASCUNHO',
        tipo: row.tipo || 'PEDIDO',
        status: row.status,
        situacaoComercial: row.situacao_comercial || 'Enviado',
        dataCadastro: row.data_cadastro,
        dataPrevista: row.data_prevista || '',
        numeroPedidoIndustria: row.numero_pedido_industria || '',
        ordemCompraCliente: row.ordem_compra_cliente || '',
        numeroPedidoCliente: row.ordem_compra_cliente || '',
        empresaEmissora: {
          id: empresaRow.id || row.empresa_emissora_id,
          nome: empresaRow.nome || 'Empresa Emissora',
          razaoSocial: empresaRow.razao_social || undefined,
          cnpj: empresaRow.cnpj || '',
          ie: empresaRow.ie || '',
          telefone: empresaRow.telefone || '',
          endereco: empresaRow.endereco || '',
          bairro: empresaRow.bairro || '',
          cidade: empresaRow.cidade || '',
          estado: empresaRow.estado || '',
        },
        cliente: {
          id: clienteRow.id || row.cliente_id,
          codigo: clienteRow.codigo || '',
          razaoSocial: clienteRow.razao_social || '',
          nomeFantasia: clienteRow.nome_fantasia || undefined,
          cnpjCpf: clienteRow.cnpj_cpf || '',
          rgIe: clienteRow.rg_ie || '',
          telefone: clienteRow.telefone || '',
          cep: clienteRow.cep || '',
          endereco: clienteRow.endereco || '',
          numero: clienteRow.numero || '',
          complemento: clienteRow.complemento || undefined,
          bairro: clienteRow.bairro || '',
          cidade: clienteRow.cidade || '',
          estado: clienteRow.estado || 'RS',
          localEntregaPadrao: clienteRow.local_entrega_padrao || undefined,
        },
        localEntrega: row.local_entrega || '',
        transportadora: {
          id: transpRow.id || row.transportadora_id || '',
          nome: transpRow.nome || 'Nosso Carro / Próprio',
          cnpj: transpRow.cnpj || undefined,
          telefone: transpRow.telefone || undefined,
          cidade: transpRow.cidade || '',
          estado: transpRow.estado || 'RS',
          tipoFretePadrao: (transpRow.tipo_frete_padrao as 'FOB' | 'CIF') || 'FOB',
        },
        tipoFrete: row.tipo_frete || 'FOB',
        vendedor: {
          id: vendRow.id || row.vendedor_id,
          nome: vendRow.nome || 'Vendedor',
          comissaoPadrao: Number(vendRow.comissao_padrao || 5.0),
        },
        formaPagamento: row.forma_pagamento_nome || undefined,
        condicaoPagamento: row.condicao_pagamento || '',
        itens: itensPorPedido[row.id] || [],
        totalItens: Number(row.total_itens || 0),
        frete: Number(row.frete || 0),
        totalAcrescimos: Number(row.total_acrescimos || 0),
        substituicaoTributaria: Number(row.substituicao_tributaria || 0),
        totalIpi: Number(row.total_ipi || 0),
        totalPedido: Number(row.total_pedido || 0),
        pesoTotalKg: Number(row.peso_total_kg || 0),
        programado: Boolean(row.programado),
        dataProgramada: row.data_programada || undefined,
        observacoes: row.observacoes || '',
        conferente: row.conferente || undefined,
      };
    });
  },

  /**
   * Salva pedido em Rascunho (INSERT ou UPDATE) e seus itens com snapshot.
   */
  async saveDraft(
    pedido: Pedido,
    formaPagamentoId?: string
  ): Promise<Pedido> {
    if (!supabase) throw new Error('Supabase desconectado');

    const isNew = !pedido.id || !isValidUUID(pedido.id);

    // Garantia de vendedor_id obrigatório e válido no Supabase (ex: Douglas ou primeiro ativo)
    let finalVendedorId = pedido.vendedor?.id;
    if (!finalVendedorId || !isValidUUID(finalVendedorId)) {
      const { data: reps } = await supabase
        .from('representantes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (reps && reps.length > 0) {
        const douglas = reps.find((r: any) => r.nome?.toLowerCase().includes('douglas'));
        finalVendedorId = douglas ? douglas.id : reps[0].id;
      }
    }

    if (!finalVendedorId || !isValidUUID(finalVendedorId)) {
      throw new Error('Nenhum representante operacional foi encontrado no Supabase para vincular ao pedido.');
    }

    // Garantia de empresa_emissora_id obrigatório e válido no Supabase
    let finalEmpresaId = pedido.empresaEmissora?.id;
    if (!finalEmpresaId || !isValidUUID(finalEmpresaId)) {
      const { data: emps } = await supabase
        .from('representadas')
        .select('id')
        .eq('ativo', true)
        .limit(1);
      if (emps && emps.length > 0) {
        finalEmpresaId = emps[0].id;
      }
    }

    if (!finalEmpresaId || !isValidUUID(finalEmpresaId)) {
      throw new Error('Nenhuma representada ativa foi encontrada no Supabase para vincular ao pedido.');
    }

    const finalClienteId = pedido.cliente?.id;
    if (!finalClienteId || !isValidUUID(finalClienteId)) {
      throw new Error('Cliente inválido. Por favor, salve o cliente no banco antes de emitir o pedido.');
    }

    const pedidoPayload: any = {
      tipo: pedido.tipo || 'PEDIDO',
      status: 'Rascunho', // Sempre salvo como Rascunho inicialmente
      situacao_comercial: pedido.situacaoComercial || 'Enviado',
      data_prevista: pedido.dataPrevista || null,
      numero_pedido_industria: pedido.numeroPedidoIndustria?.trim() || null,
      ordem_compra_cliente: pedido.ordemCompraCliente?.trim() || null,
      empresa_emissora_id: finalEmpresaId,
      cliente_id: finalClienteId,
      local_entrega: pedido.localEntrega?.trim() || null,
      transportadora_id: isValidUUID(pedido.transportadora?.id) ? pedido.transportadora.id : null,
      tipo_frete: pedido.tipoFrete || 'FOB',
      vendedor_id: finalVendedorId,
      forma_pagamento_id: isValidUUID(formaPagamentoId) ? formaPagamentoId : null,
      forma_pagamento_nome: pedido.formaPagamento?.trim() || null,
      condicao_pagamento: pedido.condicaoPagamento?.trim() || 'À vista',
      total_itens: pedido.totalItens || 0,
      frete: pedido.frete || 0,
      total_acrescimos: pedido.totalAcrescimos || 0,
      substituicao_tributaria: pedido.substituicaoTributaria || 0,
      total_ipi: pedido.totalIpi || 0,
      total_pedido: pedido.totalPedido || 0,
      peso_total_kg: pedido.pesoTotalKg || 0,
      programado: Boolean(pedido.programado),
      observacoes: pedido.observacoes?.trim() || null,
    };

    let pedidoSalvoRow: any;

    if (isNew) {
      const { data, error } = await supabase
        .from('pedidos')
        .insert(pedidoPayload)
        .select()
        .single();
      if (error) throw new Error(`Erro ao criar pedido: ${error.message}`);
      pedidoSalvoRow = data;
    } else {
      const { data, error } = await supabase
        .from('pedidos')
        .update(pedidoPayload)
        .eq('id', pedido.id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`);
      pedidoSalvoRow = data;
    }

    const pedidoId = pedidoSalvoRow.id;

    // Se já existiam itens em rascunho, deleta e reinsere o snapshot atualizado
    if (!isNew) {
      const { error: delError } = await supabase
        .from('itens_pedido')
        .delete()
        .eq('pedido_id', pedidoId);
      if (delError) throw new Error(`Erro ao atualizar itens: ${delError.message}`);
    }

    // Insere os itens
    if (pedido.itens && pedido.itens.length > 0) {
      const itensPayload = pedido.itens.map((it) => ({
        pedido_id: pedidoId,
        produto_id: it.produtoId,
        codigo: it.codigo,
        codigo_interno: it.codigoInterno || null,
        descricao: it.descricao,
        referencia: it.referencia || null,
        unidade_medida: it.unidadeMedida,
        quantidade: it.quantidade,
        quantidade_por_caixa: it.quantidadePorCaixa || 1,
        preco_milheiro: it.precoMilheiro || 0,
        preco_unidade: it.precoUnidade || 0,
        preco_caixa: it.precoCaixa || 0,
        preco_unitario: it.precoUnitario || 0,
        aliquota_ipi: it.aliquotaIpi || 0,
        valor_ipi: it.valorIpi || 0,
        valor_itens: it.valorItens || 0,
        peso_total_kg: it.pesoTotalKg || 0,
      }));

      const { error: insItensError } = await supabase
        .from('itens_pedido')
        .insert(itensPayload);

      if (insItensError) throw new Error(`Erro ao inserir itens do pedido: ${insItensError.message}`);
    }

    return {
      ...pedido,
      id: pedidoSalvoRow.id,
      numeroSequencial: pedidoSalvoRow.numero_sequencial || undefined,
      numero: pedidoSalvoRow.numero_formatado || 'RASCUNHO',
      status: pedidoSalvoRow.status,
      situacaoComercial: pedidoSalvoRow.situacao_comercial,
      dataCadastro: pedidoSalvoRow.data_cadastro,
    };
  },

  /**
   * EMISSÃO OFICIAL:
   * Salva o pedido/itens em Rascunho e em seguida altera o status para 'Emitido'.
   * O trigger PostgreSQL consome seq_pedidos_numero e gera PEDxxxxxx.
   */
  async emitirPedido(
    pedido: Pedido,
    formaPagamentoId?: string
  ): Promise<Pedido> {
    if (!supabase) throw new Error('Supabase desconectado');

    // 1. Garante que está salvo em rascunho
    const salvoRascunho = await this.saveDraft(pedido, formaPagamentoId);

    // 2. Transição Rascunho -> Emitido
    const { data: emitidoRow, error } = await supabase
      .from('pedidos')
      .update({ status: 'Emitido' })
      .eq('id', salvoRascunho.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha na emissão comercial do pedido: ${error.message}`);
    }

    return {
      ...salvoRascunho,
      numeroSequencial: emitidoRow.numero_sequencial,
      numero: emitidoRow.numero_formatado, // ex: PED000001 retornado pelo banco
      status: 'Emitido',
      situacaoComercial: emitidoRow.situacao_comercial,
    };
  },

  /**
   * ALTERAR SITUAÇÃO COMERCIAL (Enviado <-> Fechado)
   * Permitido pelo banco mesmo com pedido Emitido.
   */
  async toggleSituacaoComercial(id: string, novaSituacao: SituacaoComercial): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase
      .from('pedidos')
      .update({ situacao_comercial: novaSituacao })
      .eq('id', id);

    if (error) {
      throw new Error(`Falha ao alterar situação comercial: ${error.message}`);
    }
  },

  /**
   * CANCELAR PEDIDO
   */
  async cancelarPedido(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) return;
    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'Cancelado' })
      .eq('id', id);

    if (error) {
      throw new Error(`Falha ao cancelar pedido: ${error.message}`);
    }
  },

  /**
   * EXCLUIR PEDIDO DEFINITIVAMENTE:
   * 1. Exclui primeiro todos os itens relacionados em public.itens_pedido;
   * 2. Exclui o registro de public.pedidos;
   * 3. Aguarda a resposta real do Supabase e propaga qualquer erro.
   */
  async deletePedido(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase desconectado');
    if (!isValidUUID(id)) {
      // Se não for UUID válido (por exemplo legado ou em memória), não há registro no banco
      return;
    }

    // 1. Excluir primeiro todos os itens relacionados em public.itens_pedido
    const { error: errorItens } = await supabase
      .from('itens_pedido')
      .delete()
      .eq('pedido_id', id);

    if (errorItens) {
      throw new Error(`Falha ao excluir itens do pedido no Supabase: ${errorItens.message}`);
    }

    // 2. Excluir o registro principal em public.pedidos
    const { error: errorPedido } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (errorPedido) {
      throw new Error(`Falha ao excluir pedido no Supabase: ${errorPedido.message}`);
    }
  },
};
