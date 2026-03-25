import { getPDF, drawHeader, drawFooter, drawSectionHeading, drawText, drawKV, drawDivider, checkPage, safeStr, C_GRAY } from './pdfExport';

export const exportFunnelPDF = (funnelData: any, stepCopy: any, emailSequence: any, userName: string) => {
  const doc = getPDF();
  drawHeader(doc, `Funnel: ${funnelData?.funnelName || 'Funnel Map'}`, funnelData?.funnelTagline || '', userName);
  let y = 44;

  y = drawText(doc, y, safeStr(funnelData?.funnelName), { fontSize: 14, bold: true });
  y = drawText(doc, y, safeStr(funnelData?.funnelTagline), { fontSize: 10, color: C_GRAY });
  y += 4;
  y = drawKV(doc, y, 'Est. Conversion', safeStr(funnelData?.estimatedConversionRate));
  y = drawKV(doc, y, 'Time to Launch', safeStr(funnelData?.estimatedTimeToLaunch));
  y = drawKV(doc, y, 'Monthly Revenue', safeStr(funnelData?.estimatedMonthlyRevenue));
  y = drawDivider(doc, y + 2);

  y = drawSectionHeading(doc, y, '🔀', 'Funnel Architecture');
  (funnelData?.steps || []).forEach((step: any, i: number) => {
    y = checkPage(doc, y, 40);
    y = drawText(doc, y, `Step ${i + 1}: ${safeStr(step.stepName || step.pageTitle)}`, { bold: true, fontSize: 11 });
    y = drawKV(doc, y, 'Type', safeStr(step.stepType));
    if (step.pageTitle) y = drawKV(doc, y, 'Page Title', safeStr(step.pageTitle));
    if (step.goal) y = drawKV(doc, y, 'Goal', safeStr(step.goal));
    if (step.keyMessage) y = drawKV(doc, y, 'Key Message', safeStr(step.keyMessage));
    if (step.primaryCTA) y = drawKV(doc, y, 'CTA', safeStr(step.primaryCTA));

    const copy = stepCopy?.[step.stepId || i];
    if (copy) {
      y += 2;
      y = drawText(doc, y, 'Copy:', { bold: true, fontSize: 8, color: C_GRAY });
      y = drawText(doc, y, `Headline: ${safeStr(copy.headline)}`, { fontSize: 8 });
      if (copy.openingHook) y = drawText(doc, y, `Hook: ${safeStr(copy.openingHook)}`, { fontSize: 8, color: C_GRAY });
      if (copy.ctaText) y = drawText(doc, y, `CTA: ${safeStr(copy.ctaText)}`, { fontSize: 8, bold: true });
    }

    y = drawDivider(doc, y + 2);
  });

  if (emailSequence?.emails?.length) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '📧', 'Email Sequence');
    emailSequence.emails.forEach((email: any, i: number) => {
      y = checkPage(doc, y, 30);
      y = drawText(doc, y, `Email ${i + 1}: ${safeStr(email.subject)}`, { bold: true });
      y = drawText(doc, y, safeStr(email.body), { fontSize: 8, color: C_GRAY });
      if (email.cta) y = drawText(doc, y, `CTA: ${safeStr(email.cta)}`, { fontSize: 8, bold: true });
      y += 4;
    });
  }

  // Quick wins
  if (funnelData?.quickWins?.length) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '⚡', 'Quick Wins');
    funnelData.quickWins.forEach((w: string) => {
      y = checkPage(doc, y, 8);
      y = drawText(doc, y, `• ${w}`, { fontSize: 9 });
    });
    y = drawDivider(doc, y + 2);
  }

  // Tool stack
  if (funnelData?.toolStack?.length) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '🛠️', 'Recommended Tool Stack');
    funnelData.toolStack.forEach((t: any) => {
      y = checkPage(doc, y, 12);
      y = drawKV(doc, y, safeStr(t.purpose), `${safeStr(t.recommended)} (alt: ${safeStr(t.alternative)}) — ${safeStr(t.cost)}`);
    });
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(doc, i, total); }
  const safeName = (funnelData?.funnelName || 'Funnel').replace(/[^a-zA-Z0-9]/g, '_').slice(0,30);
  doc.save(`FunnelMap_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
