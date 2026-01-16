import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a multi-page PDF by slicing a high-resolution canvas using pixel-perfect math.
 * This prevents the "seam" overlap where text gets cut or hidden at page breaks.
 */
export const downloadPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    // 1. Setup a controlled environment for the capture
    const captureWidthPx = 800; // Fixed width for predictable math
    const originalWidth = element.style.width;
    element.style.width = `${captureWidthPx}px`;

    const canvas = await html2canvas(element, {
      scale: 2, // 2x for high resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: captureWidthPx,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.width = `${captureWidthPx}px`;
        }
      }
    });

    // Reset original styles
    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // A4 dimensions in mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 2. Calculate Page Math in Pixels
    // We need to know exactly how many pixels of the canvas fit into one A4 page height
    const pxToMmFactor = pdfWidth / captureWidthPx;
    const pxPageHeight = pdfHeight / pxToMmFactor;
    
    const totalCanvasHeight = canvas.height / 2; // Adjust for the 2x scale
    let heightLeft = totalCanvasHeight;
    let currentY = 0; // The Y-position in the original document (unscaled pixels)

    let firstPage = true;

    while (heightLeft > 0) {
      if (!firstPage) {
        pdf.addPage();
      }

      // We add the image and use the Y coordinate to "slide" it up
      // The image is rendered at full height, but clipped by the PDF page boundary
      const positionInMm = -(currentY * pxToMmFactor);
      
      pdf.addImage(
        imgData, 
        'JPEG', 
        0, 
        positionInMm, 
        pdfWidth, 
        (totalCanvasHeight * pxToMmFactor)
      );

      currentY += pxPageHeight;
      heightLeft -= pxPageHeight;
      firstPage = false;
    }

    // 3. Finalize and Download
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
    alert("An error occurred while generating the PDF. Please try again.");
  }
};