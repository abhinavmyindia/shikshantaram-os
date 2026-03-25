// Shared helpers for all PDF exports

export const getPDF = () => {
  const { jsPDF } = (window as any).jspdf;
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
};

// A4 dimensions
export const PAGE_W   = 210;
export const PAGE_H   = 297;
export const MARGIN   = 18;
export const CONTENT_W = PAGE_W - MARGIN * 2;

// Colors (as RGB arrays)
export const C_PURPLE  = [124, 58, 237]  as [number,number,number];
export const C_DARK    = [15, 23, 42]    as [number,number,number];
export const C_GRAY    = [100, 116, 139] as [number,number,number];
export const C_LIGHT   = [248, 250, 252] as [number,number,number];
export const C_BORDER  = [226, 232, 240] as [number,number,number];
export const C_GREEN   = [5, 150, 105]   as [number,number,number];
export const C_ORANGE  = [234, 88, 12]   as [number,number,number];
export const C_WHITE   = [255, 255, 255] as [number,number,number];

export const drawHeader = (doc: any, title: string, subtitle: string, userName: string) => {
  doc.setFillColor(...C_PURPLE);
  doc.rect(0, 0, PAGE_W, 28, 'F');

  doc.setTextColor(...C_WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Shikshantaram OS', MARGIN, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title.slice(0, 60), MARGIN, 18);

  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(8);
  doc.text(`${userName} · ${dateStr}`, PAGE_W - MARGIN, 11, { align: 'right' });

  doc.setFillColor(...C_LIGHT);
  doc.rect(0, 28, PAGE_W, 10, 'F');
  doc.setTextColor(...C_GRAY);
  doc.setFontSize(8);
  doc.text(subtitle.slice(0, 80), MARGIN, 35);
};

export const drawFooter = (doc: any, pageNum: number, totalPages: number) => {
  doc.setDrawColor(...C_BORDER);
  doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
  doc.setFontSize(8);
  doc.setTextColor(...C_GRAY);
  doc.text('os.shikshantaram.in', MARGIN, PAGE_H - 6);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
};

export const drawSectionHeading = (doc: any, y: number, icon: string, title: string, color = C_PURPLE): number => {
  doc.setFillColor(...C_LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(`${icon}  ${title}`, MARGIN + 3, y + 5.5);

  return y + 12;
};

export const drawText = (doc: any, y: number, text: string, options?: {
  fontSize?: number;
  color?: [number,number,number];
  bold?: boolean;
  indent?: number;
}): number => {
  const { fontSize = 9, color = C_DARK, bold = false, indent = 0 } = options || {};
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const maxW = CONTENT_W - indent;
  const lines = doc.splitTextToSize(String(text || ''), maxW);

  lines.forEach((line: string) => {
    if (y > PAGE_H - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, MARGIN + indent, y);
    y += fontSize * 0.42;
  });

  return y + 3;
};

export const drawBulletList = (doc: any, y: number, items: string[], color = C_DARK): number => {
  items.forEach(item => {
    if (!item) return;
    if (y > PAGE_H - 20) { doc.addPage(); y = 20; }
    doc.setFillColor(...color);
    doc.circle(MARGIN + 2, y - 1.5, 1, 'F');
    y = drawText(doc, y, item, { indent: 8, color });
  });
  return y;
};

export const drawKV = (doc: any, y: number, label: string, value: string): number => {
  if (y > PAGE_H - 20) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C_GRAY);
  doc.text(label + ':', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C_DARK);
  const lines = doc.splitTextToSize(String(value || '—'), CONTENT_W - 35);
  doc.text(lines, MARGIN + 35, y);
  return y + (lines.length * 4.2) + 2;
};

export const drawDivider = (doc: any, y: number): number => {
  doc.setDrawColor(...C_BORDER);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
};

export const checkPage = (doc: any, y: number, needed = 20): number => {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return 20;
  }
  return y;
};

export const safeStr = (val: any): string => String(val || '—');
