import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface GeneratePdfOptions {
  fileName?: string;
  onStart?: () => void;
  onSuccess?: (file?: File) => void;
  onError?: (err: Error) => void;
}

/**
 * Renderiza um elemento DOM clonado em um ambiente de dimensões A4 padronizadas (794px).
 * Isso garante que o PDF gerado em celular ou tablet tenha exatamente o mesmo layout
 * profissional, proporções perfeitas e colunas alinhadas da versão desktop.
 */
async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Cria container temporário fora da tela com largura A4 padronizada (794px @ 96DPI)
  const stagingWrapper = document.createElement('div');
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.left = '-99999px';
  stagingWrapper.style.top = '-99999px';
  stagingWrapper.style.width = '794px';
  stagingWrapper.style.minWidth = '794px';
  stagingWrapper.style.maxWidth = '794px';
  stagingWrapper.style.background = '#ffffff';
  stagingWrapper.style.zIndex = '-9999';
  stagingWrapper.style.overflow = 'visible';

  // Clona o documento e força a largura A4 oficial
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.margin = '0 auto';
  clone.style.padding = '24px';
  clone.style.boxSizing = 'border-box';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  try {
    // Renderiza com escala 2x para nitidez máxima de fontes e linhas
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });
    return canvas;
  } finally {
    if (document.body.contains(stagingWrapper)) {
      document.body.removeChild(stagingWrapper);
    }
  }
}

/**
 * Cria o objeto jsPDF a partir de um canvas.
 */
function createPdfFromCanvas(canvas: HTMLCanvasElement): jsPDF {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 5; // 5mm de margem
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = contentHeight;
  let position = margin;

  // Primeira página
  pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
  heightLeft -= (pageHeight - margin * 2);

  // Páginas subsequentes se o documento tiver mais de 1 página A4
  while (heightLeft > 0) {
    position = heightLeft - contentHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= (pageHeight - margin * 2);
  }

  return pdf;
}

/**
 * Gera o arquivo PDF e aciona o download direto compatível com celular e desktop.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  options: GeneratePdfOptions = {}
): Promise<File> {
  const { fileName = 'documento.pdf', onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    // 1. Gera canvas com largura oficial A4 independente do dispositivo
    const canvas = await renderElementToCanvas(element);

    // 2. Constrói o PDF A4
    const pdf = createPdfFromCanvas(canvas);

    // 3. Extrai Blob e cria objeto File real
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 4. Mecanismo de download compatível com celular (iOS Safari, Android Chrome e Desktop)
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 10000);

    // Fallback nativo do jsPDF se for necessário
    try {
      pdf.save(fileName);
    } catch (e) {
      // Ignora se o link.click já efetuou o download
    }

    onSuccess?.(pdfFile);
    return pdfFile;
  } catch (err: any) {
    console.error('Erro ao gerar PDF:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Compartilha o arquivo PDF gerado via Web Share API (WhatsApp, Arquivos, Drive, etc.),
 * padrão nativo no iPhone/iPad e Android.
 */
export async function shareElementAsPdf(
  element: HTMLElement,
  fileName: string,
  titulo: string
): Promise<boolean> {
  const canvas = await renderElementToCanvas(element);
  const pdf = createPdfFromCanvas(canvas);
  const pdfBlob = pdf.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    await navigator.share({
      files: [pdfFile],
      title: titulo,
      text: `Segue em anexo o ${titulo}`,
    });
    return true;
  }

  // Fallback: faz download se compartilhamento direto não for suportado
  await downloadElementAsPdf(element, { fileName });
  return false;
}
