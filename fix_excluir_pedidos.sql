-- ============================================================================
-- SCRIPT DE CORREÇÃO: LIBERAÇÃO TOTAL PARA EXCLUSÃO DE PEDIDOS NO SUPABASE
-- ============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para permitir
-- a exclusão fácil e definitiva de QUALQUER pedido (Rascunho, Emitido ou Cancelado).
-- ============================================================================

-- 1. Permite exclusão de itens de pedido sem restrição de status
CREATE OR REPLACE FUNCTION public.fn_proteger_itens_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_status_pedido TEXT;
    v_num_pedido TEXT;
    v_id_pedido UUID;
BEGIN
    -- Exclusão de itens é SEMPRE permitida em qualquer status
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    v_id_pedido := NEW.pedido_id;

    SELECT status, numero_formatado INTO v_status_pedido, v_num_pedido
    FROM public.pedidos
    WHERE id = v_id_pedido;

    IF v_status_pedido IS NULL THEN
        -- Pedido sendo deletado em cascata
        RETURN NEW;
    END IF;

    -- Apenas em INSERT e UPDATE mantém a integridade comercial
    IF v_status_pedido <> 'Rascunho' THEN
        RAISE EXCEPTION 'Operação proibida em itens_pedido: Não é permitido adicionar ou alterar itens de um pedido com status "%" (%). Apenas pedidos em Rascunho admitem edição.',
            v_status_pedido, COALESCE(v_num_pedido, v_id_pedido::text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Permite exclusão de pedidos em QUALQUER status (Rascunho, Emitido, Cancelado)
CREATE OR REPLACE FUNCTION public.fn_ciclo_vida_e_imutabilidade_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: INSERT
    -- ------------------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := now();
        NEW.updated_at := now();

        IF NEW.forma_pagamento_id IS NOT NULL AND (NEW.forma_pagamento_nome IS NULL OR trim(NEW.forma_pagamento_nome) = '') THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        IF NEW.status IS NULL OR NEW.status = '' THEN
            NEW.status := 'Rascunho';
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
    -- OPERAÇÃO: UPDATE
    -- ------------------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();

        IF NEW.forma_pagamento_id IS DISTINCT FROM OLD.forma_pagamento_id THEN
            SELECT nome INTO NEW.forma_pagamento_nome
            FROM public.formas_pagamento
            WHERE id = NEW.forma_pagamento_id;
        END IF;

        -- Permite atualizar status ou situação mesmo em cancelados se necessário
        IF OLD.status = 'Cancelado' THEN
            RETURN NEW;
        END IF;

        IF OLD.status = 'Emitido' THEN
            IF NEW.status = 'Emitido' THEN
                NEW.numero_sequencial := OLD.numero_sequencial;
                NEW.numero_formatado := OLD.numero_formatado;
            END IF;

            IF NEW.status = 'Cancelado' THEN
                NEW.numero_sequencial := OLD.numero_sequencial;
                NEW.numero_formatado := OLD.numero_formatado;
            END IF;

            RETURN NEW;
        END IF;

        IF OLD.status = 'Rascunho' THEN
            IF NEW.status = 'Emitido' THEN
                IF NEW.numero_sequencial IS NULL THEN
                    NEW.numero_sequencial := nextval('public.seq_pedidos_numero');
                END IF;
                NEW.numero_formatado := 'PED' || lpad(NEW.numero_sequencial::text, 6, '0');
            ELSIF NEW.status = 'Cancelado' THEN
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'CANCELADO';
            ELSIF NEW.status = 'Rascunho' THEN
                NEW.numero_sequencial := NULL;
                NEW.numero_formatado := 'RASCUNHO';
            END IF;

            RETURN NEW;
        END IF;

        RETURN NEW;
    END IF;

    -- ------------------------------------------------------------------------
    -- OPERAÇÃO: DELETE (LIBERADA PARA QUALQUER STATUS)
    -- ------------------------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Atualiza as políticas de RLS para DELETE de pedidos
DROP POLICY IF EXISTS "pedidos_delete_policy" ON public.pedidos;
CREATE POLICY "pedidos_delete_policy" ON public.pedidos
FOR DELETE TO authenticated
USING (true);

DROP POLICY IF EXISTS "pedidos_delete_anon_policy" ON public.pedidos;
CREATE POLICY "pedidos_delete_anon_policy" ON public.pedidos
FOR DELETE TO anon
USING (true);

-- 4. Atualiza as políticas de RLS para DELETE de itens de pedido
DROP POLICY IF EXISTS "itens_pedido_delete_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_delete_policy" ON public.itens_pedido
FOR DELETE TO authenticated
USING (true);

DROP POLICY IF EXISTS "itens_pedido_delete_anon_policy" ON public.itens_pedido;
CREATE POLICY "itens_pedido_delete_anon_policy" ON public.itens_pedido
FOR DELETE TO anon
USING (true);

-- 5. Função RPC atômica segura (SECURITY DEFINER) para exclusão em cascata
CREATE OR REPLACE FUNCTION public.excluir_pedido_definitivo(p_pedido_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.itens_pedido WHERE pedido_id = p_pedido_id;
    DELETE FROM public.pedidos WHERE id = p_pedido_id;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Concede permissão de execução da RPC para authenticated e anon
GRANT EXECUTE ON FUNCTION public.excluir_pedido_definitivo(UUID) TO authenticated, anon;
