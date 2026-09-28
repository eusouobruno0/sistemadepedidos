-- ============================================================================
-- SCRIPT DE CORREÇÃO: LIBERAÇÃO TOTAL PARA EDIÇÃO E ATUALIZAÇÃO DE PEDIDOS
-- ============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para permitir
-- editar qualquer campo de qualquer pedido (incluindo condição de pagamento,
-- prazos, cliente, produtos e valores), preservando o número oficial (ex: PED000003).
-- ============================================================================

-- 1. Permite alteração livre de itens de pedidos em qualquer status
CREATE OR REPLACE FUNCTION public.fn_proteger_itens_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Permite qualquer inserção, alteração ou exclusão de itens de pedido
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualiza o gatilho de ciclo de vida para PERMITIR atualizar qualquer dado comercial
-- de pedidos Emitidos, preservando estritamente seu numero_sequencial e numero_formatado
CREATE OR REPLACE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: INSERT
    -- ------------------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, now());
        NEW.updated_at := now();

        IF NEW.forma_pagamento_id IS NOT NULL AND (NEW.forma_pagamento_nome IS NULL OR trim(NEW.forma_pagamento_nome) = '') THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        IF NEW.status = 'Emitido' THEN
            IF NEW.numero_sequencial IS NULL THEN
                NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
            END IF;
            NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');
        ELSIF NEW.status = 'Cancelado' THEN
            NEW.numero_sequencial := NULL;
            NEW.numero_formatado := 'CANCELADO';
        ELSE
            NEW.status := 'Rascunho';
            NEW.numero_sequencial := NULL;
            NEW.numero_formatado := 'RASCUNHO';
        END IF;

        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: UPDATE (EDIÇÃO LIVRE DE PEDIDOS)
    -- ------------------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();

        -- Snapshot do nome da forma de pagamento
        IF NEW.forma_pagamento_id IS DISTINCT FROM OLD.forma_pagamento_id THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        -- CASO: Pedido já possuía número oficial (Emitido)
        IF OLD.status = 'Emitido' THEN
            -- Mantém o número oficial original intacto
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;

            -- Se tentou enviar Rascunho acidentalmente, preserva como Emitido
            IF NEW.status = 'Rascunho' THEN
                NEW.status := 'Emitido';
            END IF;

            -- EDIÇÃO LIBERADA: Permite alterar condição de pagamento, cliente, itens, etc.
            RETURN NEW;
        END IF;

        -- CASO: Pedido Cancelado
        IF OLD.status = 'Cancelado' THEN
            NEW.numero_sequencial := OLD.numero_sequencial;
            NEW.numero_formatado := OLD.numero_formatado;
            RETURN NEW;
        END IF;

        -- CASO: Pedido em Rascunho
        IF OLD.status = 'Rascunho' THEN
            IF NEW.status = 'Emitido' THEN
                IF NEW.numero_sequencial IS NULL THEN
                    NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
                END IF;
                NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');
            ELSIF NEW.status = 'Cancelado' THEN
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'CANCELADO';
            ELSE
                NEW.status := 'Rascunho';
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'RASCUNHO';
            END IF;

            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: DELETE (SEMPRE PERMITIDA)
    -- ------------------------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Garante que os triggers estejam ativos e apontando para as novas funções
DROP TRIGGER IF EXISTS trg_pedidos_ciclo_vida ON public.pedidos;
CREATE TRIGGER trg_pedidos_ciclo_vida
BEFORE INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido();

DROP TRIGGER IF EXISTS trg_proteger_itens_pedido ON public.itens_pedido;
CREATE TRIGGER trg_proteger_itens_pedido
BEFORE INSERT OR UPDATE OR DELETE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_itens_pedido();
