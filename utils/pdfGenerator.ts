import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a multi-page PDF by accurately slicing a captured canvas into A4-sized segments.
 * Uses exact A4 proportions (210mm x 297mm) and a standard web-to-print scale.
 */
export const downloadPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    // 1. We force the element width to a standard A4 pixel equivalent (approx 794px for 210mm)
    // and let the height be as long as needed.
    const originalWidth = element.style.width;
    element.style.width = '794px'; 

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.width = '794px';
        }
      }
    });

    // Reset original width
    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // A4 dimensions in mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // The canvas represents the full height. We need to calculate how many A4 heights that is.
    const imgProps = pdf.getImageProperties(imgData);
    const renderWidth = pdfWidth; 
    const renderHeight = (imgProps.height * renderWidth) / imgProps.width;

    let heightLeft = renderHeight;
    let position = 0;

    // Add the first page
    pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if content exceeds one A4 page
    while (heightLeft > 0) {
      position -= pdfHeight; // Move the image "up" relative to the next page
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
      heightLeft -= pdfHeight;
    }

    // Handle download
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
    alert("Failed to generate PDF. Check browser console for details.");
  }
};