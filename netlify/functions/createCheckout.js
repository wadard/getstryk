const Stripe = require("stripe");

exports.handler = async (event) => {
    try {
        const data = JSON.parse(event.body || "{}");

        const {
            selectedPackage,
            deliveryFee,
            customerName,
            customerEmail,
            address
        } = data;

        // 1. VALIDATE REQUIRED FIELDS
        if (!selectedPackage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing selectedPackage" })
            };
        }

        if (!customerName || customerName.length < 2) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid name" })
            };
        }

        if (!customerEmail || !customerEmail.includes("@")) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid email" })
            };
        }

        if (!address || !address.postcode) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing address" })
            };
        }

        // 2. UK MAINLAND ONLY CHECK
        const postcode = String(address.postcode).toUpperCase().trim();
        const blockedPrefixes = ["BT", "GY", "JE", "IM"];

        if (blockedPrefixes.some(prefix => postcode.startsWith(prefix))) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "We currently only deliver to mainland UK (England, Wales, Scotland)."
                })
            };
        }

        // 3. INITIALISE STRIPE
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

        // 4. BUILD LINE ITEMS
        const lineItems = [
            {
                price: packagePriceId,
                quantity: 1
            }
        ];

        if (Number(deliveryFee) > 0) {
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

        // 5. CREATE CHECKOUT SESSION
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: lineItems,
            customer_email: customerEmail,
            metadata: {
                customerName,
                selectedPackage,
                deliveryFee: Number(deliveryFee) > 0 ? "yes" : "no",
                postcode,
                addressLine1: address.line1 || "",
                addressLine2: address.line2 || "",
                town: address.town || "",
                county: address.county || ""
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
