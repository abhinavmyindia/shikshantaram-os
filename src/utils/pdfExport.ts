// ─── pdfExport.ts — clean, emoji-free, fully tested PDF utilities ─────────────

export const getPDF = () => {
  const { jsPDF } = (window as any).jspdf;
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
};

// A4 layout constants
export const PW    = 210;
export const PH    = 297;
export const ML    = 16;
export const MR    = 16;
export const CW    = PW - ML - MR;
export const FOOT  = 14;

// Backward-compat aliases
export const PAGE_W   = PW;
export const PAGE_H   = PH;
export const MARGIN   = ML;
export const CONTENT_W = CW;

// Color palettes (RGB)
export const COL = {
  purple:     [124,  58, 237] as [number,number,number],
  purpleLight:[245, 243, 255] as [number,number,number],
  dark:       [ 15,  23,  42] as [number,number,number],
  gray:       [100, 116, 139] as [number,number,number],
  lightGray:  [148, 163, 184] as [number,number,number],
  border:     [226, 232, 240] as [number,number,number],
  bg:         [248, 250, 252] as [number,number,number],
  green:      [  5, 150, 105] as [number,number,number],
  orange:     [234,  88,  12] as [number,number,number],
  red:        [220,  38,  38] as [number,number,number],
  white:      [255, 255, 255] as [number,number,number],
  accent:     [ 99,  91, 255] as [number,number,number],
};

// Backward-compat color aliases
export const C_PURPLE = COL.purple;
export const C_DARK   = COL.dark;
export const C_GRAY   = COL.gray;
export const C_LIGHT  = COL.bg;
export const C_BORDER = COL.border;
export const C_GREEN  = COL.green;
export const C_ORANGE = COL.orange;
export const C_WHITE  = COL.white;

// Strip emoji and non-latin characters for safe PDF rendering
export const safe = (val: any): string => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/--/g, '-')
    .trim();
};

export const safeOr = (val: any, fallback = 'Not available'): string => {
  const s = safe(val);
  return s.length > 0 ? s : fallback;
};

// Backward-compat alias
export const safeStr = (val: any): string => safeOr(val, '—');

// ─── Page header (purple bar) ─────────────────────────────────────────────────
export const addHeader = (doc: any, reportTitle: string, subLine: string, userName: string) => {
  doc.setFillColor(...COL.purple);
  doc.rect(0, 0, PW, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COL.white);
  doc.text('Shikshantaram OS', ML, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(safe(reportTitle).slice(0, 55), ML, 16);

  const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  doc.setFontSize(7.5);
  doc.text(`${safe(userName)}   |   ${dateStr}`, PW - MR, 9, { align: 'right' });

  doc.setFillColor(...COL.bg);
  doc.rect(0, 26, PW, 9, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COL.gray);
  doc.text(safe(subLine).slice(0, 90), ML, 32);
};

// ─── Page footer ─────────────────────────────────────────────────────────────
export const addFooter = (doc: any, pageNum: number, total: number) => {
  doc.setDrawColor(...COL.border);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 10, PW - MR, PH - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COL.lightGray);
  doc.text('os.shikshantaram.in', ML, PH - 5);
  doc.text(`Page ${pageNum} of ${total}`, PW - MR, PH - 5, { align: 'right' });
};

// ─── Section heading (left accent bar style — no emoji) ──────────────────────
export const addSection = (doc: any, y: number, label: string): number => {
  doc.setFillColor(...COL.purple);
  doc.rect(ML, y, 3, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COL.dark);
  doc.text(safe(label).toUpperCase(), ML + 6, y + 4.5);

  doc.setDrawColor(...COL.border);
  doc.setLineWidth(0.2);
  doc.line(ML, y + 7.5, PW - MR, y + 7.5);

  return y + 12;
};

// ─── Key : Value row ─────────────────────────────────────────────────────────
export const addKV = (doc: any, y: number, label: string, value: string, opts?: { valueColor?: [number,number,number] }): number => {
  y = checkY(doc, y, 10);
  const col = opts?.valueColor || COL.dark;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COL.gray);
  doc.text(safe(label) + ':', ML, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...col);
  const valStr = safeOr(value);
  const wrapped = doc.splitTextToSize(valStr, CW - 36);
  wrapped.forEach((line: string, i: number) => {
    if (i === 0) {
      doc.text(line, ML + 36, y);
    } else {
      y += 4.5;
      y = checkY(doc, y, 5);
      doc.text(line, ML + 36, y);
    }
  });

  return y + 5.5;
};

// ─── Body paragraph (full width, word-wrapped) ────────────────────────────────
export const addPara = (doc: any, y: number, text: string, opts?: {
  bold?: boolean;
  size?: number;
  color?: [number,number,number];
  indent?: number;
}): number => {
  const { bold = false, size = 8.5, color = COL.dark, indent = 0 } = opts || {};
  const str = safeOr(text);
  if (!str || str === 'Not available') return y;

  y = checkY(doc, y, size * 0.5);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);

  const maxW = CW - indent;
  const lines = doc.splitTextToSize(str, maxW);
  lines.forEach((line: string) => {
    y = checkY(doc, y, size * 0.45);
    doc.text(line, ML + indent, y);
    y += size * 0.43;
  });

  return y + 2;
};

// ─── Bullet list ─────────────────────────────────────────────────────────────
export const addBullets = (doc: any, y: number, items: any[], opts?: {
  color?: [number,number,number];
  size?: number;
}): number => {
  const { color = COL.dark, size = 8.5 } = opts || {};
  const validItems = (items || []).map(i => typeof i === 'object' ? JSON.stringify(i) : String(i || '')).filter(s => s.trim());

  validItems.forEach(item => {
    y = checkY(doc, y, 10);
    doc.setFillColor(...color);
    doc.circle(ML + 2.5, y - 1, 0.8, 'F');
    y = addPara(doc, y, item, { size, color, indent: 7 });
  });

  return y;
};

// ─── Horizontal divider ───────────────────────────────────────────────────────
export const addDivider = (doc: any, y: number): number => {
  doc.setDrawColor(...COL.border);
  doc.setLineWidth(0.2);
  doc.line(ML, y, PW - MR, y);
  return y + 6;
};

// ─── Page check: adds new page if remaining space < needed ───────────────────
export const checkY = (doc: any, y: number, needed = 15): number => {
  if (y + needed > PH - FOOT) {
    doc.addPage();
    return 38;
  }
  return y;
};

// ─── Info chip (inline colored badge) ────────────────────────────────────────
export const addChip = (doc: any, x: number, y: number, text: string, color: [number,number,number]): number => {
  const s = safe(text);
  if (!s) return x;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(s) + 6;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, 'F');
  doc.setTextColor(...COL.white);
  doc.text(s, x + 3, y);
  return x + w + 3;
};

// ─── Backward-compatible aliases for exportOffer, exportFunnel, exportCopy ───
export const drawHeader = addHeader;
export const drawFooter = addFooter;
export const drawSectionHeading = (doc: any, y: number, _icon: string, title: string, _color?: [number,number,number]): number => addSection(doc, y, title);
export const drawText = (doc: any, y: number, text: string, options?: { fontSize?: number; color?: [number,number,number]; bold?: boolean; indent?: number }): number => {
  return addPara(doc, y, text, { size: options?.fontSize, color: options?.color, bold: options?.bold, indent: options?.indent });
};
export const drawBulletList = (doc: any, y: number, items: string[], color?: [number,number,number]): number => addBullets(doc, y, items, { color });
export const drawKV = (doc: any, y: number, label: string, value: string): number => addKV(doc, y, label, value);
export const drawDivider = addDivider;
export const checkPage = checkY;
