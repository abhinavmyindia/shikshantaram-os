import { getPDF, drawHeader, drawFooter, drawSectionHeading, drawText, drawBulletList, drawDivider, checkPage, safeStr, C_GRAY } from './pdfExport';

export const exportCopyPDF = (copyOutput: any, copyScore: any, inputData: any, userName: string) => {
  const doc = getPDF();
  const title    = `${inputData?.copyType || 'Copy'}: ${inputData?.productName || 'Product'}`;
  const subtitle = `${inputData?.tone || ''} · ${inputData?.targetAudience || ''}`;
  drawHeader(doc, title, subtitle, userName);
  let y = 44;

  if (copyScore?.overall) {
    y = drawText(doc, y, `Copy Score: ${copyScore.overall}/100`, { fontSize: 13, bold: true });
    y += 2;
  }

  (copyOutput?.sections || [copyOutput]).filter(Boolean).forEach((section: any) => {
    if (!section) return;
    y = checkPage(doc, y, 30);
    if (section.sectionName || section.label || section.name) {
      y = drawSectionHeading(doc, y, '✍️', section.sectionName || section.label || section.name);
    }
    if (section.headline) {
      y = drawText(doc, y, safeStr(section.headline), { bold: true, fontSize: 11 });
    }
    if (section.subheadline) {
      y = drawText(doc, y, safeStr(section.subheadline), { fontSize: 9, color: C_GRAY });
    }
    if (section.body) {
      y = drawText(doc, y, safeStr(section.body));
    }
    if (section.content) {
      y = drawText(doc, y, safeStr(section.content));
    }
    if (section.bodyParagraphs?.length) {
      section.bodyParagraphs.forEach((p: string) => { y = drawText(doc, y, p); y += 2; });
    }
    if (section.hooks?.length) {
      y = drawText(doc, y, 'Hooks:', { bold: true, fontSize: 8, color: C_GRAY });
      y = drawBulletList(doc, y, section.hooks);
    }
    if (section.bullets?.length) {
      y = drawBulletList(doc, y, section.bullets);
    }
    if (section.ctaText || section.cta) {
      y = drawText(doc, y, `CTA: ${safeStr(section.ctaText || section.cta)}`, { bold: true, fontSize: 9 });
    }
    if (section.psLine) {
      y = drawText(doc, y, `P.S. ${safeStr(section.psLine)}`, { fontSize: 8, color: C_GRAY });
    }
    y = drawDivider(doc, y + 2);
  });

  if (copyScore?.tips?.length) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '💡', 'Improvement Tips');
    y = drawBulletList(doc, y, copyScore.tips);
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(doc, i, total); }
  const safeName = (inputData?.productName || 'Copy').replace(/[^a-zA-Z0-9]/g, '_').slice(0,25);
  doc.save(`CopySuite_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
