
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a multi-page PDF by accurately slicing a high-resolution canvas.
 * Fixed the overlapping issue by ensuring the vertical offset strictly matches the PDF page height.
 */
export const downloadPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    // Standard A4 aspect ratio is ~1.414. 
    // We use a fixed width for the capture to make calculations predictable.
    const captureWidth = 800; 
    const originalWidth = element.style.width;
    element.style.width = `${captureWidth}px`; 

    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: captureWidth,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.width = `${captureWidth}px`;
        }
      }
    });

    // Reset original styles
    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    // A4 dimensions in mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate how many mm the full image occupies when scaled to fit the PDF width
    const imgProps = pdf.getImageProperties(imgData);
    const renderWidth = pdfWidth; 
    const renderHeight = (imgProps.height * renderWidth) / imgProps.width;

    let heightLeft = renderHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages
    // We use a small epsilon or floor/ceil to avoid "sliver" overlaps caused by floating point precision
    while (heightLeft > 1) { // 1mm threshold to avoid empty last pages
      position -= pdfHeight; 
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
    alert("An error occurred while generating the PDF. Please try a different browser or check the console.");
  }
};
