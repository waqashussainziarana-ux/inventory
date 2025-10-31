// This tells TypeScript that these variables are defined globally,
// likely from a <script> tag in the HTML.
declare const html2canvas: any;
declare const jspdf: any;

export const downloadPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    let imgWidth = pdfWidth - 20; // with some margin
    let imgHeight = imgWidth / ratio;

    if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * ratio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = 10; // top margin

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    
    // Instead of pdf.save(), which is unreliable on mobile,
    // generate a blob and create a manual download link.
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Append to body, click, and then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};