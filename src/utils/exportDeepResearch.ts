import {
  getPDF, addHeader, addFooter, addSection, addKV, addPara,
  addBullets, addDivider, checkY, safe, safeOr,
  ML, PW, PH, CW, COL
} from './pdfExport';

export const exportDeepResearchPDF = (
  report: any,
  product: any,
  niche: string,
  country: string,
  userName: string
) => {
  if (!report || !product) {
    alert('No research data to export. Please complete the deep research first.');
    return;
  }

  const doc = getPDF();
  const productName = safeOr(product?.productName, 'Product');
  const priceRange  = safe(product?.priceRange);
  const subLine     = `${safe(niche)}  |  ${safe(country)}  |  ${priceRange}`;

  addHeader(doc, `Deep Research: ${productName}`, subLine, userName);
  let y = 40;

  // ─── PRODUCT OVERVIEW ──────────────────────────────────────────────────────
  y = addPara(doc, y, productName, { bold: true, size: 14 });
  y = addPara(doc, y, product?.tagline || '', { size: 9, color: COL.gray });
  y += 2;

  const demandScore = safe(product?.demandScore);
  const impulseScore = safe(product?.impulseScore);
  const competition = safe(product?.competitionLevel);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COL.gray);
  doc.text('Demand:', ML, y);
  doc.text('Impulse:', ML + 42, y);
  doc.text('Competition:', ML + 82, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COL.dark);
  doc.text(demandScore ? `${demandScore}/10` : 'N/A', ML, y);
  doc.text(impulseScore || 'N/A', ML + 42, y);
  doc.text(competition || 'N/A', ML + 82, y);
  y += 5;

  y = addKV(doc, y, 'Niche', niche);
  y = addKV(doc, y, 'Market', country);
  y = addKV(doc, y, 'Price Range', priceRange);
  y = addKV(doc, y, 'Build Time', safeOr(product?.buildTime));
  y = addKV(doc, y, 'Target Audience', safeOr(product?.targetAudience));
  y = addKV(doc, y, 'Primary Pain', safeOr(product?.primaryPain));
  y = addDivider(doc, y + 2);

  // ─── 1. MARKET OVERVIEW ────────────────────────────────────────────────────
  const mo = report?.marketOverview || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Market Overview & Competitors');
  y = addKV(doc, y, 'Market Size', safeOr(mo.totalAddressableMarket));
  y = addKV(doc, y, 'Growth Rate', safeOr(mo.growthRate));
  y = addKV(doc, y, 'Market Stage', safeOr(mo.maturityStage));
  y = addKV(doc, y, 'Market Gap', safeOr(mo.marketGap));

  if (Array.isArray(mo.topCompetitors) && mo.topCompetitors.length > 0) {
    y = addPara(doc, y, 'Top Competitors:', { bold: true, size: 8, color: COL.gray });
    mo.topCompetitors.forEach((c: any) => {
      y = checkY(doc, y, 12);
      const name  = safe(typeof c === 'string' ? c : c?.name || '');
      const price = safe(c?.price || '');
      const weak  = safe(c?.weakness || '');
      if (name) {
        y = addPara(doc, y, `- ${name}${price ? '  ('+price+')' : ''}`, { bold: true, size: 8.5 });
        if (weak) y = addPara(doc, y, `  Weakness: ${weak}`, { size: 8, color: COL.gray, indent: 4 });
      }
    });
  }
  y = addDivider(doc, y + 2);

  // ─── 2. SEARCH DEMAND ──────────────────────────────────────────────────────
  const sd = report?.searchDemand || {};
  y = checkY(doc, y, 40);
  y = addSection(doc, y, 'Search Volume & Trends');
  y = addKV(doc, y, 'Primary Keyword', safeOr(sd.primaryKeyword));
  y = addKV(doc, y, 'Monthly Searches', safeOr(sd.monthlySearches));
  y = addKV(doc, y, 'Trend Direction', safeOr(sd.trendDirection));
  y = addKV(doc, y, 'Trend Reason', safeOr(sd.trendReason));

  if (Array.isArray(sd.relatedKeywords) && sd.relatedKeywords.length > 0) {
    y = addPara(doc, y, 'Related Keywords:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, sd.relatedKeywords, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 3. PAIN POINTS ────────────────────────────────────────────────────────
  const pp = report?.painPoints || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Customer Pain Points');
  y = addKV(doc, y, 'Biggest Frustration', safeOr(pp.biggestFrustration));

  if (Array.isArray(pp.topPains) && pp.topPains.length > 0) {
    y = addPara(doc, y, 'Top Pain Points:', { bold: true, size: 8, color: COL.gray });
    pp.topPains.forEach((p: any, i: number) => {
      y = checkY(doc, y, 18);
      const pain      = safe(typeof p === 'string' ? p : p?.pain || '');
      const intensity = safe(p?.intensity || '');
      const quote     = safe(p?.quote || '');
      if (pain) {
        y = addPara(doc, y, `${i + 1}. ${pain}${intensity ? '  [' + intensity + ']' : ''}`, { bold: true, size: 8.5 });
        if (quote) y = addPara(doc, y, `   "${quote}"`, { size: 8, color: COL.gray, indent: 4 });
        y += 1;
      }
    });
  }

  if (Array.isArray(pp.wherePeopleComplain) && pp.wherePeopleComplain.length > 0) {
    y = addPara(doc, y, 'Where They Complain:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, pp.wherePeopleComplain, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 4. PRODUCT SOLUTION ───────────────────────────────────────────────────
  const ps = report?.primarySolution || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Product Solution Design');
  y = addKV(doc, y, 'Core Solution', safeOr(ps.coreSolution));
  y = addKV(doc, y, 'Unique Angle', safeOr(ps.uniqueAngle));
  y = addKV(doc, y, 'Delivery Format', safeOr(ps.deliveryFormat));
  y = addKV(doc, y, 'Time to Value', safeOr(ps.timeToValue));

  if (Array.isArray(ps.keyFeatures) && ps.keyFeatures.length > 0) {
    y = addPara(doc, y, 'Key Features:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ps.keyFeatures, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 5. IMPULSE PURCHASE ANALYSIS ─────────────────────────────────────────
  const ip = report?.impulsePurchaseAnalysis || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Impulse Purchase Analysis');

  const ratingNum   = typeof ip.rating === 'number' ? ip.rating : parseFloat(ip.rating) || null;
  const ratingLabel = safe(ip.ratingLabel || ip.rating || '');
  const ratingStr   = ratingNum ? `${ratingNum}/10  -  ${ratingLabel}` : ratingLabel;
  y = addKV(doc, y, 'Impulse Rating', safeOr(ratingStr));
  y = addKV(doc, y, 'Best Price Point', safeOr(ip.bestPricePoint));
  y = addKV(doc, y, 'Why They Buy Now', safeOr(ip.whyTheyBuyNow));

  if (Array.isArray(ip.triggerFactors) && ip.triggerFactors.length > 0) {
    y = addPara(doc, y, 'Trigger Factors:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ip.triggerFactors, { size: 8.5 });
  }
  if (Array.isArray(ip.urgencyTactics) && ip.urgencyTactics.length > 0) {
    y = addPara(doc, y, 'Urgency Tactics:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ip.urgencyTactics, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 6. CUSTOMER PROFILE ───────────────────────────────────────────────────
  const cp = report?.customerProfile || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Customer Profile');
  y = addKV(doc, y, 'Age Range', safeOr(cp.age));
  y = addKV(doc, y, 'Gender', safeOr(cp.gender));
  y = addKV(doc, y, 'Income', safeOr(cp.income));
  y = addKV(doc, y, 'Education', safeOr(cp.education));
  y = addKV(doc, y, 'Buying Behavior', safeOr(cp.buyingBehavior));

  if (Array.isArray(cp.platforms) && cp.platforms.length > 0) {
    y = addKV(doc, y, 'Active Platforms', cp.platforms.map(safe).join(', '));
  }
  if (Array.isArray(cp.influencers) && cp.influencers.length > 0) {
    y = addKV(doc, y, 'Follows', cp.influencers.map(safe).join(', '));
  }
  if (Array.isArray(cp.objections) && cp.objections.length > 0) {
    y = addPara(doc, y, 'Common Objections:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, cp.objections, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 7. CONTENT & MARKETING ANGLES ────────────────────────────────────────
  const ca = report?.contentAngles || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Content & Marketing Angles');

  if (Array.isArray(ca.hooks) && ca.hooks.length > 0) {
    y = addPara(doc, y, 'Hook Ideas:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ca.hooks, { size: 8.5 });
  }

  if (Array.isArray(ca.bestPlatforms) && ca.bestPlatforms.length > 0) {
    y += 2;
    y = addPara(doc, y, 'Best Platforms:', { bold: true, size: 8, color: COL.gray });
    ca.bestPlatforms.forEach((p: any) => {
      y = checkY(doc, y, 14);
      const platform = safe(typeof p === 'string' ? p : p?.platform || '');
      const ctype    = safe(p?.contentType || '');
      const freq     = safe(p?.postingFreq || '');
      if (platform) {
        y = addPara(doc, y, `${platform}${ctype ? ' - ' + ctype : ''}${freq ? ' (' + freq + ')' : ''}`, { size: 8.5 });
      }
    });
  }

  if (Array.isArray(ca.viralFormats) && ca.viralFormats.length > 0) {
    y += 2;
    y = addPara(doc, y, 'Viral Content Formats:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ca.viralFormats, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 8. LAUNCH STRATEGY ────────────────────────────────────────────────────
  const ls = report?.launchStrategy || {};
  y = checkY(doc, y, 50);
  y = addSection(doc, y, 'Launch Strategy');
  y = addKV(doc, y, 'Best Platform', safeOr(ls.recommendedPlatform));
  y = addKV(doc, y, 'Pricing Strategy', safeOr(ls.pricingStrategy));
  y = addKV(doc, y, 'First Sale In', safeOr(ls.firstSaleIn));

  if (Array.isArray(ls.launchContent) && ls.launchContent.length > 0) {
    y = addPara(doc, y, 'Launch Content Plan:', { bold: true, size: 8, color: COL.gray });
    y = addBullets(doc, y, ls.launchContent, { size: 8.5 });
  }
  y = addDivider(doc, y + 2);

  // ─── 9. ACTION PLAN ────────────────────────────────────────────────────────
  const ns = Array.isArray(report?.nextSteps) ? report.nextSteps : [];
  y = checkY(doc, y, 30);
  y = addSection(doc, y, 'Action Plan & Next Steps');

  ns.forEach((step: any) => {
    y = checkY(doc, y, 22);
    const num       = step?.step || '';
    const action    = safe(step?.action || '');
    const timeframe = safe(step?.timeframe || '');
    const tool      = safe(step?.tool || '');
    const details   = safe(step?.details || '');

    if (!action) return;

    y = addPara(doc, y, `Step ${num}: ${action}`, { bold: true, size: 9 });
    if (timeframe || tool) {
      y = addPara(doc, y, `${timeframe}${tool ? '  |  Tool: ' + tool : ''}`, { size: 7.5, color: COL.lightGray, indent: 4 });
    }
    if (details) {
      y = addPara(doc, y, details, { size: 8, color: COL.gray, indent: 4 });
    }
    y += 3;
  });

  // ─── FOOTERS ON ALL PAGES ─────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFillColor(...COL.bg);
      doc.rect(0, 0, PW, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COL.gray);
      doc.text(`Shikshantaram OS  |  Deep Research: ${productName.slice(0, 45)}`, ML, 8);
    }
    addFooter(doc, i, totalPages);
  }

  const safeName = productName
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 35);
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`DeepResearch_${safeName}_${dateStr}.pdf`);
};
