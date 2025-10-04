const request = require("supertest")
const app = require("../../app")
const { createAdminUser, createAuthenticatedUser } = require("../helpers/authHelper")
const { Reservation } = require("../../models/Reservation")
const { Car } = require("../../models/Car")
const { Payment } = require("../../models/Payment")
const { User } = require("../../models/User")

jest.mock('axios');
const axios = require('axios');

// Mock the payment processing service
jest.mock("../../services/paymentService", () => ({
    processPayment: jest.fn()
}));

const { processPayment } = require("../../services/paymentService");


describe("Payment routes", () => {

    ////////////////////  Happy path scenarios //////////////////////////
    test("Create payment successfully => 200", async () => {
        // Create test data
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });


        // Mock successful payment
        const mockPaymentResponse = {
            id: "pay_123456789",
            status: "paid"
        };
        processPayment.mockResolvedValue(mockPaymentResponse);

        const res = await request(app)
            .post(`/api/payment/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                description: "Car rental payment",
                source: "tok_visa"
            })
            .expect(200);



        // Find payment for this specific reservation
        const savedPayment = await Payment.findOne({ reservationId: reservation._id });

        // Find the specific reservation
        const updatedReservation = await Reservation.findById(reservation._id);

        expect(res.body.message).toBe("Payment successful");
        expect(savedPayment).toBeTruthy();
        expect(updatedReservation.paymentId).toBeDefined();
        expect(updatedReservation.paymentId.toString()).toBe(savedPayment._id.toString());
    });




    test("Retry payment successfully => 200", async () => {
        // Create test data
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        // Create a failed payment to retry
        const existingPayment = await Payment.create({
            userId: user.user._id,
            reservationId: reservation._id,
            transactionId: "pay_failed_123",
            amount: 30000,
            paymentDate: new Date(),
            paymentMethod: "Credit Card",
            status: "failed" // Initial failed status
        });

        // Mock successful payment for retry
        const mockPaymentResponse = {
            id: "pay_retry_success_456",
            status: "paid"
        };
        processPayment.mockResolvedValue(mockPaymentResponse);

        const res = await request(app)
            .post(`/api/payment/retry/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                description: "Car rental payment retry",
                source: "tok_visa"
            })
            .expect(200);

        expect(res.body.message).toBe("Payment successful");

        // Verify payment was updated in database
        const updatedPayment = await Payment.findOne({ reservationId: reservation._id });
        expect(updatedPayment.transactionId).toBe("pay_retry_success_456");
        expect(updatedPayment.status).toBe("paid");

        // Verify reservation was updated
        const updatedReservation = await Reservation.findById(reservation._id);
        expect(updatedReservation.status).toBe("upcoming");

        // Verify processPayment was called with correct parameters
        expect(processPayment).toHaveBeenCalledWith({
            amount: 30000,
            description: "Car rental payment retry",
            source: "tok_visa"
        });
    });




    test("Handle payment callback successfully => 200", async () => {
        // Create test data
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        const payment = await Payment.create({
            userId: user.user._id,
            reservationId: reservation._id,
            transactionId: "pay_callback_test_123",
            amount: 30000,
            paymentDate: new Date(),
            paymentMethod: "Credit Card",
            status: "initiated" // Initial status
        });

        // Mock successful Moyasar API response
        const mockMoyasarResponse = {
            data: {
                id: "pay_callback_test_123",
                status: "paid"
            }
        };
        axios.get.mockResolvedValue(mockMoyasarResponse);

        const res = await request(app)
            .get("/api/payment/callback") // Adjust route as needed
            .query({ id: "pay_callback_test_123" })
            .expect(200);

        expect(res.body.message).toBe("Payment has been completed successfully");
        expect(res.body.payment).toHaveProperty("_id");

        // Verify payment status was updated in database
        const updatedPayment = await Payment.findById(payment._id);
        expect(updatedPayment.status).toBe("paid");

        // Verify reservation was updated
        const updatedReservation = await Reservation.findById(reservation._id);
        expect(updatedReservation.status).toBe("upcoming");

        // Verify Moyasar API was called
        expect(axios.get).toHaveBeenCalledWith(
            "https://api.moyasar.com/v1/payments/pay_callback_test_123",
            {
                auth: {
                    username: process.env.MOYASAR_SECRET_KEY,
                    password: ''
                }
            }
        );
    });
    ////////////////////  Happy path scenarios //////////////////////////




    ////////////////////  Uhappy path scenarios //////////////////////////

    test("Create payment for other user's reservation => 401", async () => {
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test33@example.com",
            password: "pas31231",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user2._id, // Reservation belongs to user2
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        const res = await request(app)
            .post(`/api/payment/${reservation._id}`)
            .set("Authorization", `Bearer ${user1.accessToken}`) // But user1 tries to pay
            .send({ description: "test", source: "tok_visa" })
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });

    test("Create payment when car is unavailable => 404", async () => {
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        // Create 2 ongoing reservations for the same car
        await Reservation.create([
            {
                userId: "64f2c1f1c2a1f1a1f1a1f1a3",
                carId: car._id,
                startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                totalPrice: 300,
                status: "ongoing"
            },
            {
                userId: "64f2c1f1c2a1f1a1f1a1f1a4",
                carId: car._id,
                startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
                totalPrice: 200,
                status: "upcoming"
            }
        ]);

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .post(`/api/payment/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({ description: "test", source: "tok_visa" })
            .expect(404);

        expect(res.body.message).toBe("Car is no longer avalible");
    });




    test("Retry payment for already paid reservation => 400", async () => {
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        // Create an already successful payment
        await Payment.create({
            userId: user.user._id,
            reservationId: reservation._id,
            transactionId: "pay_already_paid_123",
            amount: 30000,
            paymentDate: new Date(),
            paymentMethod: "Credit Card",
            status: "paid" // Already paid status
        });

        const res = await request(app)
            .post(`/api/payment/retry/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                description: "Car rental payment retry",
                source: "tok_visa"
            })
            .expect(400);

        expect(res.body.message).toBe("Payment is already successful");
    });

    test("Retry payment for other user's reservation => 401", async () => {
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test33@example.com",
            password: "pas31231",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user2._id, // Reservation belongs to user2
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        // Create a failed payment for user2's reservation
        await Payment.create({
            userId: user2._id,
            reservationId: reservation._id,
            transactionId: "pay_failed_123",
            amount: 30000,
            paymentDate: new Date(),
            paymentMethod: "Credit Card",
            status: "failed"
        });

        const res = await request(app)
            .post(`/api/payment/retry/${reservation._id}`)
            .set("Authorization", `Bearer ${user1.accessToken}`) // But user1 tries to retry
            .send({
                description: "Car rental payment retry",
                source: "tok_visa"
            })
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });




    test("Handle payment callback with non-existent payment => 404", async () => {
        // Mock Moyasar API response for a payment that exists in Moyasar
        const mockMoyasarResponse = {
            data: {
                id: "pay_nonexistent_123",
                status: "paid"
            }
        };
        axios.get.mockResolvedValue(mockMoyasarResponse);

        const res = await request(app)
            .get("/api/payment/callback")
            .query({ id: "pay_nonexistent_123" }) // Payment exists in Moyasar but not in our DB
            .expect(404);

        expect(res.body.message).toBe("Payment not found");
    });

    test("Handle payment callback with failed payment => 400", async () => {
        const user = await createAuthenticatedUser();
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "TEST123",
            images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
        });

        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 300,
            status: "pending"
        });

        const payment = await Payment.create({
            userId: user.user._id,
            reservationId: reservation._id,
            transactionId: "pay_failed_callback_123",
            amount: 30000,
            paymentDate: new Date(),
            paymentMethod: "Credit Card",
            status: "initiated" // Initial status
        });

        // Mock failed payment from Moyasar
        const mockMoyasarResponse = {
            data: {
                id: "pay_failed_callback_123",
                status: "failed" // Payment failed in Moyasar
            }
        };
        axios.get.mockResolvedValue(mockMoyasarResponse);

        const res = await request(app)
            .get("/api/payment/callback")
            .query({ id: "pay_failed_callback_123" })
            .expect(400);

        expect(res.body.message).toBe("Payment failed");

        // Verify payment status was updated to failed in our database
        const updatedPayment = await Payment.findById(payment._id);
        expect(updatedPayment.status).toBe("failed");
    });
    ////////////////////  Uhappy path scenarios //////////////////////////



})
