import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a multi-page PDF by slicing a captured canvas into A4-sized segments.
 * This is more robust than simple scaling as it preserves readability for long lists.
 */
export const downloadPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    // 1. Capture the element at high resolution (2x) for print quality
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // A4 dimensions in mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions relative to PDF width
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = imgProps.width / imgProps.height;
    const renderWidth = pdfWidth; 
    const renderHeight = renderWidth / ratio;

    let heightLeft = renderHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
    heightLeft -= pdfHeight;

    // 2. Loop to create subsequent pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - renderHeight; // Offset for slicing
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
      heightLeft -= pdfHeight;
    }

    // 3. Handle download via Blob for better compatibility with mobile browsers
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again or check your browser permissions.");
  }
};