
/**
 * Simple CSV Export utility
 */
export const exportToCsv = (data: any[], fileName: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const val = row[header];
            // Escape double quotes and wrap in quotes if contains comma
            const escaped = String(val).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Basic CSV Parser (Doesn't handle complex quoted multiline strings, but good for simple exports)
 */
export const parseCsv = (content: string): any[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        // Split by comma but respect quotes
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const values = currentLine.split(regex).map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        
        const obj: any = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        results.push(obj);
    }

    return results;
};
