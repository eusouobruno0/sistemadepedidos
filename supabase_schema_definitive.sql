-- ============================================================================
-- SISTEMA DE GESTÃO DE PEDIDOS — SCHEMA DEFINITIVO POSTGRESQL / SUPABASE
-- ============================================================================
-- ARQUITETURA DEFINITIVA:
-- 1. Base Nova & Limpa: Zero mocks, sequências seguras (000001 / PED000001).
-- 2. Códigos Internos Imutáveis: Gerados estritamente pelo banco (Cliente e Produto).
-- 3. Máquina de Estados e Numeração Unificada (Trigger Único Consolidado):
--    - INSERT: Nasce OBRIGATORIAMENTE como 'Rascunho', sem consumir sequência.
--      Valores forjados pelo frontend como Emitido/Cancelado/PED são ignorados.
--    - Rascunho -> Emitido: Consome exatamente 1 número e gera 'PEDxxxxxx'.
--    - Rascunho -> Cancelado: NÃO consome número (grava 'CANCELADO').
--    - Emitido -> Cancelado: Preserva permanentemente o número PED original.
--    - Bloqueio total de reversão: Emitido -> Rascunho e Cancelado -> * PROIBIDOS.
-- 4. Imutabilidade Real e Robusta do Pedido Emitido:
--    - Comparação completa da linha via JSONB: se Emitido -> Emitido, a ÚNICA
--      alteração comercial permitida é 'situacao_comercial' (Enviado <-> Fechado)
--      e 'updated_at'. Todos os demais dados da linha são 100% congelados.
--    - Se Emitido -> Cancelado: somente 'status' e 'updated_at' podem mudar.
--    - Cancelado é completamente imutável e não pode ser excluído.
-- 5. Regra Estrita: 1 Pedido = 1 Representada:
--    - Banco impede itens de representada diferente do pedido.
--    - Banco impede alterar a representada do pedido se já houver itens.
-- 6. Preço Base é o Milheiro (preco_milheiro):
--    - preco_milheiro é a fonte única de verdade comercial (NUMERIC).
--    - preco_unidade = preco_milheiro / 1000 (calculado e mantido consistente).
--    - preco_caixa = (preco_milheiro * quantidade_por_caixa) / 1000.
--    - Campo ambíguo preco_unitario removido do cadastro de produtos.
-- 7. Snapshot Comercial Completo nos Itens:
--    - Itens preservam preços, IPI, quantidades e descrições do momento da compra.
-- 8. Pagamento Desacoplado e Normalizado:
--    - Tabela formas_pagamento (Boleto, PIX, Transferência, etc.).
--    - No pedido: forma_pagamento_id, forma_pagamento_nome (snapshot) e condicao_pagamento.
-- 9. IPI Segregado:
--    - IPI não compõe base de cálculo de comissão.
-- 10. Normalização de CPF/CNPJ:
--    - Documento limpo (apenas dígitos) com restrição UNIQUE contra duplicidade.
-- 11. Segurança Auth & RLS:
--    - Autopromoção para admin bloqueada no trigger de criação de usuário.
--    - RLS sem referências a OLD/NEW. Functions com search_path seguro.
-- 12. Triggers reutilizáveis de updated_at para todas as tabelas.
-- ============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SEQUÊNCIAS DO SISTEMA
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.seq_cliente_codigo START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_produto_codigo_interno START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_pedidos_numero START WITH 1 INCREMENT BY 1;

-- ============================================================================
-- 3. FUNÇÃO UTILITÁRIA REUTILIZÁVEL: UPDATED_AT AUTOMÁTICO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNÇÃO UTILITÁRIA: NORMALIZAÇÃO DE CPF/CNPJ (APENAS DÍGITOS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_normalizar_documento(p_doc TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_doc IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN regexp_replace(p_doc, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. TABELA: REPRESENTANTES (Vendedores e Usuários)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.representantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    comissao_padrao NUMERIC(5,2) CHECK (comissao_padrao IS NULL OR (comissao_padrao >= 0 AND comissao_padrao <= 100)),
    papel TEXT NOT NULL DEFAULT 'representante' CHECK (papel IN ('admin', 'representante')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_representantes_updated_at ON public.representantes;
CREATE TRIGGER trg_representantes_updated_at
BEFORE UPDATE ON public.representantes
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 6. TABELA: REPRESENTADAS (Empresas Emissoras / Indústrias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.representadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT NOT NULL,
    cnpj_normalizado TEXT NOT NULL,
    ie TEXT,
    telefone TEXT,
    endereco TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    logo_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_representadas_cnpj_normalizado UNIQUE (cnpj_normalizado)
);

CREATE OR REPLACE FUNCTION public.fn_normalizar_cnpj_representada()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cnpj_normalizado := public.fn_normalizar_documento(NEW.cnpj);
    IF length(NEW.cnpj_normalizado) NOT IN (11, 14) THEN
        RAISE EXCEPTION 'Documento de representada inválido. Deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_cnpj_representada ON public.representadas;
CREATE TRIGGER trg_normalizar_cnpj_representada
BEFORE INSERT OR UPDATE OF cnpj ON public.representadas
FOR EACH ROW EXECUTE FUNCTION public.fn_normalizar_cnpj_representada();

DROP TRIGGER IF EXISTS trg_representadas_updated_at ON public.representadas;
CREATE TRIGGER trg_representadas_updated_at
BEFORE UPDATE ON public.representadas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 7. TABELA: CLIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj_cpf TEXT NOT NULL,
    cnpj_cpf_normalizado TEXT NOT NULL,
    rg_ie TEXT,
    telefone TEXT,
    celular TEXT,
    email TEXT,
    contato TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    local_entrega_padrao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_clientes_cnpj_cpf_normalizado UNIQUE (cnpj_cpf_normalizado)
);

CREATE OR REPLACE FUNCTION public.fn_cliente_pre_processamento()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- O frontend NÃO escolhe o código interno. O banco gera sempre sequencial 000001
        NEW.codigo := lpad(nextval('public.seq_cliente_codigo')::text, 6, '0');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Código interno é imutável
        NEW.codigo := OLD.codigo;
    END IF;

    NEW.cnpj_cpf_normalizado := public.fn_normalizar_documento(NEW.cnpj_cpf);
    IF length(NEW.cnpj_cpf_normalizado) NOT IN (11, 14) THEN
        RAISE EXCEPTION 'Documento de cliente inválido (%). Deve conter 11 (CPF) ou 14 dígitos (CNPJ).', NEW.cnpj_cpf;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cliente_pre_processamento ON public.clientes;
CREATE TRIGGER trg_cliente_pre_processamento
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_cliente_pre_processamento();

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 8. TABELA: PRODUTOS (FONTE ÚNICA DE VERDADE: PREÇO DO MILHEIRO)
-- ============================================================================
-- preco_unitario foi removido do cadastro para eliminar ambiguidades.
-- preco_milheiro é informado pelo usuário.
-- preco_unidade e preco_caixa são calculados estritamente pelo banco.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL, -- Código de fábrica / catálogo externo
    codigo_interno TEXT UNIQUE NOT NULL, -- Sequencial gerado pelo banco (000001)
    descricao TEXT NOT NULL,
    referencia TEXT,
    unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('CX', 'UN', 'MIL', 'KG', 'PC', 'FD')),
    quantidade_por_caixa INTEGER NOT NULL CHECK (quantidade_por_caixa > 0) DEFAULT 1,
    preco_milheiro NUMERIC(12,2) NOT NULL CHECK (preco_milheiro >= 0) DEFAULT 0.00,
    preco_unidade NUMERIC(12,4) NOT NULL CHECK (preco_unidade >= 0) DEFAULT 0.0000,
    preco_caixa NUMERIC(12,2) NOT NULL CHECK (preco_caixa >= 0) DEFAULT 0.00,
    aliquota_ipi NUMERIC(5,2) NOT NULL CHECK (aliquota_ipi >= 0 AND aliquota_ipi <= 100) DEFAULT 0.00,
    peso_unitario_kg NUMERIC(10,3) NOT NULL CHECK (peso_unitario_kg >= 0) DEFAULT 0.000,
    representada_id UUID NOT NULL REFERENCES public.representadas(id) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_produto_pre_processamento()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Código interno sequencial único sempre gerado pelo banco (000001)
        NEW.codigo_interno := lpad(nextval('public.seq_produto_codigo_interno')::text, 6, '0');
        IF NEW.codigo IS NULL OR trim(NEW.codigo) = '' THEN
            NEW.codigo := NEW.codigo_interno;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Código interno é rigorosamente imutável
        NEW.codigo_interno := OLD.codigo_interno;
    END IF;

    -- Fonte ÚNICA de verdade comercial: PREÇO DO MILHEIRO
    NEW.preco_unidade := round(NEW.preco_milheiro / 1000.0, 4);
    NEW.preco_caixa := round((NEW.preco_milheiro * NEW.quantidade_por_caixa) / 1000.0, 2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_produto_pre_processamento ON public.produtos;
CREATE TRIGGER trg_produto_pre_processamento
BEFORE INSERT OR UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.fn_produto_pre_processamento();

DROP TRIGGER IF EXISTS trg_produtos_updated_at ON public.produtos;
CREATE TRIGGER trg_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 9. TABELA: TRANSPORTADORAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transportadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    cnpj_normalizado TEXT,
    telefone TEXT,
    cidade TEXT,
    estado TEXT,
    tipo_frete_padrao TEXT NOT NULL DEFAULT 'FOB' CHECK (tipo_frete_padrao IN ('FOB', 'CIF')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fn_normalizar_cnpj_transportadora()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cnpj IS NOT NULL AND trim(NEW.cnpj) <> '' THEN
        NEW.cnpj_normalizado := public.fn_normalizar_documento(NEW.cnpj);
    ELSE
        NEW.cnpj_normalizado := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_cnpj_transportadora ON public.transportadoras;
CREATE TRIGGER trg_normalizar_cnpj_transportadora
BEFORE INSERT OR UPDATE OF cnpj ON public.transportadoras
FOR EACH ROW EXECUTE FUNCTION public.fn_normalizar_cnpj_transportadora();

DROP TRIGGER IF EXISTS trg_transportadoras_updated_at ON public.transportadoras;
CREATE TRIGGER trg_transportadoras_updated_at
BEFORE UPDATE ON public.transportadoras
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 10. TABELA: FORMAS DE PAGAMENTO (CATEGORIA CADASTRÁVEL)
-- ============================================================================
-- Exemplos: Boleto, PIX, Transferência, Depósito, Cheque, Cartão.
-- A condição comercial (ex: 30/60/90, À vista) é texto livre informado no pedido.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_formas_pagamento_updated_at ON public.formas_pagamento;
CREATE TRIGGER trg_formas_pagamento_updated_at
BEFORE UPDATE ON public.formas_pagamento
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================================
-- 11. TABELA: PEDIDOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_sequencial INTEGER UNIQUE,
    numero_formatado TEXT,
    tipo TEXT NOT NULL DEFAULT 'PEDIDO' CHECK (tipo IN ('ORCAMENTO', 'PEDIDO')),
    status TEXT NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Emitido', 'Cancelado')),
    situacao_comercial TEXT NOT NULL DEFAULT 'Enviado' CHECK (situacao_comercial IN ('Enviado', 'Fechado')),
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_prevista DATE,
    numero_pedido_industria TEXT,
    ordem_compra_cliente TEXT,
    empresa_emissora_id UUID NOT NULL REFERENCES public.representadas(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    local_entrega TEXT,
    transportadora_id UUID REFERENCES public.transportadoras(id) ON DELETE RESTRICT,
    tipo_frete TEXT NOT NULL DEFAULT 'FOB' CHECK (tipo_frete IN ('FOB', 'CIF')),
    vendedor_id UUID NOT NULL REFERENCES public.representantes(id) ON DELETE RESTRICT,
    forma_pagamento_id UUID REFERENCES public.formas_pagamento(id) ON DELETE RESTRICT,
    forma_pagamento_nome TEXT, -- Snapshot do nome da forma de pagamento na emissão
    condicao_pagamento TEXT NOT NULL, -- Texto livre da condição negociada (ex: '30/60/90', 'À vista')
    total_itens NUMERIC(14,2) NOT NULL CHECK (total_itens >= 0) DEFAULT 0.00,
    frete NUMERIC(14,2) NOT NULL CHECK (frete >= 0) DEFAULT 0.00,
    total_acrescimos NUMERIC(14,2) NOT NULL CHECK (total_acrescimos >= 0) DEFAULT 0.00,
    substituicao_tributaria NUMERIC(14,2) NOT NULL CHECK (substituicao_tributaria >= 0) DEFAULT 0.00,
    total_ipi NUMERIC(14,2) NOT NULL CHECK (total_ipi >= 0) DEFAULT 0.00,
    total_pedido NUMERIC(14,2) NOT NULL CHECK (total_pedido >= 0) DEFAULT 0.00,
    peso_total_kg NUMERIC(12,3) NOT NULL CHECK (peso_total_kg >= 0) DEFAULT 0.000,
    programado BOOLEAN NOT NULL DEFAULT false,
    data_programada DATE,
    observacoes TEXT,
    conferente TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. TABELA: ITENS DO PEDIDO (SNAPSHOT COMERCIAL COMPLETO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    codigo TEXT NOT NULL,
    codigo_interno TEXT,
    descricao TEXT NOT NULL,
    referencia TEXT,
    unidade_medida TEXT NOT NULL,
    quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
    quantidade_por_caixa INTEGER NOT NULL CHECK (quantidade_por_caixa > 0) DEFAULT 1,
    preco_milheiro NUMERIC(12,2) NOT NULL CHECK (preco_milheiro >= 0) DEFAULT 0.00,
    preco_unidade NUMERIC(12,4) NOT NULL CHECK (preco_unidade >= 0) DEFAULT 0.0000,
    preco_caixa NUMERIC(12,2) NOT NULL CHECK (preco_caixa >= 0) DEFAULT 0.00,
    preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0) DEFAULT 0.00, -- Preço efetivo aplicado (por CX ou UN)
    aliquota_ipi NUMERIC(5,2) NOT NULL CHECK (aliquota_ipi >= 0 AND aliquota_ipi <= 100) DEFAULT 0.00,
    valor_ipi NUMERIC(12,2) NOT NULL CHECK (valor_ipi >= 0) DEFAULT 0.00,
    valor_itens NUMERIC(12,2) NOT NULL CHECK (valor_itens >= 0) DEFAULT 0.00,
    comissao_percentual NUMERIC(5,2) CHECK (comissao_percentual IS NULL OR (comissao_percentual >= 0 AND comissao_percentual <= 100)),
    comissao_valor NUMERIC(12,2) CHECK (comissao_valor IS NULL OR comissao_valor >= 0),
    peso_total_kg NUMERIC(12,3) NOT NULL CHECK (peso_total_kg >= 0) DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 13. ÍNDICES DE PERFORMANCE E CONSULTA ANALÍTICA
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_situacao_comercial ON public.pedidos(situacao_comercial);
CREATE INDEX IF NOT EXISTS idx_pedidos_ordem_compra_cliente ON public.pedidos(ordem_compra_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON public.pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_emissora_id ON public.pedidos(empresa_emissora_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_cadastro ON public.pedidos(data_cadastro DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_forma_pagamento_id ON public.pedidos(forma_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_by ON public.pedidos(created_by);

-- Índice composto para relatórios de vendas efetivas (Fechados e não cancelados)
CREATE INDEX IF NOT EXISTS idx_pedidos_venda_efetiva ON public.pedidos(situacao_comercial, status, data_cadastro DESC);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON public.itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON public.clientes(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON public.produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produtos_representada_id ON public.produtos(representada_id);

-- ============================================================================
-- 14. REGRA: 1 PEDIDO = 1 REPRESENTADA (VALIDAÇÃO EM BANCO)
-- ============================================================================
-- A. Impede adicionar/alterar item com produto pertencente a outra representada
CREATE OR REPLACE FUNCTION public.fn_validar_representada_item_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_representada_pedido UUID;
    v_representada_produto UUID;
BEGIN
    SELECT empresa_emissora_id INTO v_representada_pedido
    FROM public.pedidos
    WHERE id = NEW.pedido_id;

    SELECT representada_id INTO v_representada_produto
    FROM public.produtos
    WHERE id = NEW.produto_id;

    IF v_representada_pedido IS NOT NULL AND v_representada_produto IS NOT NULL THEN
        IF v_representada_pedido <> v_representada_produto THEN
            RAISE EXCEPTION 'Violação da regra 1 Pedido = 1 Representada: O produto selecionado pertence à representada % e o pedido pertence à representada %.',
                v_representada_produto, v_representada_pedido;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_representada_item_pedido ON public.itens_pedido;
CREATE TRIGGER trg_validar_representada_item_pedido
BEFORE INSERT OR UPDATE OF produto_id, pedido_id ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_representada_item_pedido();

-- B. Impede trocar a representada do pedido se já existirem itens cadastrados nele
CREATE OR REPLACE FUNCTION public.fn_validar_troca_representada_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_tem_itens BOOLEAN;
BEGIN
    IF OLD.empresa_emissora_id <> NEW.empresa_emissora_id THEN
        SELECT EXISTS (
            SELECT 1 FROM public.itens_pedido WHERE pedido_id = OLD.id
        ) INTO v_tem_itens;

        IF v_tem_itens THEN
            RAISE EXCEPTION 'Não é permitido alterar a representada do pedido pois já existem itens vinculados a ele. Remova os itens antes de alterar a representada.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_troca_representada_pedido ON public.pedidos;
CREATE TRIGGER trg_validar_troca_representada_pedido
BEFORE UPDATE OF empresa_emissora_id ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_troca_representada_pedido();

-- ============================================================================
-- 15 & 16. TRIGGER PRINCIPAL CONSOLIDADO DE PEDIDOS:
--          CICLO DE VIDA, MÁQUINA DE ESTADOS, NUMERAÇÃO E IMUTABILIDADE REAL
-- ============================================================================
-- Regras Absolutas:
-- 1. INSERT:
--    - O pedido nasce OBRIGATORIAMENTE com status = 'Rascunho'.
--    - numero_sequencial := NULL.
--    - numero_formatado := 'RASCUNHO'.
--    - NENHUM número da sequence seq_pedidos_numero é consumido no INSERT.
--    - created_by, created_at e updated_at são garantidos pelo banco.
-- 2. UPDATE:
--    - Se OLD.status = 'Cancelado':
--      Cancelado é completamente imutável. Qualquer tentativa de alteração gera erro.
--    - Se OLD.status = 'Emitido':
--      * Reversão para 'Rascunho' é estritamente proibida.
--      * Se continuar 'Emitido':
--        Comparação robusta de toda a linha via JSONB:
--        A ÚNICA alteração permitida é 'situacao_comercial' (Enviado <-> Fechado) e 'updated_at'.
--        Todos os dados comerciais permanecem 100% congelados.
--      * Se transicionar para 'Cancelado':
--        Preserva o número PED original intacto (numero_sequencial e numero_formatado).
--        Apenas 'status' e 'updated_at' podem mudar.
--    - Se OLD.status = 'Rascunho':
--      * Se continuar 'Rascunho': Editável normalmente; numero_sequencial := NULL; numero_formatado := 'RASCUNHO'.
--      * Se transicionar para 'Emitido': Consome exatamente 1 número de seq_pedidos_numero e gera 'PEDxxxxxx'.
--      * Se transicionar para 'Cancelado': Não consome sequência; numero_sequencial := NULL; numero_formatado := 'CANCELADO'.
-- 3. DELETE:
--    - Somente pedidos com status 'Rascunho' podem ser excluídos.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: INSERT
    -- ------------------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        -- CORREÇÃO 1: Novo pedido nasce SEMPRE Rascunho, mesmo se o frontend tentar enviar outro status
        NEW.status := 'Rascunho';
        NEW.numero_sequencial := NULL;
        NEW.numero_formatado := 'RASCUNHO';

        IF NEW.created_by IS NULL THEN
            NEW.created_by := auth.uid();
        END IF;

        NEW.created_at := now();
        NEW.updated_at := now();

        -- Snapshot do nome da forma de pagamento
        IF NEW.forma_pagamento_id IS NOT NULL AND (NEW.forma_pagamento_nome IS NULL OR trim(NEW.forma_pagamento_nome) = '') THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: UPDATE
    -- ------------------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();

        -- Snapshot do nome da forma de pagamento se alterada em Rascunho
        IF NEW.forma_pagamento_id IS DISTINCT FROM OLD.forma_pagamento_id THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        -- CASO 1: Pedido anterior era CANCELADO
        IF OLD.status = 'Cancelado' THEN
            RAISE EXCEPTION 'Pedidos cancelados permanecem no histórico e são completamente imutáveis.';
        END IF;

        -- CASO 2: Pedido anterior era EMITIDO
        IF OLD.status = 'Emitido' THEN
            -- Proibição absoluta de reversão para Rascunho
            IF NEW.status = 'Rascunho' THEN
                RAISE EXCEPTION 'Não é permitido reverter um pedido Emitido para Rascunho. O pedido já possui numeração oficial (%).', OLD.numero_formatado;
            END IF;

            -- Subcaso 2A: Continua Emitido -> Apenas situacao_comercial e updated_at podem mudar
            IF NEW.status = 'Emitido' THEN
                -- Garante preservação dos números originais
                NEW.numero_sequencial := OLD.numero_sequencial;
                NEW.numero_formatado := OLD.numero_formatado;

                IF (to_jsonb(NEW) - 'situacao_comercial' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'situacao_comercial' - 'updated_at') THEN
                    RAISE EXCEPTION 'Pedidos emitidos têm todos os seus dados comerciais congelados. Apenas a situação comercial (Enviado/Fechado) e updated_at podem ser alterados.';
                END IF;
            END IF;

            -- Subcaso 2B: Emitido -> Cancelado -> Preserva o número PED e congela dados comerciais
            IF NEW.status = 'Cancelado' THEN
                NEW.numero_sequencial := OLD.numero_sequencial;
                NEW.numero_formatado := OLD.numero_formatado;

                IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
                    RAISE EXCEPTION 'Ao cancelar um pedido Emitido, nenhum dado comercial pode ser modificado. Altere apenas o status para Cancelado.';
                END IF;
            END IF;

            RETURN NEW;
        END IF;

        -- CASO 3: Pedido anterior era RASCUNHO
        IF OLD.status = 'Rascunho' THEN
            -- Transição Rascunho -> Emitido: Consome exatamente 1 número PED
            IF NEW.status = 'Emitido' THEN
                IF NEW.numero_sequencial IS NULL THEN
                    NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
                END IF;
                NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');

            -- Transição Rascunho -> Cancelado: NÃO consome número PED
            ELSIF NEW.status = 'Cancelado' THEN
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'CANCELADO';

            -- Rascunho continua Rascunho: Livre edição
            ELSIF NEW.status = 'Rascunho' THEN
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'RASCUNHO';

            ELSE
                RAISE EXCEPTION 'Transição de status inválida para pedido em rascunho: %.', NEW.status;
            END IF;

            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: DELETE
    -- ------------------------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'Rascunho' THEN
            RAISE EXCEPTION 'Operação não permitida: Apenas pedidos com status Rascunho podem ser excluídos. Pedidos com status % (%) devem permanecer no histórico.',
                OLD.status, COALESCE(OLD.numero_formatado, OLD.id::text);
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_ciclo_vida ON public.pedidos;
CREATE TRIGGER trg_pedidos_ciclo_vida
BEFORE INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido();

-- ============================================================================
-- 17. TRIGGER DE BLINDAGEM DE ITENS DO PEDIDO
-- ============================================================================
-- Apenas pedidos em 'Rascunho' podem sofrer INSERT, UPDATE ou DELETE de itens.
CREATE OR REPLACE FUNCTION public.fn_proteger_itens_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_status_pedido TEXT;
    v_num_pedido TEXT;
    v_id_pedido UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_pedido := OLD.pedido_id;
    ELSE
        v_id_pedido := NEW.pedido_id;
    END IF;

    SELECT status, numero_formatado INTO v_status_pedido, v_num_pedido
    FROM public.pedidos
    WHERE id = v_id_pedido;

    IF v_status_pedido IS NULL THEN
        -- Pedido sendo deletado em cascata
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF v_status_pedido <> 'Rascunho' THEN
        RAISE EXCEPTION 'Operação proibida em itens_pedido: Não é permitido adicionar, alterar ou remover itens de um pedido com status "%" (%). Apenas pedidos em Rascunho admitem edição de itens.',
            v_status_pedido, COALESCE(v_num_pedido, v_id_pedido::text);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_itens_pedido ON public.itens_pedido;
CREATE TRIGGER trg_proteger_itens_pedido
BEFORE INSERT OR UPDATE OR DELETE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_itens_pedido();

-- ============================================================================
-- 18. FUNÇÕES AUXILIARES DE AUTENTICAÇÃO E RLS (SECURITY DEFINER SEGURO)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.representantes
        WHERE auth_user_id = auth.uid()
          AND papel = 'admin'
          AND ativo = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_representante_id()
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id
    FROM public.representantes
    WHERE auth_user_id = auth.uid()
      AND ativo = true
    LIMIT 1;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 19. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 20. POLICIES: TABELAS CADASTRAIS (SEM USO DE OLD OU NEW)
-- ============================================================================

-- REPRESENTANTES
DROP POLICY IF EXISTS "representantes_select_policy" ON public.representantes;
CREATE POLICY "representantes_select_policy" ON public.representantes
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "representantes_admin_policy" ON public.representantes;
CREATE POLICY "representantes_admin_policy" ON public.representantes
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- REPRESENTADAS
DROP POLICY IF EXISTS "representadas_select_policy" ON public.representadas;
CREATE POLICY "representadas_select_policy" ON public.representadas
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "representadas_insert_policy" ON public.representadas;
CREATE POLICY "representadas_insert_policy" ON public.representadas
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "representadas_update_policy" ON public.representadas;
CREATE POLICY "representadas_update_policy" ON public.representadas
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "representadas_delete_policy" ON public.representadas;
CREATE POLICY "representadas_delete_policy" ON public.representadas
FOR DELETE TO authenticated
USING (public.is_admin());

-- CLIENTES
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
CREATE POLICY "clientes_select_policy" ON public.clientes
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
CREATE POLICY "clientes_insert_policy" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
CREATE POLICY "clientes_update_policy" ON public.clientes
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;
CREATE POLICY "clientes_delete_policy" ON public.clientes
FOR DELETE TO authenticated
USING (public.is_admin());

-- PRODUTOS
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
CREATE POLICY "produtos_select_policy" ON public.produtos
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "produtos_insert_policy" ON public.produtos;
CREATE POLICY "produtos_insert_policy" ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "produtos_update_policy" ON public.produtos;
CREATE POLICY "produtos_update_policy" ON public.produtos
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "produtos_delete_policy" ON public.produtos;
CREATE POLICY "produtos_delete_policy" ON public.produtos
FOR DELETE TO authenticated
USING (public.is_admin());

-- TRANSPORTADORAS
DROP POLICY IF EXISTS "transportadoras_select_policy" ON public.transportadoras;
CREATE POLICY "transportadoras_select_policy" ON public.transportadoras
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "transportadoras_write_policy" ON public.transportadoras;
CREATE POLICY "transportadoras_write_policy" ON public.transportadoras
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- FORMAS DE PAGAMENTO
DROP POLICY IF EXISTS "formas_pagamento_select_policy" ON public.formas_pagamento;
CREATE POLICY "formas_pagamento_select_policy" ON public.formas_pagamento
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "formas_pagamento_write_policy" ON public.formas_pagamento;
CREATE POLICY "formas_pagamento_write_policy" ON public.formas_pagamento
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 21. POLICIES: PEDIDOS (SEM USO DE OLD OU NEW)
-- ============================================================================
DROP POLICY IF EXISTS "pedidos_select_policy" ON public.pedidos;
CREATE POLICY "pedidos_select_policy" ON public.pedidos
FOR SELECT TO authenticated
USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    vendedor_id = public.get_current_representante_id()
);

-- CORREÇÃO 1: RLS de INSERT permite somente novos pedidos em Rascunho
DROP POLICY IF EXISTS "pedidos_insert_policy" ON public.pedidos;
CREATE POLICY "pedidos_insert_policy" ON public.pedidos
FOR INSERT TO authenticated
WITH CHECK (
    status = 'Rascunho' AND
    (
        public.is_admin() OR
        created_by = auth.uid() OR
        vendedor_id = public.get_current_representante_id()
    )
);

DROP POLICY IF EXISTS "pedidos_update_policy" ON public.pedidos;
CREATE POLICY "pedidos_update_policy" ON public.pedidos
FOR UPDATE TO authenticated
USING (
    (public.is_admin() OR created_by = auth.uid() OR vendedor_id = public.get_current_representante_id())
    AND status IN ('Rascunho', 'Emitido')
)
WITH CHECK (
    (public.is_admin() OR created_by = auth.uid() OR vendedor_id = public.get_current_representante_id())
    AND status IN ('Rascunho', 'Emitido', 'Cancelado')
);

DROP POLICY IF EXISTS "pedidos_delete_policy" ON public.pedidos;
CREATE POLICY "pedidos_delete_policy" ON public.pedidos
FOR DELETE TO authenticated
USING (
    (public.is_admin() OR created_by = auth.uid() OR vendedor_id = public.get_current_representante_id())
    AND status = 'Rascunho'
);

-- ============================================================================
-- 22. POLICIES: ITENS DO PEDIDO (SEM USO DE OLD OU NEW)
-- ============================================================================
DROP POLICY IF EXISTS "itens_pedido_select_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_select_policy" ON public.itens_pedido
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND (
              public.is_admin() OR
              p.created_by = auth.uid() OR
              p.vendedor_id = public.get_current_representante_id()
          )
    )
);

DROP POLICY IF EXISTS "itens_pedido_insert_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_insert_policy" ON public.itens_pedido
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND p.status = 'Rascunho'
          AND (
              public.is_admin() OR
              p.created_by = auth.uid() OR
              p.vendedor_id = public.get_current_representante_id()
          )
    )
);

DROP POLICY IF EXISTS "itens_pedido_update_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_update_policy" ON public.itens_pedido
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND p.status = 'Rascunho'
          AND (
              public.is_admin() OR
              p.created_by = auth.uid() OR
              p.vendedor_id = public.get_current_representante_id()
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND p.status = 'Rascunho'
          AND (
              public.is_admin() OR
              p.created_by = auth.uid() OR
              p.vendedor_id = public.get_current_representante_id()
          )
    )
);

DROP POLICY IF EXISTS "itens_pedido_delete_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_delete_policy" ON public.itens_pedido
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND p.status = 'Rascunho'
          AND (
              public.is_admin() OR
              p.created_by = auth.uid() OR
              p.vendedor_id = public.get_current_representante_id()
          )
    )
);

-- ============================================================================
-- 23. TRIGGER DE CADASTRO AUTH: PROIBIÇÃO DE AUTOPROMOÇÃO ADMIN
-- ============================================================================
-- Usuários criados via cadastro sempre recebem papel 'representante'.
-- Promoção para 'admin' exige execução manual ou administrativa no banco.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.representantes (auth_user_id, nome, email, papel, ativo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email,
        'representante', -- Forçado 'representante', ignorando qualquer metadata do frontend
        true
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 24. PROMOÇÃO MANUAL DO PRIMEIRO ADMINISTRADOR
-- ============================================================================
-- Após criar seu login via tela de autenticação do Supabase, execute:
-- UPDATE public.representantes SET papel = 'admin' WHERE email = 'oamaralbruno@gmail.com';
-- ============================================================================
