const request = require("supertest")
const app = require("../../app")
const { createAdminUser, createAuthenticatedUser } = require("../helpers/authHelper")
const { User } = require("../../models/User")



describe("Users routes", () => {

    let token;

    beforeAll(async () => {
        token = await createAdminUser();
    });




    ////////////////////  Happy path scenarios //////////////////////////

    test("Get all users as admin with pagination => 200", async () => {
        // Create test users first
        await User.create([
            {
                email: "user1@example.com",
                password: "password123",
                username: "user1",
                firstname: "John",
                lastname: "Doe",
                phone: "1234567890"
            },
            {
                email: "user2@example.com",
                password: "password123",
                username: "user2",
                firstname: "Jane",
                lastname: "Smith",
                phone: "0987654321"
            }
        ]);

        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${token}`) // Admin token from beforeAll
            .expect(200);

        expect(res.body).toHaveProperty("users");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.users)).toBe(true);
        expect(res.body.users.length).toBeGreaterThan(0);
        expect(res.body.count).toBeGreaterThan(0);

        // Verify user structure (password and other sensitive fields should be excluded)
        expect(res.body.users[0]).not.toHaveProperty("password");
        expect(res.body.users[0]).not.toHaveProperty("__v");
        expect(res.body.users[0]).not.toHaveProperty("createdAt");
        expect(res.body.users[0]).not.toHaveProperty("updatedAt");
        expect(res.body.users[0]).toHaveProperty("email");
        expect(res.body.users[0]).toHaveProperty("firstname");
        expect(res.body.users[0]).toHaveProperty("lastname");
    });


    test("Get own user profile => 200", async () => {


        const user = await createAuthenticatedUser();
        const res = await request(app)
            .get(`/api/users/${user.user._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(200);

        // Verify the response contains user data without sensitive fields
        expect(res.body._id).toBe(user.user._id.toString());
        expect(res.body.email).toBe("test@gmail.com");
        expect(res.body.firstname).toBe("test");
        expect(res.body.lastname).toBe("test");
        expect(res.body.phone).toBe("0509223442");

        // Verify sensitive fields are excluded
        expect(res.body).not.toHaveProperty("password");
        expect(res.body).not.toHaveProperty("__v");
        expect(res.body).not.toHaveProperty("createdAt");
        expect(res.body).not.toHaveProperty("updatedAt");
    });


    test("Update own user profile with valid data => 200", async () => {
        const user = await createAuthenticatedUser();

        const updatedData = {
            firstname: "UpdatedFirst",
            lastname: "UpdatedLast",
            email: "updated@example.com",
            phone: "0509223443"
        };

        const res = await request(app)
            .put(`/api/users/${user.user._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .send(updatedData)
            .expect(200);

        expect(res.body.message).toBe("Account updated successfully");
        expect(res.body.user).toHaveProperty("_id", user.user._id.toString());
        expect(res.body.user.firstname).toBe("UpdatedFirst");
        expect(res.body.user.lastname).toBe("UpdatedLast");
        expect(res.body.user.email).toBe("updated@example.com");
        expect(res.body.user.phone).toBe("0509223443");

        // Verify sensitive fields are excluded
        expect(res.body.user).not.toHaveProperty("password");
        expect(res.body.user).not.toHaveProperty("__v");
        expect(res.body.user).not.toHaveProperty("createdAt");
        expect(res.body.user).not.toHaveProperty("updatedAt");

        // Verify the update persisted in the database
        const updatedUser = await User.findById(user.user._id);
        expect(updatedUser.firstname).toBe("UpdatedFirst");
        expect(updatedUser.lastname).toBe("UpdatedLast");
        expect(updatedUser.email).toBe("updated@example.com");
        expect(updatedUser.phone).toBe("0509223443");
    });


    test("Delete own user account => 200", async () => {
        const user = await createAuthenticatedUser();

        const res = await request(app)
            .delete(`/api/users/${user.user._id}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(200);

        expect(res.body.message).toBe("User deleted successfully");

        // Verify the user was actually deleted from the database
        const deletedUser = await User.findById(user.user._id);
        expect(deletedUser).toBeNull();
    });
    ////////////////////  Happy path scenarios //////////////////////////












    ////////////////////  Unappy path scenarios //////////////////////////

    test("Get all users as non-admin => 401", async () => {
        // Create a regular user (non-admin)
        const regularUser = await createAuthenticatedUser();

        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${regularUser.accessToken}`) // Regular user token
            .expect(401);

        expect(res.body.message).toBe("only admin");
    });

    test("Get all users with invalid pagination => uses defaults", async () => {
        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${token}`)
            .query({
                page: "invalid", // Invalid page
                limit: "not-a-number" // Invalid limit
            })
            .expect(200);

        expect(res.body).toHaveProperty("users");
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.users)).toBe(true);
        // Should use default values (page=1, limit=7) when invalid
    });


    test("Get other user's profile => 401", async () => {
        // Create two different users
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test@example.com",
            password: "pas31231",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        const res = await request(app)
            .get(`/api/users/${user2._id}`) // Try to access user2's profile
            .set("Authorization", `Bearer ${user1.accessToken}`) // But using user1's token
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });

    test("Get non-existent user => 404", async () => {
        const user = await createAuthenticatedUser();
        const fakeUserId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist

        const res = await request(app)
            .get(`/api/users/${fakeUserId}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(404);

        expect(res.body.message).toBe("User not found");
    });



    test("Update user with duplicate email => 400", async () => {
        // Create two different users
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test22@example.com",
            password: "pas312313",
            username: "testuser2",
            firstname: "Joon",
            lastname: "Doe",
            phone: "1234547890"
        });

        const res = await request(app)
            .put(`/api/users/${user1.user._id}`)
            .set("Authorization", `Bearer ${user1.accessToken}`)
            .send({
                firstname: "Updated",
                lastname: "User",
                email: "test22@example.com", // Email already used by user2
                phone: "0509223442"
            })
            .expect(400);

        expect(res.body.message).toBe("Email is already in use");
    });

    test("Update other user's profile => 401", async () => {
        // Create two different users
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test22@example.com",
            password: "pas312313",
            username: "testuser2",
            firstname: "Joon",
            lastname: "Doe",
            phone: "1234547890"
        });

        const res = await request(app)
            .put(`/api/users/${user2._id}`) // Try to update user2's profile
            .set("Authorization", `Bearer ${user1.accessToken}`) // But using user1's token
            .send({
                firstname: "Hacked",
                lastname: "User",
                email: "hacked@example.com",
                phone: "9999999999"
            })
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });




    test("Delete other user's account as regular user => 401", async () => {
        // Create two different users
        const user1 = await createAuthenticatedUser();
        const user2 = await User.create({
            email: "test22@example.com",
            password: "pas312313",
            username: "testuser2",
            firstname: "Joon",
            lastname: "Doe",
            phone: "1234547890"
        });

        const res = await request(app)
            .delete(`/api/users/${user2._id}`) // Try to delete user2's account
            .set("Authorization", `Bearer ${user1.accessToken}`) // But using user1's token (regular user)
            .expect(401);

        expect(res.body.message).toBe("Unauthorized");
    });

    test("Delete non-existent user => 404", async () => {
        const user = await createAuthenticatedUser();
        const fakeUserId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist

        const res = await request(app)
            .delete(`/api/users/${fakeUserId}`)
            .set("Authorization", `Bearer ${user.accessToken}`)
            .expect(404);

        expect(res.body.message).toBe("User not found");
    });
    ////////////////////  Unappy path scenarios //////////////////////////


})
