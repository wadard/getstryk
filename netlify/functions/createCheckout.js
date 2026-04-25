import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
    try {
        const data = JSON.parse(event.body);

        // Map package names to Stripe price IDs
        const priceMap = {
            starter: process.env.STARTER_PRICE_ID,
            pro: process.env.PRO_PRICE_ID,
            elite: process.env.ELITE_PRICE_ID
        };

        // Build line items
        const lineItems = [
            {
                price: priceMap[data.selectedPackage],
                quantity: 1
            }
        ];

        // Add delivery fee if needed
        if (data.deliveryFee > 0) {
            lineItems.push({
                price: process.env.DELIVERY_FEE_PRICE_ID,
                quantity: 1
            });
        }

        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: lineItems,
            success_url: "https://getstryk.co.uk/success.html",
            cancel_url: "https://getstryk.co.uk/rent.html#step5",
            metadata: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                address: JSON.stringify(data.address),
                deliveryDate: data.selectedDate,
                deliveryTime: data.deliveryTime,
                newsletterOptIn: data.newsletterOptIn
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
