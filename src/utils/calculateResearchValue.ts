export const getRetailValue = (actualCostUsd: number): string => {
  const MULTIPLIER = 7000;
  const rawValue = actualCostUsd * MULTIPLIER;
  const flooredValue = Math.max(rawValue, 2500);
  const rounded = Math.round(flooredValue / 500) * 500;

  if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(1)}L`;
  if (rounded >= 1000) return `₹${(rounded / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${rounded.toLocaleString('en-IN')}`;
};
