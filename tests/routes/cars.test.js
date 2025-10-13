const request = require("supertest")
const app = require("../../app")
const { Car } = require("../../models/Car");
const { createAdminUser } = require("../helpers/authHelper")

jest.mock("cloudinary", () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload_stream: jest.fn((callback) => {
                const mockStream = {
                    end: jest.fn(() => callback(null, {
                        secure_url: "https://cloudinary.com/updated-logo.jpg",
                        public_id: "updated-logo-123",
                    }))
                };
                return mockStream;
            }),
            destroy: jest.fn().mockResolvedValue({ result: "ok" }),
        },
        api: {
            delete_resources: jest.fn().mockResolvedValue({ deleted: "ok" }),
        },

    },
}));

describe("Cars routes", () => {

    let token;

    beforeAll(async () => {
        token = await createAdminUser();
    });

    // Test helper function
    const createTestCarRequest = (overrides = {}) => {
        const defaultData = {
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Model X",
            bodyType: "Sedan",
            year: 2023,
            pricePerDay: 100,
            fuelType: "Diesel",
            transmission: "Automatic",
            plateNumber: "ABC123",
            ...overrides
        };

        const request2 = request(app)
            .post("/api/cars")
            .set("Authorization", `Bearer ${token}`)
            .field("carCompanyId", defaultData.carCompanyId)
            .field("model", defaultData.model)
            .field("year", defaultData.year)
            .field("bodyType", defaultData.bodyType)
            .field("pricePerDay", defaultData.pricePerDay)
            .field("fuelType", defaultData.fuelType)
            .field("transmission", defaultData.transmission)
            .field("plateNumber", defaultData.plateNumber);

        // Only attach images if not overridden to exclude them
        if (!overrides.skipImages) {
            request2
                .attach("image", Buffer.from("fake image data"), "car1.jpg")
                .attach("image", Buffer.from("fake image data"), "car2.jpg");
        }

        return request2;
    };


    ////////////////////  Happy path scenarios //////////////////////////

    test("Post create car => 200", async () => {
        const carCompanyId = "64f2c1f1c2a1f1a1f1a1f1a1";
        const res = await request(app)
            .post("/api/cars")
            .set("Authorization", `Bearer ${token}`)
            .field("carCompanyId", carCompanyId)
            .field("model", "Model X")
            .field("year", 2023)
            .field("pricePerDay", 100)
            .field("bodyType", "Sedan")
            .field("fuelType", "Diesel")
            .field("transmission", "Automatic")
            .field("plateNumber", "ABC123")
            .attach("image", Buffer.from("fake image data"), "car1.jpg")
            .attach("image", Buffer.from("fake image data"), "car2.jpg");


        expect(res.statusCode).toBe(200);

        expect(res.body).toHaveProperty("_id");
        expect(res.body.model).toBe("Model X");
        expect(res.body.images.length).toBe(2);


    });



    test("Delete car => 200", async () => {
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Model Y",
            bodyType: "Sedan",
            year: 2023,
            pricePerDay: 150,
            fuelType: "Diesel",
            transmission: "Manual",
            plateNumber: "DEF456",
            images: [
                { url: "http://fake.com/image1.jpg", publicId: "img1" },
                { url: "http://fake.com/image2.jpg", publicId: "img2" },
            ],
        });

        const res = await request(app)
            .delete(`/api/cars/${car._id}`)
            .set("Authorization", `Bearer ${token}`);



        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Car deleted successfully");


        const deleted = await Car.findById(car._id);
        expect(deleted).toBeNull();
    });


    test("Put update car with valid data => 200", async () => {
        // Create a car first
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Old Model",
            year: 2020,
            bodyType: "Sedan",
            pricePerDay: 80,
            fuelType: "Diesel",
            transmission: "Manual",
            plateNumber: "OLD123",
            status: "Available",
            images: [
                { url: "http://fake.com/old1.jpg", publicId: "old1" },
                { url: "http://fake.com/old2.jpg", publicId: "old2" },
            ],
        });

        const res = await request(app)
            .put(`/api/cars/${car._id}`)
            .set("Authorization", `Bearer ${token}`)
            .field("model", "Updated Model")
            .field("year", 2024)
            .field("pricePerDay", 120)
            .field("fuelType", "Electric")
            .field("transmission", "Automatic")
            .field("status", "Available")
            .field("images", JSON.stringify([
                { url: "http://fake.com/old1.jpg", publicId: "old1" }
            ]))
            .field("publicIds", JSON.stringify(["old2"]));

        expect(res.statusCode).toBe(200);
        expect(res.body.model).toBe("Updated Model");
        expect(res.body.year).toBe(2024);
        expect(res.body.pricePerDay).toBe(120);
        expect(res.body.fuelType).toBe("Electric");
        expect(res.body.transmission).toBe("Automatic");
        expect(res.body.status).toBe("Available");
        expect(res.body.images.length).toBe(1); // One image deleted
        expect(res.body.images[0].publicId).toBe("old1"); // Only this image remains
    });


    test("Get all cars with default pagination => 200", async () => {
        // Create test cars first
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                pricePerDay: 150,
                fuelType: "Electric",
                bodyType: "Sedan",

                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            },
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a2",
                model: "Model X",
                year: 2024,
                bodyType: "Sedan",

                pricePerDay: 200,
                fuelType: "Electric",
                transmission: "Automatic",
                plateNumber: "DEF456",
                images: [{ url: "http://fake.com/image2.jpg", publicId: "img2" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars")
            .expect(200);

        expect(res.body).toHaveProperty("cars");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.cars)).toBe(true);
        expect(res.body.cars.length).toBeGreaterThan(0);
        expect(res.body.count).toBeGreaterThan(0);

        // Verify car structure
        expect(res.body.cars[0]).toHaveProperty("model");
        expect(res.body.cars[0]).toHaveProperty("year");
        expect(res.body.cars[0]).toHaveProperty("pricePerDay");
        expect(res.body.cars[0]).toHaveProperty("carCompanyId");
    });

    test("Get car by ID => 200", async () => {
        // Create a test car first
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Model S",
            year: 2023,
            bodyType: "Sedan",

            pricePerDay: 150,
            fuelType: "Electric",
            transmission: "Automatic",
            plateNumber: "ABC123",
            images: [
                { url: "http://fake.com/image1.jpg", publicId: "img1" },
                { url: "http://fake.com/image2.jpg", publicId: "img2" }
            ]
        });

        const res = await request(app)
            .get(`/api/cars/${car._id}`)
            .expect(200);

        expect(res.body._id).toBe(car._id.toString());
        expect(res.body.model).toBe("Model S");
        expect(res.body.year).toBe(2023);
        expect(res.body.pricePerDay).toBe(150);
        expect(res.body.fuelType).toBe("Electric");
        expect(res.body.transmission).toBe("Automatic");
        expect(res.body.images.length).toBe(2);
        expect(res.body).toHaveProperty("carCompanyId");
    });


    test("Get car by year and model with no reservations => 200", async () => {
        // Create test cars first
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Model S",
            year: 2023,
            pricePerDay: 150,
            fuelType: "Electric",
            bodyType: "Sedan",

            transmission: "Automatic",
            plateNumber: "ABC123",
            images: [
                { url: "http://fake.com/image1.jpg", publicId: "img1" }
            ]
        });

        const res = await request(app)
            .get("/api/cars/by-year")
            .query({
                year: 2023,
                model: "Model S"
            })
            .expect(200);

        expect(res.body._id).toBe(car._id.toString());
        expect(res.body.model).toBe("Model S");
        expect(res.body.year).toBe(2023);
        expect(res.body.pricePerDay).toBe(150);
        expect(res.body.fuelType).toBe("Electric");
        expect(res.body.transmission).toBe("Automatic");
        expect(res.body.images.length).toBe(1);
        expect(res.body).toHaveProperty("carCompanyId");
    });

    test("Get price ranges for cars => 200", async () => {
        // Create test cars with different models and prices
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                pricePerDay: 150,
                fuelType: "Electric",
                bodyType: "Sedan",

                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            },
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2024,
                pricePerDay: 180,
                fuelType: "Electric",
                bodyType: "Sedan",

                transmission: "Automatic",
                plateNumber: "DEF456",
                images: [{ url: "http://fake.com/image2.jpg", publicId: "img2" }]
            },
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a2",
                model: "Model X",
                year: 2023,
                bodyType: "Sedan",

                pricePerDay: 200,
                fuelType: "Electric",
                transmission: "Automatic",
                plateNumber: "GHI789",
                images: [{ url: "http://fake.com/image3.jpg", publicId: "img3" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars/priceranges")
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);

        // Verify price range structure
        expect(res.body[0]).toHaveProperty("model");
        expect(res.body[0]).toHaveProperty("minPrice");
        expect(res.body[0]).toHaveProperty("maxPrice");
        expect(typeof res.body[0].minPrice).toBe("number");
        expect(typeof res.body[0].maxPrice).toBe("number");
    });

    test("Get cars count => 200", async () => {
        // Create some test cars
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                bodyType: "Sedan",

                pricePerDay: 150,
                fuelType: "Electric",
                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            },
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a2",
                model: "Model X",
                year: 2024,
                pricePerDay: 200,
                bodyType: "Sedan",

                fuelType: "Electric",
                transmission: "Automatic",
                plateNumber: "DEF456",
                images: [{ url: "http://fake.com/image2.jpg", publicId: "img2" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars/count")
            .expect(200);

        expect(typeof res.body).toBe("number");
        expect(res.body).toBeGreaterThan(0);
    });
    ////////////////////  Happy path scenarios //////////////////////////














    ////////////////////  Unappy path scenarios //////////////////////////

    test("Create car with wrong number of images => 400", async () => {
        const res = await createTestCarRequest({ skipImages: true })
            .attach("image", Buffer.from("fake image data"), "car1.jpg"); // Only one image

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Please upload exactly two images");
    });

    test("Create car with non-image file => 400", async () => {
        const res = await createTestCarRequest({ skipImages: true })
            .attach("image", Buffer.from("fake text data"), "document.pdf") // Non-image file
            .attach("image", Buffer.from("fake image data"), "car2.jpg");

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("All files must be images");
    });


    test("Update non-existent car => 404", async () => {
        const fakeId = "64f2c1f1c2a1f1a1f1a1f1a2";
        const res = await request(app)
            .put(`/api/cars/${fakeId}`)
            .set("Authorization", `Bearer ${token}`)
            .field("model", "Updated Model")
            .field("year", 2024)
            .field("pricePerDay", 120)
            .field("fuelType", "Electric")
            .field("transmission", "Automatic")
            .field("status", "available")
            .field("images", JSON.stringify([]))
            .field("publicIds", JSON.stringify([]));

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Car not found");
    });

    test("Update car with too many images => 400", async () => {
        const car = await Car.create({
            carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
            model: "Test Model",
            year: 2023,
            pricePerDay: 100,
            bodyType: "Sedan",

            fuelType: "Electric",
            transmission: "Manual",
            plateNumber: "TEST123",
            images: [
                { url: "http://fake.com/image1.jpg", publicId: "img1" }
            ],
        });

        const res = await request(app)
            .put(`/api/cars/${car._id}`)
            .set("Authorization", `Bearer ${token}`)
            .field("model", "Updated Model")
            .field("year", 2024)
            .field("pricePerDay", 120)
            .field("fuelType", "Electric")
            .field("transmission", "Automatic")
            .field("status", "Available")
            .field("images", JSON.stringify([]))
            .field("publicIds", JSON.stringify([]))
            .attach("image", Buffer.from("fake image data"), "img1.jpg")  // Use "image" not "files"
            .attach("image", Buffer.from("fake image data"), "img2.jpg")
            .attach("image", Buffer.from("fake image data"), "img3.jpg"); // Too many images


        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Unexpected field name for file upload");
    });



    test("Get all cars with invalid page/limit parameters => 200 (uses defaults)", async () => {
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                pricePerDay: 150,
                fuelType: "Electric",
                bodyType: "Sedan",

                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars")
            .query({
                page: "invalid", // Invalid page
                limit: "not-a-number" // Invalid limit
            })
            .expect(200);

        expect(res.body).toHaveProperty("cars");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.cars)).toBe(true);
    });

    test("Search for non-existent cars => empty array", async () => {
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                pricePerDay: 150,
                fuelType: "Electric",
                bodyType: "Sedan",

                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars")
            .query({
                search: "NonExistentModelXYZ" // Search for something that doesn't exist
            })
            .expect(200);

        expect(res.body).toHaveProperty("cars");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.cars)).toBe(true);
    });




    test("Get car with non-existent ID => 404", async () => {
        const fakeId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist

        const res = await request(app)
            .get(`/api/cars/${fakeId}`)
            .expect(404);

        expect(res.body.message).toBe("Car not found");
    });

    test("Get car with invalid ID format => 500", async () => {
        const invalidId = "invalid-id-format";

        const res = await request(app)
            .get(`/api/cars/${invalidId}`)
            .expect(400);

        expect(res.body).toHaveProperty("message");
    });



    test("Get car by year and model with missing parameters => 400", async () => {
        const res = await request(app)
            .get("/api/cars/by-year")
            .query({
                year: 2023
                // Missing model parameter
            })
            .expect(400);

        expect(res.body.message).toBe("Year and model are required");
    });

    test("Get car by year and model with no matching cars => 404", async () => {
        await Car.create([
            {
                carCompanyId: "64f2c1f1c2a1f1a1f1a1f1a1",
                model: "Model S",
                year: 2023,
                bodyType: "Sedan",

                pricePerDay: 150,
                fuelType: "Electric",
                transmission: "Automatic",
                plateNumber: "ABC123",
                images: [{ url: "http://fake.com/image1.jpg", publicId: "img1" }]
            }
        ]);

        const res = await request(app)
            .get("/api/cars/by-year")
            .query({
                year: 2024, // Year that doesn't exist
                model: "NonExistentModel" // Model that doesn't exist
            })
            .expect(404);

        expect(res.body.message).toBe("No cars found");
    });




    test("Get cars count when no cars exist => 404", async () => {
        // Clear all cars from the database
        await Car.deleteMany({});

        const res = await request(app)
            .get("/api/cars/count")
            .expect(404);

        expect(res.body.message).toBe("no cars found");
    });
    ////////////////////  Unappy path scenarios //////////////////////////



})