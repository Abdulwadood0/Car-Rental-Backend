const request = require("supertest")
const app = require("../../app")
const { createAdminUser } = require("../helpers/authHelper");
const { CarCompany } = require("../../models/CarCompany")


// Mock Cloudinary
jest.mock("cloudinary", () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload_stream: jest.fn((callback) => {
                const mockStream = {
                    end: jest.fn(() => {
                        callback(null, {
                            secure_url: "https://cloudinary.com/updated-logo.jpg",
                            public_id: "updated-logo-123",
                        });
                    }),
                };
                return mockStream;
            }),
            destroy: jest.fn().mockResolvedValue({ result: "ok" }), // for deleteImage
        },

    },
}));

////////////////////  Happy path scenarios //////////////////////////

describe("CarCompanies routes", () => {
    let token;

    beforeAll(async () => {
        token = await createAdminUser();
    });

    test("POST Create Car Company => 200", async () => {

        const res = await request(app)
            .post('/api/companies')
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Toyota Motors')
            .attach('image', Buffer.from('fake image data'), 'toyota-logo.jpg')
            .expect(200)

        expect(res.body.message).toBe('car company created successfully');
    })


    test("Delete car company => 200", async () => {
        const carCompany = await CarCompany.create({
            name: "Test Motors",
            logo: { publicId: "fake-public-id", url: "http://fake-url.com/logo.jpg" },
        });

        const res = await request(app)
            .delete(`/api/companies/${carCompany._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Car Company deleted successfully");


        const check = await CarCompany.findById(carCompany._id);
        expect(check).toBeNull();
    });


    test("Patch car company name/country without logo => 200", async () => {
        const carCompany = await CarCompany.create({
            name: "Old Motors",
            logo: { publicId: "old-logo-id", url: "http://fake.com/old.jpg" },
        });

        const res = await request(app)
            .patch(`/api/companies/${carCompany._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "New Motors" });


        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Car Company updated successfully");


        const updated = await CarCompany.findById(carCompany._id);
        expect(updated.name).toBe("New Motors");
        expect(updated.logo.publicId).toBe("old-logo-id");
    });


    test("Patch car company with new logo => 200", async () => {
        const carCompany = await CarCompany.create({
            name: "Logo Motors",
            logo: { publicId: "old-logo-id", url: "http://fake.com/old.jpg" },
        });

        const res = await request(app)
            .patch(`/api/companies/${carCompany._id}`)
            .set("Authorization", `Bearer ${token}`)
            .field("name", "Logo Motors Updated")
            .attach("image", Buffer.from("fake image data"), "new-logo.jpg");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("message", "Car Company updated successfully");

        const updated = await CarCompany.findById(carCompany._id);
        expect(updated.name).toBe("Logo Motors Updated");
        expect(updated.logo.publicId).toBe("updated-logo-123");
        expect(updated.logo.url).toBe("https://cloudinary.com/updated-logo.jpg");
    });


    test("Get car company by id => 200", async () => {
        const carCompany = await CarCompany.create({
            name: "Test Motors",
            logo: { publicId: "test-logo-id", url: "http://fake.com/logo.jpg" },
        });

        const res = await request(app)
            .get(`/api/companies/${carCompany._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);

        // Response should contain the car company data
        expect(res.body).toHaveProperty("_id", carCompany._id.toString());
        expect(res.body).toHaveProperty("name", "Test Motors");
        expect(res.body.logo.publicId).toBe("test-logo-id");
        expect(res.body.logo.url).toBe("http://fake.com/logo.jpg");
    });


    test("Get all car companies => 200", async () => {
        await CarCompany.create([
            {
                name: "Company One",
                logo: { publicId: "logo-1", url: "http://fake.com/logo1.jpg" },
            },
            {
                name: "Company Two",
                logo: { publicId: "logo-2", url: "http://fake.com/logo2.jpg" },
            },
        ]);

        const res = await request(app)
            .get("/api/companies")
            .set("Authorization", `Bearer ${token}`);


        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);

        expect(res.body[0]).toHaveProperty("name");
        expect(res.body[1]).toHaveProperty("name");
    });

    ////////////////////  Happy path scenarios //////////////////////////





    ////////////////////  Uhappy path scenarios //////////////////////////


    test("Add car company with invalid body => 400", async () => {
        const res = await request(app)
            .post("/api/companies")
            .set("Authorization", `Bearer ${token}`)
            .send({}); // missing required fields

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    /**------------------------
     * deleteCarCompany => 404
     ------------------------*/
    test("Delete non-existent car company => 404", async () => {
        const fakeId = "64f2c1f1c2a1f1a1f1a1f1a1";
        const res = await request(app)
            .delete(`/api/companies/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Car Company not found");
    });

    /**------------------------
     * updateCarCompany => 404 & 400
     ------------------------*/
    test("Update non-existent car company => 404", async () => {
        const fakeId = "64f2c1f1c2a1f1a1f1a1f1a1";
        const res = await request(app)
            .patch(`/api/companies/${fakeId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "New Name" });

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Car Company not found");
    });

    test("Update car company with invalid data => 400", async () => {
        const company = await CarCompany.create({ name: "Old Name", logo: { publicId: "id", url: "url" } });
        const res = await request(app)
            .patch(`/api/companies/${company._id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "" }); // assuming empty name fails validation

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    /**------------------------
     * getCarCompany => 404
     ------------------------*/
    test("Get non-existent car company => 404", async () => {
        const fakeId = "64f2c1f1c2a1f1a1f1a1f1a1";
        const res = await request(app)
            .get(`/api/companies/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Car Company not found");
    });

    /**------------------------
     * getAllCarCompanies => 200 empty array (optional unhappy)
     ------------------------*/
    test("Get all car companies when DB is empty => 200 empty array", async () => {
        const res = await request(app)
            .get("/api/companies")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });
    ////////////////////  Uhappy path scenarios //////////////////////////


})
