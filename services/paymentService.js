const axios = require('axios');

async function processPayment({ amount, decription, source }) {

    try {
        const response = await axios.post(
            'https://api.moyasar.com/v1/payments',
            {
                amount: amount,
                currency: 'SAR',
                description: decription,
                source: source,
                callback_url: 'http://localhost:3000/payment/callback' //redirect URL
            },
            {
                auth: {
                    username: process.env.MOYASAR_SECRET_KEY,
                    password: ''
                }
            }
        );


        return response.data
    } catch (error) {
        console.error("Moyasar Payment Error:", error.response?.data || error.message);
        throw new Error("Payment processing failed.");
    }
}


module.exports = {
    processPayment
}

