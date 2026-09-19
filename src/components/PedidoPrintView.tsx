import React, { useState, useRef } from 'react';
import {
  Printer,
  Share2,
  ArrowLeft,
  Edit3,
  Copy,
  Check,
  Download,
  Phone,
  FileCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Pedido } from '../types';
import {
  formatCurrency,
  formatNumber,
  formatDateBR,
  formatDateTimeBR,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../utils/formatters';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface PedidoPrintViewProps {
  pedido: Pedido;
  onBack: () => void;
  onEdit: (pedido: Pedido) => void;
}

export const PedidoPrintView: React.FC<PedidoPrintViewProps> = ({ pedido, onBack, onEdit }) => {
  const [copiado, setCopiado] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const documentoRef = useRef<HTMLDivElement>(null);

  // Download real do arquivo PDF
  const handleBaixarPdf = async () => {
    if (!documentoRef.current) return;

    const sanitizedNomeCliente = (pedido.cliente?.razaoSocial || 'Cliente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30);

    const tipoPrefixo = pedido.tipo === 'ORCAMENTO' ? 'Orcamento' : 'Pedido';
    const nomeArquivo = `${tipoPrefixo}_${pedido.numero}_${sanitizedNomeCliente}.pdf`;

    setPdfErrorMessage(null);
    setPdfSuccessMessage(null);

    try {
      await downloadElementAsPdf(documentoRef.current, {
        fileName: nomeArquivo,
        onStart: () => setIsGeneratingPdf(true),
        onSuccess: () => {
          setIsGeneratingPdf(false);
          setPdfSuccessMessage(`Arquivo "${nomeArquivo}" gerado e baixado com sucesso!`);
          setTimeout(() => setPdfSuccessMessage(null), 5000);
        },
        onError: (err) => {
          setIsGeneratingPdf(false);
          setPdfErrorMessage(`Não foi possível gerar o PDF: ${err.message || 'Erro desconhecido'}`);
        },
      });
    } catch (err: any) {
      setIsGeneratingPdf(false);
      setPdfErrorMessage('Erro ao converter o documento para PDF. Tente novamente ou use a opção de Imprimir.');
    }
  };

  // Impressão limpa com suporte a iframe
  const handleImprimir = () => {
    try {
      const printContent = documentoRef.current;
      if (!printContent) {
        window.print();
        return;
      }

      // Cria um iframe invisível para isolar a impressão dos controles da aplicação
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${pedido.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido'}_${pedido.numero}</title>
              <style>
                @page { size: A4 portrait; margin: 8mm; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  margin: 0; 
                  padding: 0; 
                  background: #ffffff; 
                  color: #000000; 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                * { box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; }
                .print-container { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; }
              </style>
              ${Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map((el) => el.outerHTML)
                .join('\n')}
            </head>
            <body>
              <div class="print-container">
                ${printContent.innerHTML}
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        iframe.contentWindow?.focus();
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  const handleCopiarTexto = () => {
    const texto = `*${pedido.tipo === 'ORCAMENTO' ? 'ORÇAMENTO' : 'PEDIDO DE VENDA'} - ${pedido.numero}*
Empresa: ${pedido.empresaEmissora.nome}
Cliente: ${pedido.cliente.razaoSocial} (CNPJ: ${pedido.cliente.cnpjCpf})
Vendedor: ${pedido.vendedor.nome}
Cond. Pagamento: ${pedido.condicaoPagamento}
Previsão Entrega: ${formatDateBR(pedido.dataPrevista)}
Transportadora: ${pedido.transportadora.nome} (${pedido.tipoFrete === 'FOB' ? 'FOB - Destinatário' : 'CIF - Emitente'})

*ITENS:*
${pedido.itens
  .map(
    (it) =>
      `• ${it.codigoInterno || it.codigo} - ${it.descricao} ${it.referencia ? `(${it.referencia})` : ''} | ${it.quantidade} ${it.unidadeMedida} x ${formatCurrency(it.precoUnitario)} = ${formatCurrency(it.valorItens)} (IPI: ${formatCurrency(it.valorIpi)})`
  )
  .join('\n')}

Subtotal Itens: ${formatCurrency(pedido.totalItens)}
Total IPI: ${formatCurrency(pedido.totalIpi)}
Frete: ${formatCurrency(pedido.frete)}
*VALOR TOTAL:* ${formatCurrency(pedido.totalPedido)}
Peso Total: ${formatNumber(pedido.pesoTotalKg, 2)} Kg

${pedido.observacoes || ''}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleEnviarWhatsapp = () => {
    const telefoneLimpo = (pedido.cliente.celular || pedido.cliente.telefone || '').replace(
      /\D/g,
      ''
    );
    const texto = encodeURIComponent(`Olá ${pedido.cliente.contato || pedido.cliente.razaoSocial}!
Segue o espelho do ${pedido.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido de Venda'} *${pedido.numero}*:

Empresa: ${pedido.empresaEmissora.nome}
Vendedor: ${pedido.vendedor.nome}
Total dos Itens: ${formatCurrency(pedido.totalItens)}
Total IPI: ${formatCurrency(pedido.totalIpi)}
*TOTAL GERAL: ${formatCurrency(pedido.totalPedido)}*
Condição: ${pedido.condicaoPagamento}
Previsão: ${formatDateBR(pedido.dataPrevista)}

Ficamos à disposição para qualquer esclarecimento!`);

    const url = telefoneLimpo
      ? `https://api.whatsapp.com/send?phone=55${telefoneLimpo}&text=${texto}`
      : `https://api.whatsapp.com/send?text=${texto}`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="no-print bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full lg:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-slate-700 hover:text-slate-900 px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para Pedidos</span>
        </button>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onEdit(pedido)}
            className="inline-flex items-center gap-2 px-4 py-3 text-base font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={handleCopiarTexto}
            className="inline-flex items-center gap-2 px-4 py-3 text-base font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            {copiado ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-600" />
            )}
            <span>{copiado ? 'Copiado!' : 'Copiar resumo'}</span>
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsapp}
            className="inline-flex items-center gap-2 px-5 py-3 text-base font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 rounded-xl transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            className="inline-flex items-center gap-2 px-5 py-3 text-base font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-5 h-5 text-slate-700" />
            <span>Imprimir</span>
          </button>

          {/* BOTÃO PRINCIPAL: BAIXAR PDF */}
          <button
            type="button"
            id="btn-baixar-pdf"
            onClick={handleBaixarPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3 text-base font-black text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-md shadow-indigo-700/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Download className="w-5 h-5 text-indigo-200" />
            )}
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'BAIXAR PDF'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO DO PDF */}
      {pdfSuccessMessage && (
        <div className="no-print p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 font-bold text-base flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {pdfErrorMessage && (
        <div className="no-print p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 font-bold text-base flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <span>{pdfErrorMessage}</span>
        </div>
      )}

      {/* DOCUMENTO OFICIAL A4 (Réplica fiel da folha impressa) */}
      <div
        ref={documentoRef}
        id="documento-impresso"
        className="print-container bg-white rounded-none sm:rounded-xl shadow-md border border-slate-300 max-w-[210mm] mx-auto p-8 font-sans text-slate-900"
      >
        {/* Topo: Página */}
        <div className="text-right text-[10px] text-slate-500 font-mono mb-1">
          Página 1 de 1
        </div>

        {/* TÍTULO PRINCIPAL */}
        <div className="text-center font-bold text-lg text-black tracking-wide pb-2">
          {pedido.tipo === 'ORCAMENTO' ? 'Orçamento' : 'Pedido de Venda'}
        </div>

        {/* CABEÇALHO: EMPRESA vs NÚMERO DO PEDIDO */}
        <div className="flex justify-between items-start gap-4 pb-3">
          {/* Dados da Empresa Emissora */}
          <div className="text-[11px] leading-tight space-y-0.5 flex-1">
            <div>
              <span className="font-bold">Empresa:</span>{' '}
              <span className="font-bold">{pedido.empresaEmissora.nome}</span>
            </div>
            <div>
              <span className="font-bold">Endereço:</span> {pedido.empresaEmissora.endereco}
            </div>
            <div className="flex gap-4">
              <div>
                <span className="font-bold">Cidade:</span> {pedido.empresaEmissora.cidade} -{' '}
                {pedido.empresaEmissora.estado}
              </div>
            </div>
            <div>
              <span className="font-bold">Bairro:</span> {pedido.empresaEmissora.bairro}
            </div>
          </div>

          {/* Dados fiscais no meio */}
          <div className="text-[11px] leading-tight space-y-0.5 w-44">
            <div>
              <span className="font-bold">CNPJ:</span> {pedido.empresaEmissora.cnpj}
            </div>
            <div>
              <span className="font-bold">IE:</span> {pedido.empresaEmissora.ie}
            </div>
            <div>
              <span className="font-bold">Fone:</span> {pedido.empresaEmissora.telefone}
            </div>
          </div>

          {/* Quadro Número do Pedido (Exato como no PDF) */}
          <div className="border border-black p-2 min-w-[170px] text-center">
            <div className="text-[11px] font-bold">Número do Pedido:</div>
            <div className="text-sm font-bold font-mono tracking-tight mt-0.5">{pedido.numero}</div>
            <div className="text-[10px] text-slate-600 mt-1">Cadastrado em:</div>
            <div className="text-[10px] font-mono">{formatDateTimeBR(pedido.dataCadastro)}</div>
          </div>
        </div>

        {/* LINHA DIVISÓRIA SUPERIOR DUPLA OU FORTE */}
        <div className="border-t-2 border-black my-2"></div>

        {/* DADOS DO CLIENTE */}
        <div className="text-[11px] leading-snug space-y-1 py-1">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <span className="font-bold">Cliente:</span>{' '}
              {pedido.cliente.codigo ? `${pedido.cliente.codigo} - ` : ''}
              {pedido.cliente.razaoSocial}
            </div>
            <div className="col-span-4">
              <span className="font-bold">CNPJ/CPF:</span> {pedido.cliente.cnpjCpf}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <span className="font-bold">Telefone:</span> {pedido.cliente.telefone} /
            </div>
            <div className="col-span-4">
              <span className="font-bold">Celular:</span> {pedido.cliente.celular || ''}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <span className="font-bold">Endereço:</span> {pedido.cliente.endereco},{' '}
              {pedido.cliente.numero || ''}
            </div>
            <div className="col-span-4">
              <span className="font-bold">Bairro:</span> {pedido.cliente.bairro}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <span className="font-bold">Cidade:</span> {pedido.cliente.cidade}
            </div>
            <div className="col-span-4">
              <span className="font-bold">Estado:</span> {pedido.cliente.estado}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <span className="font-bold">Cep:</span> {pedido.cliente.cep}
            </div>
            <div className="col-span-4">
              <span className="font-bold">Inscrição Estadual:</span> {pedido.cliente.rgIe || 'ISENTO'}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <span className="font-bold">E-mail:</span> {pedido.cliente.email || '-'}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <span className="font-bold">Local de Entrega:</span>{' '}
              {pedido.localEntrega || `${pedido.cliente.endereco}, ${pedido.cliente.numero || ''}`}
            </div>
          </div>
        </div>

        {/* LINHA DIVISÓRIA */}
        <div className="border-t border-black my-2"></div>

        {/* INFORMAÇÕES DE FATURAMENTO / PAGAMENTO / PRAZO */}
        <div className="text-[11px] leading-snug space-y-1 py-1">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <span className="font-bold">Nº Pedido Cliente:</span>{' '}
              {pedido.numeroPedidoCliente || '-'}
            </div>
            <div className="col-span-6 text-right">
              <span className="font-bold">Data Prevista:</span> {formatDateBR(pedido.dataPrevista)}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 mt-1">
            <div className="col-span-8">
              <span className="font-bold">Transportadora:</span> {pedido.transportadora.nome}
            </div>
            <div className="col-span-4 text-right">
              <span className="font-bold">Frete:</span>{' '}
              {pedido.tipoFrete === 'FOB' ? '2 Destinatario (FOB)' : '1 Emitente (CIF)'}
            </div>
          </div>
        </div>

        {/* TABELA DE ITENS (Exata como no documento) */}
        <div className="mt-3 border border-black">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black font-bold text-center">
                <th className="border-r border-black p-1 text-center w-20">Código</th>
                <th className="border-r border-black p-1 text-left">Descrição - Ref.(C A)</th>
                <th className="border-r border-black p-1 text-center w-16">Unid.Med.</th>
                <th className="border-r border-black p-1 text-center w-12">Qtd.</th>
                <th className="border-r border-black p-1 text-right w-16">Qtd.Milh</th>
                <th className="border-r border-black p-1 text-right w-16">Pr.Mil.</th>
                <th className="border-r border-black p-1 text-right w-20">Pr.Unit.</th>
                <th className="p-1 text-right w-24">Valor Itens</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map((it, i) => (
                <tr key={i} className="border-b border-black/30 font-mono text-[10px]">
                  <td className="border-r border-black p-1 text-center font-bold">
                    {it.codigoInterno || it.codigo}
                  </td>
                  <td className="border-r border-black p-1 font-sans text-left font-semibold">
                    {it.descricao} {it.referencia ? `Ref. ${it.referencia}` : ''}
                  </td>
                  <td className="border-r border-black p-1 text-center font-sans font-bold">
                    {it.unidadeMedida}
                  </td>
                  <td className="border-r border-black p-1 text-center font-bold">
                    {it.quantidade}
                  </td>
                  <td className="border-r border-black p-1 text-right">
                    {it.qtdMilheiro ? formatNumber(it.qtdMilheiro, 3) : '-'}
                  </td>
                  <td className="border-r border-black p-1 text-right">
                    {it.precoMilheiro ? formatNumber(it.precoMilheiro, 2) : '-'}
                  </td>
                  <td className="border-r border-black p-1 text-right">
                    {formatNumber(it.precoUnitario, 5)}
                  </td>
                  <td className="p-1 text-right font-bold">
                    {formatCurrency(it.valorItens, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QUADRO DE TOTAIS (Bordas pretas idênticas ao modelo) */}
        <div className="mt-4 border border-black text-center text-[10px]">
          <div className="grid grid-cols-6 border-b border-black font-bold">
            <div className="border-r border-black p-1">Total dos Itens</div>
            <div className="border-r border-black p-1">Frete</div>
            <div className="border-r border-black p-1">Total Acres.</div>
            <div className="border-r border-black p-1">Subs. Trib</div>
            <div className="border-r border-black p-1">Total IPI</div>
            <div className="p-1">Total Pedido</div>
          </div>
          <div className="grid grid-cols-6 font-mono font-bold text-[11px] p-1">
            <div className="border-r border-black">{formatCurrency(pedido.totalItens, false)}</div>
            <div className="border-r border-black">{formatCurrency(pedido.frete, false)}</div>
            <div className="border-r border-black">
              {formatCurrency(pedido.totalAcrescimos, false)}
            </div>
            <div className="border-r border-black">
              {formatCurrency(pedido.substituicaoTributaria, false)}
            </div>
            <div className="border-r border-black">{formatCurrency(pedido.totalIpi, false)}</div>
            <div>{formatCurrency(pedido.totalPedido, false)}</div>
          </div>
        </div>

        {/* INFORMAÇÕES DE FECHAMENTO (Vendedor, Condição, Total, Programado, Peso, Observações) */}
        <div className="mt-4 text-[11px] leading-normal space-y-1.5">
          <div>
            <span className="font-bold">Vendedor:</span> {pedido.vendedor.nome}
          </div>
          <div>
            <span className="font-bold">Cond. Pagto:</span> {pedido.condicaoPagamento}
          </div>

          {/* TOTAL DESTACADO */}
          <div className="text-base font-bold font-mono pt-1">
            {formatCurrency(pedido.totalPedido, false)}
          </div>

          {/* PROGRAMADO BOX */}
          <div className="flex items-center gap-2 pt-1">
            <span className="border border-black px-2 py-0.5 font-bold text-[10px]">
              Programado:
            </span>
            <span className="font-mono font-bold text-[11px]">
              {pedido.programado ? pedido.dataProgramada || 'SIM' : '00/00/00'}
            </span>
          </div>

          {/* PESO */}
          <div>
            <span className="font-bold">Peso:</span> {formatNumber(pedido.pesoTotalKg, 5)} Kg
          </div>

          {/* OBSERVAÇÃO */}
          <div className="pt-2">
            <span className="font-bold">Observação:</span>
            <div className="whitespace-pre-line font-bold text-[10px] mt-0.5 text-black">
              {pedido.observacoes}
            </div>
          </div>

          {/* LINHA DE ASSINATURA CONFERENTE */}
          <div className="pt-8 flex justify-end text-[11px]">
            <div>
              <span className="font-bold">Conferente:</span>{' '}
              <span className="border-b border-black inline-block min-w-[280px]">
                &nbsp;{pedido.conferente || ''}
              </span>
            </div>
          </div>
        </div>

        {/* LINHA FINAL INFERIOR */}
        <div className="border-t-2 border-black mt-6"></div>
      </div>
    </div>
  );
};
