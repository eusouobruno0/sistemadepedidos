export interface Cliente {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpjCpf: string;
  rgIe: string;
  telefone: string;
  celular?: string;
  email?: string;
  contato?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  localEntregaPadrao?: string;
}

export interface Transportadora {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  tipoFretePadrao: 'FOB' | 'CIF';
}

export interface Produto {
  id: string;
  codigo: string; // Código comercial / fábrica / referência externa
  codigoInterno: string; // Código interno sequencial único do sistema (ex: 000001)
  descricao: string;
  referencia: string;
  unidadeMedida: 'CX' | 'UN' | 'MIL' | 'KG' | 'PC' | 'FD';
  quantidadePorCaixa?: number; // Ex: 10000 unidades em 1 caixa
  precoCaixa?: number; // Preço da caixa cheia (R$)
  precoUnidade?: number; // Preço derivado da unidade (R$) = precoCaixa / quantidadePorCaixa
  precoMilheiro?: number; // Preço por milheiro derivado (R$) = precoUnidade * 1000
  qtdMilheiroPorCaixa?: number; // Compatibilidade legada
  qtdPorCaixa?: number; // Compatibilidade legada
  precoUnitario: number; // Preço comercial padrão (por CX ou UN)
  aliquotaIpi: number; // Ex: 6.5 (%)
  pesoUnitarioKg: number; // Peso unitário em kg (por caixa ou por unidade)
  representadaId?: string;
}

export interface Representada {
  id: string;
  nome: string;
  razaoSocial?: string;
  cnpj: string;
  ie: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
  logoUrl?: string;
}

export interface Representante {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  comissaoPadrao: number; // % comissão
}

export interface CondicaoPagamento {
  id: string;
  nome: string;
  dias?: number[]; // Ex: [28], [30, 60, 90]
  descricao?: string;
}

export interface ItemPedido {
  id: string;
  produtoId: string;
  codigo: string; // Código de fábrica / referência externa
  codigoInterno?: string; // Código interno do produto no sistema
  descricao: string;
  referencia: string;
  unidadeMedida: string;
  quantidade: number; // Quantidade de caixas ou unidades
  quantidadePorCaixa?: number; // Quantas unidades por caixa (ex: 10.000)
  precoCaixa?: number; // Preço da caixa no pedido
  precoUnidade?: number; // Preço da unidade no pedido
  precoMilheiro?: number; // Preço por milheiro no pedido
  qtdMilheiro?: number; // Compatibilidade
  precoUnitario: number; // Preço efetivo aplicado (por CX ou UN)
  aliquotaIpi: number;
  valorIpi: number;
  valorItens: number; // Subtotal sem IPI
  pesoTotalKg: number;
}

export type TipoDocumento = 'ORCAMENTO' | 'PEDIDO';
export type StatusPedido = 'Rascunho' | 'Emitido' | 'Cancelado' | 'Aprovado' | 'Pendente' | 'Faturado';
export type SituacaoComercial = 'Enviado' | 'Fechado';

export interface Pedido {
  id: string; // UUID técnico único
  numeroSequencial?: number; // Sequencial comercial interno gerado pelo sistema (1, 2, 3...)
  numero: string; // Exibição formatada do número do pedido do sistema: PED000001 (ou Rascunho)
  tipo: TipoDocumento;
  status: StatusPedido;
  situacaoComercial: SituacaoComercial; // 'Enviado' | 'Fechado'
  dataCadastro: string; // ISO string
  dataPrevista: string; // YYYY-MM-DD
  numeroPedidoIndustria?: string; // Número fornecido pela indústria (preenchido manualmente pelo usuário)
  ordemCompraCliente?: string; // Ordem de Compra do Cliente (preenchimento manual independente)
  numeroPedidoCliente?: string; // Mantido para compatibilidade retroativa
  
  empresaEmissora: Representada;
  cliente: Cliente;
  localEntrega: string;
  transportadora: Transportadora;
  tipoFrete: 'FOB' | 'CIF';
  
  vendedor: Representante;
  formaPagamento?: string;
  condicaoPagamento: string;
  condicaoManual?: string;
  
  itens: ItemPedido[];
  
  totalItens: number;
  frete: number;
  totalAcrescimos: number;
  substituicaoTributaria: number;
  totalIpi: number; // IPI sempre segregado
  totalPedido: number;
  pesoTotalKg: number;
  
  programado: boolean;
  dataProgramada?: string; // dd/mm/aa
  observacoes: string;
  conferente?: string;
}

export interface RelatorioFiltros {
  dataInicio?: string;
  dataFim?: string;
  vendedorId?: string;
  representadaId?: string;
  condicaoPagamento?: string;
  tipoFrete?: 'FOB' | 'CIF' | 'TODOS';
  situacaoComercial?: 'TODOS' | 'Enviado' | 'Fechado';
}
