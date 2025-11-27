const { getAIResponse } = require("../services/openAiService");
const { Car } = require("../models/Car")
exports.chatWithAI = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ message: "Messages are required" });
        }


        let systemExtra = "";


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


        const reply = await getAIResponse(messages, systemExtra);
        return res.json({ reply });

    } catch (error) {
        console.error("Error in chatWithAI:", error);
        res.status(500).json({ message: "Chat processing failed" });
    }
};
