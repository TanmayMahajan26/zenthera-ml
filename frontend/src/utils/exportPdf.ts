import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures an HTML element and saves it as a PDF report.
 */
export const exportResultsToPdf = async (elementId: string, filename: string = 'Zenthera_Report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for PDF export.');
    return;
  }

  try {
    // Hide buttons during capture
    const buttons = element.querySelectorAll('button');
    buttons.forEach(btn => btn.style.display = 'none');

    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Restore buttons
    buttons.forEach(btn => btn.style.display = '');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
