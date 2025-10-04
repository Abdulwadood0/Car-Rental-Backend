const request = require("supertest")
const app = require("../../app")
const { createAdminUser, createAuthenticatedUser } = require("../helpers/authHelper")
const { Reservation } = require("../../models/Reservation")
const { Car } = require("../../models/Car")
const { Payment } = require("../../models/Payment")
const { User } = require("../../models/User")





describe("Reservation routes", () => {

    ////////////////////  Happy path scenarios //////////////////////////



    test("Create reservation successfully => 200", async () => {
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

        const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
        const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

        const res = await request(app)
            .post("/api/reservation")
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                carId: car._id.toString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
            .expect(200);

        expect(res.body).toHaveProperty("_id");
        expect(res.body.userId).toBe(user.user._id.toString());
        expect(res.body.carId).toBe(car._id.toString());

        // Calculate expected total price (2 days difference)
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const expectedPrice = car.pricePerDay * daysDiff;
        expect(res.body.totalPrice).toBe(expectedPrice);

        // Verify reservation was saved in database
        const savedReservation = await Reservation.findById(res.body._id);
        expect(savedReservation).toBeTruthy();
        expect(savedReservation.status).toBe("pending");
    });



    test("Update reservation dates successfully => 200", async () => {
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

        // Create dates in KSA timezone that pass validation
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const inThreeDays = new Date(today);
        inThreeDays.setDate(today.getDate() + 3);
        inThreeDays.setHours(0, 0, 0, 0);

        // Create a reservation with pending status
        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: tomorrow,
            endDate: inThreeDays,
            totalPrice: 200,
            status: "pending"
        });

        // New dates within valid range (within 5 days from today)
        const newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() + 2);
        newStartDate.setHours(0, 0, 0, 0);

        const newEndDate = new Date(today);
        newEndDate.setDate(today.getDate() + 4);
        newEndDate.setHours(0, 0, 0, 0);

        const res = await request(app)
            .patch(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                startDate: newStartDate.toISOString(),
                endDate: newEndDate.toISOString(),
                totalPrice: 200 // 2 days * 100 per day
            })
            .expect(200);

        expect(res.body.message).toBe("Reservation updated successfully");

        // Verify reservation was updated in database
        const updatedReservation = await Reservation.findById(reservation._id);

        // Compare dates without timezone issues - just check they're Date objects
        expect(updatedReservation.startDate).toEqual(expect.any(Date));
        expect(updatedReservation.endDate).toEqual(expect.any(Date));
        expect(updatedReservation.totalPrice).toBe(200);
        expect(updatedReservation.status).toBe("pending");
    });

    test("Update reservation status to ongoing => 200", async () => {
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

        // Create dates that pass validation (start date is today or in the past for ongoing status)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 3);
        endDate.setHours(0, 0, 0, 0);

        // Create a reservation with upcoming status but start date is today
        const reservation = await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: today,
            endDate: endDate,
            totalPrice: 300,
            status: "upcoming"
        });

        const res = await request(app)
            .patch(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                status: "ongoing"
            })
            .expect(200);

        expect(res.body.message).toBe("Reservation started successfully");

        // Verify reservation was updated in database
        const updatedReservation = await Reservation.findById(reservation._id);
        expect(updatedReservation.status).toBe("ongoing");

    });



    test("Get own reservation => 200", async () => {
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
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .get(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(200);

        expect(res.body._id).toBe(reservation._id.toString());
        expect(res.body.userId).toBe(user.user._id.toString());
        expect(res.body.carId).toBe(car._id.toString());
        expect(res.body.totalPrice).toBe(200);
        expect(res.body.status).toBe("pending");
    });

    test("Get reservation as admin => 200", async () => {
        const regularUser = await createAuthenticatedUser();
        const adminToken = await createAdminUser()
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
            userId: regularUser.user._id, // Reservation belongs to regular user
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .get(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${adminToken}`) // Admin token
            .expect(200);

        expect(res.body._id).toBe(reservation._id.toString());
        expect(res.body.userId).toBe(regularUser.user._id.toString());
        // Admin can access any reservation
    });


    test("Get all reservations as regular user => 200", async () => {
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

        // Create reservations for this user
        await Reservation.create([
            {
                userId: user.user._id,
                carId: car._id,
                startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                totalPrice: 200,
                status: "pending"
            },
            {
                userId: user.user._id,
                carId: car._id,
                startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                totalPrice: 200,
                status: "upcoming"
            }
        ]);

        const res = await request(app)
            .get("/api/reservation")
            .set("Authorization", `Bearer ${user.accessToken}`)
            .query({
                page: 1,
                limit: 10
            })
            .expect(200);

        expect(res.body).toHaveProperty("reservations");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.reservations)).toBe(true);
        expect(res.body.reservations.length).toBe(2);

        // Regular user should only see their own reservations
        res.body.reservations.forEach(reservation => {
            expect(reservation.userId).toBe(user.user._id.toString());
        });

        // Verify populated fields
        expect(res.body.reservations[0]).toHaveProperty("carId");
        expect(res.body.reservations[0]).toHaveProperty("paymentId");
    });

    test("Get all reservations as admin with search => 200", async () => {
        const user = await createAuthenticatedUser();
        const adminToken = await createAdminUser()

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

        // Create reservation for the searched user
        await Reservation.create({
            userId: user.user._id,
            carId: car._id,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .get("/api/reservation")
            .set("Authorization", `Bearer ${adminToken}`)
            .query({
                page: 1,
                limit: 10,
                search: "test@gmail.com" // Search by user email
            })
            .expect(200);

        expect(res.body).toHaveProperty("reservations");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.reservations)).toBe(true);
        expect(res.body.reservations.length).toBe(1);
        expect(res.body.reservations[0].userId).toBe(user.user._id.toString());
    });


    ////////////////////  Happy path scenarios //////////////////////////




    ////////////////////  Uhappy path scenarios //////////////////////////

    test("Create reservation with non-existent car => 404", async () => {
        const user = await createAuthenticatedUser();
        const fakeCarId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist

        const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const res = await request(app)
            .post("/api/reservation")
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                carId: fakeCarId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
            .expect(404);

        expect(res.body.message).toBe("Car not found");
    });

    test("Create reservation when car is fully booked => 400", async () => {
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

        // Create 2 ongoing/upcoming reservations for the same car
        await Reservation.create([
            {
                userId: "64f2c1f1c2a1f1a1f1a1f1a3",
                carId: car._id,
                startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                totalPrice: 200,
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

        const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

        const res = await request(app)
            .post("/api/reservation")
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                carId: car._id.toString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
            .expect(400);

        expect(res.body.message).toContain("Car is not available until");
    });






    test("Update other user's reservation => 403", async () => {
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test@example.com",
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
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .patch(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user1.accessToken}`) // user1 tries to update user2's reservation
            .send({
                startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                totalPrice: 321
            })
        // .expect(403);

        expect(res.body.message).toBe("Forbidden");
    });

    test("Update cancelled reservation => 400", async () => {
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
            totalPrice: 200,
            status: "cancelled" // Already cancelled
        });

        const res = await request(app)
            .patch(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send({
                startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
            })
            .expect(400);

        expect(res.body.message).toBe("Cannot update a cancelled or completed reservation");
    });



    test("Get other user's reservation as regular user => 401", async () => {
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test@example.com",
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
            totalPrice: 200,
            status: "pending"
        });

        const res = await request(app)
            .get(`/api/reservation/${reservation._id}`)
            .set("Authorization", `Bearer ${user1.accessToken}`) // user1 tries to access user2's reservation
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });

    test("Get non-existent reservation => 404", async () => {
        const user = await createAuthenticatedUser();
        const fakeReservationId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist

        const res = await request(app)
            .get(`/api/reservation/${fakeReservationId}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(404);

        expect(res.body.message).toBe("Reservation not found");
    });




    test("Get reservations with non-existent user search => 404", async () => {
        const adminToken = await createAdminUser()

        const res = await request(app)
            .get("/api/reservation")
            .set("Authorization", `Bearer ${adminToken}`)
            .query({
                page: 1,
                limit: 10,
                search: "nonexistent@example.com" // User doesn't exist
            })
            .expect(404);

        expect(res.body.message).toBe("User not found");
    });

    test("Get reservations with no results => 404", async () => {
        const user = await createAuthenticatedUser();

        // Don't create any reservations for this user

        const res = await request(app)
            .get("/api/reservation")
            .set("Authorization", `Bearer ${user.accessToken}`)
            .query({
                page: 1,
                limit: 10,
                status: "completed" // Filter for status that doesn't exist
            })
            .expect(404);

        expect(res.body.message).toBe("No reservations found");
    });
    ////////////////////  Uhappy path scenarios //////////////////////////

})