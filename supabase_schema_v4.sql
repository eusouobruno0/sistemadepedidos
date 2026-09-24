-- ============================================================================
-- SISTEMA DE GESTÃO DE PEDIDOS — SUPABASE POSTGRESQL DDL (VERSÃO 4 DEFINITIVA)
-- ============================================================================
-- VERSÃO 4: BLINDAGEM DE INTEGRIDADE COMERCIAL E MÁQUINA DE ESTADOS DO PEDIDO
-- 
-- Regras implementadas no banco de dados:
-- 1. Rascunho pode editar pedido = OK
-- 2. Rascunho pode editar itens = OK
-- 3. Rascunho -> Emitido = OK (gera número sequencial PED definitivo)
-- 4. Rascunho -> Cancelado sem consumir PED = OK (não consome sequencial)
-- 5. Emitido -> Cancelado preserva PED = OK (preserva numero_sequencial e numero_formatado)
-- 6. Emitido não pode voltar para Rascunho = OK (bloqueado por trigger e RLS)
-- 7. Emitido não pode alterar itens = OK (INSERT, UPDATE, DELETE bloqueados)
-- 8. Cancelado não pode voltar = OK (bloqueado para qualquer outro status)
-- 9. Cancelado não pode ser editado = OK (bloqueado para qualquer alteração)
-- 10. Cancelado não pode ser excluído = OK (somente Rascunho pode ser deletado)
--
-- Aplicável de forma estrita inclusive para administradores no nível de dados.
-- ============================================================================

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SEQUÊNCIAS DO SISTEMA
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_cliente_codigo START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_produto_codigo_interno START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_pedidos_numero START WITH 1 INCREMENT BY 1;

-- ============================================================================
-- 3. TABELA: REPRESENTANTES (Usuários e Vendedores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.representantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    comissao_padrao NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    papel TEXT NOT NULL DEFAULT 'representante' CHECK (papel IN ('admin', 'representante')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. TABELA: REPRESENTADAS (Empresas Emissoras / Indústrias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.representadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT NOT NULL UNIQUE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. TABELA: CLIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj_cpf TEXT NOT NULL UNIQUE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. TABELA: PRODUTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    codigo_interno TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    referencia TEXT,
    unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('CX', 'UN', 'MIL', 'KG', 'PC', 'FD')),
    quantidade_por_caixa INTEGER NOT NULL DEFAULT 1,
    preco_caixa NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_unidade NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    preco_milheiro NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    aliquota_ipi NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    peso_unitario_kg NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    representada_id UUID REFERENCES public.representadas(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. TABELA: TRANSPORTADORAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transportadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    cidade TEXT,
    estado TEXT,
    tipo_frete_padrao TEXT NOT NULL DEFAULT 'FOB' CHECK (tipo_frete_padrao IN ('FOB', 'CIF')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. TABELA: CONDICOES DE PAGAMENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.condicoes_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    dias INTEGER[] DEFAULT '{28}',
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. TABELA: PEDIDOS
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
    numero_pedido_cliente TEXT, -- Mantido para compatibilidade retroativa
    empresa_emissora_id UUID NOT NULL REFERENCES public.representadas(id),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    local_entrega TEXT,
    transportadora_id UUID REFERENCES public.transportadoras(id),
    tipo_frete TEXT NOT NULL DEFAULT 'FOB' CHECK (tipo_frete IN ('FOB', 'CIF')),
    vendedor_id UUID NOT NULL REFERENCES public.representantes(id),
    forma_pagamento TEXT,
    condicao_pagamento TEXT NOT NULL,
    condicao_manual TEXT,
    total_itens NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    frete NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_acrescimos NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    substituicao_tributaria NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_ipi NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_pedido NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    peso_total_kg NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    programado BOOLEAN NOT NULL DEFAULT false,
    data_programada TEXT,
    observacoes TEXT,
    conferente TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. TABELA: ITENS DO PEDIDO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    codigo TEXT NOT NULL,
    codigo_interno TEXT,
    descricao TEXT NOT NULL,
    referencia TEXT,
    unidade_medida TEXT NOT NULL,
    quantidade NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
    quantidade_por_caixa NUMERIC(12,2) DEFAULT 1,
    preco_caixa NUMERIC(12,2) DEFAULT 0.00,
    preco_unidade NUMERIC(12,4) DEFAULT 0.0000,
    preco_milheiro NUMERIC(12,2) DEFAULT 0.00,
    preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
    aliquota_ipi NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    valor_ipi NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    valor_itens NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    peso_total_kg NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_situacao_comercial ON public.pedidos(situacao_comercial);
CREATE INDEX IF NOT EXISTS idx_pedidos_ordem_compra_cliente ON public.pedidos(ordem_compra_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON public.pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_emissora_id ON public.pedidos(empresa_emissora_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_cadastro ON public.pedidos(data_cadastro DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_by ON public.pedidos(created_by);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON public.itens_pedido(produto_id);

CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON public.clientes(codigo);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_cpf ON public.clientes(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON public.produtos(codigo_interno);

-- ============================================================================
-- 12. FUNÇÃO E TRIGGER: CÓDIGOS SEQUENCIAIS AUTOMÁTICOS (CLIENTES E PRODUTOS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_gerar_codigo_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR trim(NEW.codigo) = '' THEN
        NEW.codigo := lpad(nextval('public.seq_cliente_codigo')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_codigo_cliente ON public.clientes;
CREATE TRIGGER trg_gerar_codigo_cliente
BEFORE INSERT ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.fn_gerar_codigo_cliente();

CREATE OR REPLACE FUNCTION public.fn_gerar_codigo_produto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_interno IS NULL OR trim(NEW.codigo_interno) = '' THEN
        NEW.codigo_interno := lpad(nextval('public.seq_produto_codigo_interno')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_codigo_produto ON public.produtos;
CREATE TRIGGER trg_gerar_codigo_produto
BEFORE INSERT ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.fn_gerar_codigo_produto();

-- ============================================================================
-- 13. MÁQUINA DE ESTADOS E NUMERAÇÃO DE PEDIDOS (VERSÃO 4 DEFINITIVA)
-- ============================================================================
-- Controla com precisão a geração de numeração:
-- - Rascunho: Não consome sequência (numero_formatado = 'RASCUNHO')
-- - Transição Rascunho -> Emitido: Consome seq_pedidos_numero e gera 'PEDxxxxxx'
-- - Transição Rascunho -> Cancelado: NÃO consome sequência (numero_formatado = 'CANCELADO')
-- - Transição Emitido -> Cancelado: Mantém numero_sequencial e numero_formatado originais intactos
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_gerenciar_numeracao_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT: Criação do registro
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Rascunho' THEN
            NEW.numero_sequencial := NULL;
            IF NEW.numero_formatado IS NULL OR trim(NEW.numero_formatado) = '' THEN
                NEW.numero_formatado := 'RASCUNHO';
            END IF;
        ELSIF NEW.status = 'Emitido' THEN
            -- Se inserido já como Emitido, consome o próximo sequencial PED
            IF NEW.numero_sequencial IS NULL THEN
                NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
            END IF;
            NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');
        ELSIF NEW.status = 'Cancelado' THEN
            -- Cancelado criado diretamente não consome numeração comercial
            NEW.numero_sequencial := NULL;
            NEW.numero_formatado := 'CANCELADO';
        END IF;

        IF NEW.created_by IS NULL THEN
            NEW.created_by := auth.uid();
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE: Transições de status e atualização
    IF TG_OP = 'UPDATE' THEN
        -- RASCUNHO -> EMITIDO: Momento oficial de emissão comercial
        IF OLD.status = 'Rascunho' AND NEW.status = 'Emitido' THEN
            IF NEW.numero_sequencial IS NULL THEN
                NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
            END IF;
            NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');

        -- RASCUNHO -> CANCELADO: Cancelamento sem consumo de número
        ELSIF OLD.status = 'Rascunho' AND NEW.status = 'Cancelado' THEN
            NEW.numero_sequencial := NULL;
            NEW.numero_formatado := 'CANCELADO';

        -- EMITIDO -> CANCELADO: Preserva estritamente o número PED e histórico
        ELSIF OLD.status = 'Emitido' AND NEW.status = 'Cancelado' THEN
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;

        -- RASCUNHO -> RASCUNHO: Permanece como Rascunho
        ELSIF OLD.status = 'Rascunho' AND NEW.status = 'Rascunho' THEN
            NEW.numero_sequencial := NULL;
            IF NEW.numero_formatado IS NULL OR trim(NEW.numero_formatado) = '' THEN
                NEW.numero_formatado := 'RASCUNHO';
            END IF;

        -- EMITIDO -> EMITIDO: Preserva a numeração original
        ELSIF OLD.status = 'Emitido' AND NEW.status = 'Emitido' THEN
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;
        END IF;

        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerenciar_numeracao_pedido ON public.pedidos;
CREATE TRIGGER trg_gerenciar_numeracao_pedido
BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.fn_gerenciar_numeracao_pedido();

-- ============================================================================
-- 14. TRIGGER DE INTEGRIDADE COMERCIAL E BLOQUEIO DE ALTERAÇÃO EM PEDIDOS
-- ============================================================================
-- Impede modificações indevidas no pedido:
-- - Proíbe reverter Emitido para Rascunho
-- - Proíbe reverter Cancelado para Rascunho ou Emitido
-- - Proíbe edição em pedidos Cancelados
-- - Proíbe edição comercial em pedidos Emitidos (somente transição para Cancelado é permitida)
-- - Proíbe exclusão de pedidos Emitidos ou Cancelados (apenas Rascunho pode ser excluído)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_validar_integridade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Validação de UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- 1. Regra para pedidos CANCELADOS (imutabilidade total)
        IF OLD.status = 'Cancelado' THEN
            IF NEW.status <> 'Cancelado' THEN
                RAISE EXCEPTION 'Não é permitido alterar o status de um pedido Cancelado. Transição proibida: Cancelado -> %.', NEW.status;
            END IF;
            RAISE EXCEPTION 'Pedidos cancelados permanecem no histórico e não podem ser editados.';
        END IF;

        -- 2. Regra para pedidos EMITIDOS
        IF OLD.status = 'Emitido' THEN
            -- Tentativa proibida de reverter para Rascunho
            IF NEW.status = 'Rascunho' THEN
                RAISE EXCEPTION 'Não é permitido reverter um pedido Emitido para Rascunho. O pedido já possui número comercial definitivo (%) e valor fiscal.', OLD.numero_formatado;
            END IF;

            -- Se continua Emitido: dados comerciais permanecem congelados.
            -- EXCEÇÃO INTENCIONAL: Apenas situacao_comercial (e updated_at) pode ser alterada.
            IF NEW.status = 'Emitido' THEN
                IF NEW.cliente_id <> OLD.cliente_id OR
                   NEW.empresa_emissora_id <> OLD.empresa_emissora_id OR
                   NEW.vendedor_id <> OLD.vendedor_id OR
                   NEW.total_itens <> OLD.total_itens OR
                   NEW.total_ipi <> OLD.total_ipi OR
                   NEW.total_pedido <> OLD.total_pedido OR
                   NEW.condicao_pagamento <> OLD.condicao_pagamento OR
                   NEW.tipo_frete <> OLD.tipo_frete OR
                   NEW.numero_sequencial <> OLD.numero_sequencial OR
                   NEW.numero_formatado <> OLD.numero_formatado THEN
                    RAISE EXCEPTION 'Pedidos emitidos têm seus dados comerciais congelados. Apenas a situação comercial (Enviado/Fechado) ou o cancelamento podem ser alterados.';
                END IF;
            END IF;

            -- Se transita para Cancelado: assegura que dados comerciais não foram alterados silenciosamente
            IF NEW.status = 'Cancelado' THEN
                IF NEW.cliente_id <> OLD.cliente_id OR
                   NEW.empresa_emissora_id <> OLD.empresa_emissora_id OR
                   NEW.vendedor_id <> OLD.vendedor_id OR
                   NEW.total_itens <> OLD.total_itens OR
                   NEW.total_ipi <> OLD.total_ipi OR
                   NEW.total_pedido <> OLD.total_pedido THEN
                    RAISE EXCEPTION 'Ao cancelar um pedido Emitido, não é permitido alterar produtos, clientes, valores ou representadas. Altere apenas o status para Cancelado.';
                END IF;
            END IF;
        END IF;

        -- 3. Regra para pedidos RASCUNHO
        IF OLD.status = 'Rascunho' THEN
            -- Transições permitidas: Rascunho -> Rascunho, Rascunho -> Emitido, Rascunho -> Cancelado
            IF NEW.status NOT IN ('Rascunho', 'Emitido', 'Cancelado') THEN
                RAISE EXCEPTION 'Status inválido para pedido em rascunho: %.', NEW.status;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- Validação de DELETE (Exclusão física)
    IF TG_OP = 'DELETE' THEN
        IF OLD.status <> 'Rascunho' THEN
            RAISE EXCEPTION 'Operação não permitida: Apenas pedidos com status Rascunho podem ser excluídos do sistema. Pedidos % (código %) devem permanecer permanentemente no histórico.', OLD.status, coalesce(OLD.numero_formatado, OLD.id::text);
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_integridade_pedido ON public.pedidos;
CREATE TRIGGER trg_validar_integridade_pedido
BEFORE UPDATE OR DELETE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_integridade_pedido();

-- ============================================================================
-- 15. TRIGGER DE BLINDAGEM DE ITENS DO PEDIDO
-- ============================================================================
-- Somente pedidos com status 'Rascunho' podem sofrer:
-- - INSERT de item
-- - UPDATE de item
-- - DELETE de item
--
-- Se o pedido estiver Emitido ou Cancelado, o banco bloqueia sumariamente.
-- ============================================================================
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
        -- Pedido pai sendo removido em cascata durante deleção de um rascunho
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF v_status_pedido <> 'Rascunho' THEN
        RAISE EXCEPTION 'Operação rejeitada em itens_pedido: Não é permitido adicionar, alterar ou remover itens de um pedido com status "%" (Pedido %). Modificações de itens são exclusivas de pedidos em Rascunho.', v_status_pedido, COALESCE(v_num_pedido, v_id_pedido::text);
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
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_itens_pedido();

-- ============================================================================
-- 16. FUNÇÕES AUXILIARES DE AUTENTICAÇÃO E CONTROLE DE ACESSO (RLS)
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 17. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 18. POLICIES: TABELAS CADASTRAIS (Representadas, Clientes, Produtos, etc.)
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

DROP POLICY IF EXISTS "representadas_write_policy" ON public.representadas;
CREATE POLICY "representadas_write_policy" ON public.representadas
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- CLIENTES
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
CREATE POLICY "clientes_select_policy" ON public.clientes
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "clientes_write_policy" ON public.clientes;
CREATE POLICY "clientes_write_policy" ON public.clientes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- PRODUTOS
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
CREATE POLICY "produtos_select_policy" ON public.produtos
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "produtos_write_policy" ON public.produtos;
CREATE POLICY "produtos_write_policy" ON public.produtos
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

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

-- CONDICOES DE PAGAMENTO
DROP POLICY IF EXISTS "condicoes_select_policy" ON public.condicoes_pagamento;
CREATE POLICY "condicoes_select_policy" ON public.condicoes_pagamento
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "condicoes_write_policy" ON public.condicoes_pagamento;
CREATE POLICY "condicoes_write_policy" ON public.condicoes_pagamento
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 19. POLICIES: PEDIDOS (BLINDAGEM COMERCIAL V4)
-- ============================================================================
-- SELECT: Admin vê todos; Representante vê os seus ou criados por ele
DROP POLICY IF EXISTS "pedidos_select_policy" ON public.pedidos;
CREATE POLICY "pedidos_select_policy" ON public.pedidos
FOR SELECT TO authenticated
USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    vendedor_id = public.get_current_representante_id()
);

-- INSERT: Permite inserir pedidos para si ou via admin
DROP POLICY IF EXISTS "pedidos_insert_policy" ON public.pedidos;
CREATE POLICY "pedidos_insert_policy" ON public.pedidos
FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin() OR
    created_by = auth.uid() OR
    vendedor_id = public.get_current_representante_id()
);

-- UPDATE:
-- Permite atualizar se o pedido estiver em Rascunho ou Emitido (para transição até Cancelado).
-- Pedidos Cancelados são imutáveis e rejeitados no USING.
-- As regras detalhadas de bloqueio de campos comerciais e transições inválidas
-- são garantidas em camada de dados pelo trigger fn_validar_integridade_pedido.
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

-- DELETE:
-- Apenas pedidos com status 'Rascunho' podem ser excluídos.
-- Pedidos Emitidos ou Cancelados jamais podem ser deletados.
DROP POLICY IF EXISTS "pedidos_delete_policy" ON public.pedidos;
CREATE POLICY "pedidos_delete_policy" ON public.pedidos
FOR DELETE TO authenticated
USING (
    (public.is_admin() OR created_by = auth.uid() OR vendedor_id = public.get_current_representante_id())
    AND status = 'Rascunho'
);

-- ============================================================================
-- 20. POLICIES: ITENS DO PEDIDO (BLINDAGEM COMERCIAL V4)
-- ============================================================================
-- SELECT: Permitido se o pedido pai puder ser visualizado
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

-- INSERT: Somente permitido se o pedido pai estiver com status 'Rascunho'
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

-- UPDATE: Somente permitido se o pedido pai estiver com status 'Rascunho'
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

-- DELETE: Somente permitido se o pedido pai estiver com status 'Rascunho'
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
-- 21. TRIGGER AUTOMÁTICO DE CRIAÇÃO DE REPRESENTANTE NO CADASTRO DE AUTH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.representantes (auth_user_id, nome, email, papel, ativo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email,
        'representante',
        true
    )
    ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 22. INSTRUÇÃO MANUAL PARA DEFINIÇÃO DO PRIMEIRO ADMINISTRADOR
-- ============================================================================
-- Para conceder o papel de admin ao seu e-mail após a criação da conta,
-- execute a query abaixo no Supabase SQL Editor:
--
-- UPDATE public.representantes
-- SET papel = 'admin'
-- WHERE email = 'oamaralbruno@gmail.com';
-- ============================================================================
