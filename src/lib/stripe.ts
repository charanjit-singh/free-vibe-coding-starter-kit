import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_51O000000000000000000000", {
  typescript: true,
});

export default stripe;
