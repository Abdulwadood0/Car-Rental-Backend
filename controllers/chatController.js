const { getAIResponse } = require("../services/openAiService");
const { Car } = require("../models/Car")
exports.chatWithAI = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ message: "Messages are required" });
        }

        // Get the last user message
        const userMessage = messages[messages.length - 1].content.toLowerCase();

        // Detect language (detection based on Arabic characters)
        // const isArabic = /[\u0600-\u06FF]/.test(userMessage);

        let systemExtra = "";

        if (
            // English keywords
            userMessage.includes("available") ||
            userMessage.includes("cars") ||
            userMessage.includes("car") ||
            userMessage.includes("rent") ||
            userMessage.includes("vehicle") ||
            userMessage.includes("vehicles") ||

            // Arabic keywords
            userMessage.includes("متاحة") ||
            userMessage.includes("السيارات") ||
            userMessage.includes("تأجير") ||
            userMessage.includes("ايجار") ||
            userMessage.includes("حجز") ||
            userMessage.includes("سيارة")
        ) {
            const cars = await Car.find({ status: "Available" }).lean();

            if (cars.length > 0) {
                const carData = cars.map(car => ({
                    model: car.model,
                    year: car.year,
                    pricePerDay: car.pricePerDay,
                    bodyType: car.type || 'sedan' // add if you have car types
                }));

                systemExtra = `CAR_AVAILABILITY_DATA: ${JSON.stringify(carData)}`;
            } else {
                systemExtra = "No cars are currently available for rent.";
            }
        }

        const reply = await getAIResponse(messages, systemExtra);
        return res.json({ reply });

    } catch (error) {
        console.error("Error in chatWithAI:", error);
        res.status(500).json({ message: "Chat processing failed" });
    }
};
