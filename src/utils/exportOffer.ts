import { getPDF, drawHeader, drawFooter, drawSectionHeading, drawText, drawBulletList, drawKV, drawDivider, checkPage, safeStr, C_GRAY } from './pdfExport';

export const exportOfferPDF = (offerData: any, offerBrief: any, userName: string) => {
  const doc = getPDF();
  drawHeader(doc, `Full Offer: ${offerData?.offerHeadline || 'Offer'}`, offerData?.oneLinerPitch?.slice(0,80) || '', userName);
  let y = 44;

  y = drawText(doc, y, `Offer Score: ${offerData?.offerScore?.total || '—'}/100`, { fontSize: 14, bold: true });
  y = drawText(doc, y, safeStr(offerData?.oneLinerPitch), { fontSize: 10, color: C_GRAY });
  y = drawDivider(doc, y + 4);

  y = checkPage(doc, y, 30);
  y = drawSectionHeading(doc, y, '🎯', 'Offer Headline');
  y = drawText(doc, y, safeStr(offerData?.offerHeadline), { fontSize: 12, bold: true });
  y = drawDivider(doc, y + 2);

  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '💎', 'Value Stack');
  (offerData?.valueStack || []).forEach((item: any, i: number) => {
    y = checkPage(doc, y, 14);
    y = drawText(doc, y, `${i + 1}. ${safeStr(item.item)}`, { bold: true });
    y = drawKV(doc, y, 'Value', safeStr(item.perceivedValue));
    if (item.description) y = drawText(doc, y, safeStr(item.description), { color: C_GRAY, fontSize: 8 });
    y += 2;
  });
  y = drawDivider(doc, y);

  y = checkPage(doc, y, 30);
  y = drawSectionHeading(doc, y, '🛡️', 'Guarantee');
  y = drawText(doc, y, safeStr(offerData?.guaranteeScript));
  y = drawDivider(doc, y + 2);

  y = checkPage(doc, y, 30);
  y = drawSectionHeading(doc, y, '⏰', 'Urgency & Scarcity');
  y = drawText(doc, y, safeStr(offerData?.urgencyScript));
  y = drawDivider(doc, y + 2);

  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '💰', 'Pricing');
  y = drawKV(doc, y, 'Anchor Price', safeStr(offerData?.pricingPsychology?.anchorPrice));
  y = drawKV(doc, y, 'Your Price', safeStr(offerData?.yourPrice));
  y = drawKV(doc, y, 'Total Perceived Value', safeStr(offerData?.totalPerceivedValue));
  y = drawKV(doc, y, 'Value Sentence', safeStr(offerData?.valueSentence));
  y = drawDivider(doc, y);

  if (offerData?.dmScript) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '💬', 'DM Script');
    y = drawText(doc, y, safeStr(offerData.dmScript));
    y = drawDivider(doc, y + 2);
  }

  if (offerData?.socialCaption) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '📱', 'Social Caption');
    y = drawText(doc, y, safeStr(offerData.socialCaption));
    y = drawDivider(doc, y + 2);
  }

  if (offerData?.emailPitch) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '📧', 'Email Pitch');
    if (offerData.emailSubject) y = drawKV(doc, y, 'Subject', safeStr(offerData.emailSubject));
    y = drawText(doc, y, safeStr(offerData.emailPitch));
    y = drawDivider(doc, y + 2);
  }

  if (offerData?.offerScore?.improvements?.length) {
    y = checkPage(doc, y, 30);
    y = drawSectionHeading(doc, y, '💡', 'Improvements');
    y = drawBulletList(doc, y, offerData.offerScore.improvements);
  }

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(doc, i, total); }
  const safeName = (offerData?.offerHeadline || 'Offer').replace(/[^a-zA-Z0-9]/g, '_').slice(0,30);
  doc.save(`FullOffer_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
