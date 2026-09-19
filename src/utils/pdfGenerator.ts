import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  fileName?: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Generates and downloads a real PDF from a DOM element using html2canvas and jsPDF.
 * Handles single or multi-page documents cleanly with high resolution.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  options: GeneratePdfOptions = {}
): Promise<void> {
  const { fileName = 'documento.pdf', onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    // Render DOM node to high-res canvas (scale 2 = 2x DPI for crisp text)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5; // 5mm margin on sides
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= (pageHeight - margin * 2);

    // If document is longer than 1 A4 page, append subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= (pageHeight - margin * 2);
    }

    // Save and download directly
    pdf.save(fileName);
    onSuccess?.();
  } catch (err: any) {
    console.error('Erro ao gerar PDF:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}
