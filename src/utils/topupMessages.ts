import { TOPUP_CONFIG } from '@/config/topup';

export type TopupMessage = { type: 'alert' | 'quirky' | 'cap'; text: string; band: string } | null;

/**
 * Returns the message + band identifier for a custom amount.
 * Band is exposed so the UI can avoid re-animating on every keystroke
 * within the same band.
 */
export function getCustomAmountMessage(amount: number, credits: number): TopupMessage {
  if (amount === 0) return null;
  if (amount < TOPUP_CONFIG.MIN_CUSTOM_AMOUNT) {
    return {
      type: 'alert',
      band: 'below-min',
      text: `⚠️ Minimum top-up is ₹${TOPUP_CONFIG.MIN_CUSTOM_AMOUNT} — nudge it up just a bit!`,
    };
  }
  if (amount > TOPUP_CONFIG.MAX_CUSTOM_AMOUNT) {
    return {
      type: 'cap',
      band: 'cap',
      text: `🧢 Max single top-up is ₹${TOPUP_CONFIG.MAX_CUSTOM_AMOUNT.toLocaleString('en-IN')} — we'll cap it there.`,
    };
  }
  if (amount <= 49)   return { type: 'quirky', band: 'b1', text: `🧪 Testing the waters? Respect — every builder starts somewhere.` };
  if (amount <= 99)   return { type: 'quirky', band: 'b2', text: `🌱 Small seed, big tree energy. ${credits} credits incoming.` };
  if (amount <= 249)  return { type: 'quirky', band: 'b3', text: `☕ The price of a coffee, the power of ${credits} credits. Fair trade.` };
  if (amount <= 499)  return { type: 'quirky', band: 'b4', text: `🎯 Focused and intentional. ${credits} credits, zero fluff.` };
  if (amount <= 999)  return { type: 'quirky', band: 'b5', text: `💪 Solid move. You're set up for real work now — ${credits} credits locked and loaded.` };
  if (amount <= 1999) return { type: 'quirky', band: 'b6', text: `⚡ Now we're talking. ${credits} credits = serious building energy.` };
  if (amount <= 4999) return { type: 'quirky', band: 'b7', text: `🔥 Power-user mode activated. ${credits} credits, ready to ship.` };
  if (amount <= 9999) return { type: 'quirky', band: 'b8', text: `🐋 Whale status confirmed. The platform welcomes you with open arms.` };
  return { type: 'quirky', band: 'b9', text: `👑 Okay, absolute legend. ${credits} credits — go build something wild.` };
}
