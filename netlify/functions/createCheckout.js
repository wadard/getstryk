const Stripe = require("stripe");

exports.handler = async (event) => {
    try {
        // Parse incoming request body
        const data = JSON.parse(event.body || "{}");

        const selectedPackage = data.selectedPackage;
        const deliveryFee = data.deliveryFee;
        const customerName = data.customerName;
        const customerEmail = data.customerEmail;

        // Validate required fields
        if (!selectedPackage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing selectedPackage" })
            };
        }

        // Initialise Stripe
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

        // Map package names to Stripe price IDs
        const priceMap = {
            starter: process.env.STARTER_PRICE_ID,
            pro: process.env.PRO_PRICE_ID,
            elite: process.env.ELITE_PRICE_ID
        };

        const packagePriceId = priceMap[selectedPackage];

        if (!packagePriceId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid package selected" })
            };
        }

        // Build line items
        const lineItems = [
            {
                price: packagePriceId,
                quantity: 1
            }
        ];

        // Add delivery fee if selected
        if (deliveryFee === true || deliveryFee === "true") {
            if (!process.env.DELIVERY_FEE_PRICE_ID) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: "Delivery fee price ID missing" })
                };
            }

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
            customer_email: customerEmail || undefined,
            metadata: {
                customerName: customerName || "",
                selectedPackage,
                deliveryFee: deliveryFee ? "yes" : "no"
            },
            success_url: "https://getstryk.co.uk/success.html",
            cancel_url: "https://getstryk.co.uk/confirm-rental.html"
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url })
        };

    } catch (err) {
        console.error("Checkout error:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error",
                details: err.message
            })
        };
    }
};
