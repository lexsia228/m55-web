import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('ENV_MISSING:STRIPE_SECRET_KEY');
  if (!_stripe) _stripe = new Stripe(secret);
  return _stripe;
}
