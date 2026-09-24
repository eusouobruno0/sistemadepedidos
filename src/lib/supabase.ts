import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl.startsWith('http') &&
    supabasePublishableKey.length > 10
  );
};

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.error('[Supabase] Erro ao inicializar cliente Supabase:', error);
  }
} else {
  // Aviso em desenvolvimento para o desenvolvedor saber onde preencher
  if (import.meta.env.DEV) {
    console.info(
      '[Supabase] Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_PUBLISHABLE_KEY não foram preenchidas no .env.local. O sistema continua operando em modo local.'
    );
  }
}

export const supabase = clientInstance;

/**
 * Utilitário seguro para testar se a conexão com o Supabase está respondendo
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: unknown;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: 'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY ausentes ou incompletas.',
    };
  }

  try {
    // Consulta simples na tabela públicas 'representadas' ou auth para validar comunicação HTTP
    const { error, count } = await supabase
      .from('representadas')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        success: false,
        message: `Falha na consulta ao Supabase: ${error.message}`,
        details: error,
      };
    }

    return {
      success: true,
      message: `Conexão com Supabase estabelecida com sucesso! (${count ?? 0} registros encontrados em representadas).`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Exceção de rede ou conexão: ${errorMsg}`,
      details: err,
    };
  }
}
