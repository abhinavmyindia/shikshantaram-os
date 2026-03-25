import { getPDF, drawHeader, drawFooter, drawSectionHeading, drawText, drawBulletList, drawKV, drawDivider, checkPage, safeStr, C_GRAY } from './pdfExport';

export const exportDeepResearchPDF = (report: any, product: any, niche: string, country: string, userName: string) => {
  const doc = getPDF();
  const title   = `Deep Research: ${product?.productName || 'Product'}`;
  const subtitle = `${niche} · ${country} · ${product?.priceRange || ''}`;

  drawHeader(doc, title, subtitle, userName);
  let y = 44;

  y = drawText(doc, y, product?.productName || '', { fontSize: 14, bold: true });
  y = drawText(doc, y, product?.tagline || '', { fontSize: 10, color: C_GRAY });
  y += 4;
  y = drawKV(doc, y, 'Niche', niche);
  y = drawKV(doc, y, 'Market', country);
  y = drawKV(doc, y, 'Price Range', safeStr(product?.priceRange));
  y = drawKV(doc, y, 'Demand Score', `${product?.demandScore || '—'}/10`);
  y = drawKV(doc, y, 'Impulse Score', `${product?.impulseScore || '—'}/10`);
  y = drawDivider(doc, y + 2);

  // 1. Market Overview
  const mo = report?.marketOverview || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '📊', 'Market Overview & Competitors');
  y = drawKV(doc, y, 'Market Size', safeStr(mo.totalAddressableMarket));
  y = drawKV(doc, y, 'Growth Rate', safeStr(mo.growthRate));
  y = drawKV(doc, y, 'Maturity', safeStr(mo.maturityStage));
  y = drawKV(doc, y, 'Market Gap', safeStr(mo.marketGap));
  if (mo.topCompetitors?.length) {
    y = drawText(doc, y, 'Top Competitors:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, mo.topCompetitors.map((c: any) => typeof c === 'string' ? c : c.name || JSON.stringify(c)));
  }
  y = drawDivider(doc, y);

  // 2. Search Demand
  const sd = report?.searchDemand || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '🔍', 'Search Volume & Trends');
  y = drawKV(doc, y, 'Primary Keyword', safeStr(sd.primaryKeyword));
  y = drawKV(doc, y, 'Monthly Searches', safeStr(sd.monthlySearches));
  y = drawKV(doc, y, 'Trend Direction', safeStr(sd.trendDirection));
  y = drawKV(doc, y, 'Trend Reason', safeStr(sd.trendReason));
  if (sd.relatedKeywords?.length) {
    y = drawText(doc, y, 'Related Keywords:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, sd.relatedKeywords);
  }
  y = drawDivider(doc, y);

  // 3. Customer Pain Points
  const pp = report?.painPoints || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '😤', 'Customer Pain Points');
  y = drawKV(doc, y, 'Biggest Frustration', safeStr(pp.biggestFrustration));
  if (pp.topPains?.length) {
    pp.topPains.forEach((p: any) => {
      y = checkPage(doc, y, 16);
      y = drawText(doc, y, `• ${safeStr(p.pain)}`, { bold: true });
      if (p.quote) y = drawText(doc, y, `  "${p.quote}"`, { color: C_GRAY, fontSize: 8 });
    });
  }
  if (pp.wherePeopleComplain?.length) {
    y = drawText(doc, y, 'Where they complain:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, pp.wherePeopleComplain);
  }
  y = drawDivider(doc, y);

  // 4. Product Solution Design
  const ps = report?.primarySolution || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '💡', 'Product Solution Design');
  y = drawKV(doc, y, 'Core Solution', safeStr(ps.coreSolution));
  y = drawKV(doc, y, 'Unique Angle', safeStr(ps.uniqueAngle));
  y = drawKV(doc, y, 'Delivery Format', safeStr(ps.deliveryFormat));
  y = drawKV(doc, y, 'Time to Value', safeStr(ps.timeToValue));
  if (ps.keyFeatures?.length) {
    y = drawText(doc, y, 'Key Features:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ps.keyFeatures);
  }
  y = drawDivider(doc, y);

  // 5. Impulse Purchase Analysis
  const ip = report?.impulsePurchaseAnalysis || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '⚡', 'Impulse Purchase Analysis');
  y = drawKV(doc, y, 'Rating', `${safeStr(ip.rating)}/10 — ${safeStr(ip.ratingLabel)}`);
  y = drawKV(doc, y, 'Best Price Point', safeStr(ip.bestPricePoint));
  y = drawKV(doc, y, 'Why They Buy Now', safeStr(ip.whyTheyBuyNow));
  if (ip.triggerFactors?.length) {
    y = drawText(doc, y, 'Trigger Factors:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ip.triggerFactors);
  }
  if (ip.urgencyTactics?.length) {
    y = drawText(doc, y, 'Urgency Tactics:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ip.urgencyTactics);
  }
  y = drawDivider(doc, y);

  // 6. Customer Profile
  const cp = report?.customerProfile || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '👤', 'Customer Profile');
  y = drawKV(doc, y, 'Age', safeStr(cp.age));
  y = drawKV(doc, y, 'Gender', safeStr(cp.gender));
  y = drawKV(doc, y, 'Income', safeStr(cp.income));
  y = drawKV(doc, y, 'Buying Behavior', safeStr(cp.buyingBehavior));
  if (cp.platforms?.length) y = drawKV(doc, y, 'Platforms', cp.platforms.join(', '));
  if (cp.objections?.length) {
    y = drawText(doc, y, 'Common Objections:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, cp.objections);
  }
  y = drawDivider(doc, y);

  // 7. Content & Marketing Angles
  const ca = report?.contentAngles || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '🎯', 'Content & Marketing Angles');
  if (ca.hooks?.length) {
    y = drawText(doc, y, 'Hook Ideas:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ca.hooks);
  }
  if (ca.viralFormats?.length) {
    y = drawText(doc, y, 'Viral Formats:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ca.viralFormats);
  }
  y = drawDivider(doc, y);

  // 8. Launch Strategy
  const ls = report?.launchStrategy || {};
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '🚀', 'Launch Strategy');
  y = drawKV(doc, y, 'Recommended Platform', safeStr(ls.recommendedPlatform));
  y = drawKV(doc, y, 'Pricing Strategy', safeStr(ls.pricingStrategy));
  y = drawKV(doc, y, 'First Sale In', safeStr(ls.firstSaleIn));
  if (ls.launchContent?.length) {
    y = drawText(doc, y, 'Launch Content Plan:', { bold: true, fontSize: 8, color: C_GRAY });
    y = drawBulletList(doc, y, ls.launchContent);
  }
  y = drawDivider(doc, y);

  // 9. Action Plan
  const ns = report?.nextSteps || [];
  y = checkPage(doc, y, 40);
  y = drawSectionHeading(doc, y, '✅', 'Action Plan & Next Steps');
  ns.forEach((step: any) => {
    y = checkPage(doc, y, 16);
    y = drawText(doc, y, `Step ${step.step}: ${safeStr(step.action)}`, { bold: true });
    y = drawText(doc, y, `${safeStr(step.timeframe)} · ${safeStr(step.details)}`, { color: C_GRAY, fontSize: 8 });
    y += 2;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  const safeName = (product?.productName || 'Research').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const dateStr  = new Date().toISOString().split('T')[0];
  doc.save(`DeepResearch_${safeName}_${dateStr}.pdf`);
};
