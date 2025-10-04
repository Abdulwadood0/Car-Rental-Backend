const request = require("supertest")
const app = require("../../app")
const { agent, loginUser, insertUserToDB, createAuthenticatedUser, userLogin, userSignup } = require("../helpers/authHelper")

describe("auth routes", () => {


    ////////////////////  Happy path scenarios //////////////////////////

    test("Post auth signup => 201", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                ...userSignup,
                email: "unique@test.com",   // make unique so it doesn’t conflict
                username: "Testing2"
            });

        expect(res.statusCode).toBe(201);

    })


    test("Post auth Login => 200", async () => {

        await insertUserToDB()

        const res = await request(app)
            .post("/api/auth/login")
            .send(userLogin);

        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.startsWith("refreshToken="))).toBe(true);


        expect(res.body).toHaveProperty("accessToken");
        expect(res.body).toHaveProperty("user");
        expect(res.statusCode).toBe(200);

        expect(res.body.user).toMatchObject({
            _id: res.body.user._id,
            username: userSignup.username,
            email: userSignup.email,
            firstname: userSignup.firstname,
            lastname: userSignup.lastname,
            phone: userSignup.phone,
            isAdmin: res.body.user.isAdmin
        });
    });

    test("Post auth Refresh token => 200", async () => {

        await insertUserToDB()
        await loginUser()

        const res = await agent
            .post("/api/auth/refresh")


        expect(res.body).toHaveProperty("accessToken");
        expect(res.statusCode).toBe(200)

    })


    test("Get current logged-in user's info => 200", async () => {


        const token = await createAuthenticatedUser()


        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token.accessToken}`); // <-- pass token in header


        expect(res.body).toMatchObject({
            _id: res.body._id,
            username: userSignup.username,
            email: userSignup.email,
            firstname: userSignup.firstname,
            lastname: userSignup.lastname,
            phone: userSignup.phone,
            isAdmin: res.body.isAdmin
        });
        expect(res.statusCode).toBe(200)

    })
    ////////////////////  Happy path scenarios //////////////////////////


    /////////////////////////////////////////////////////////////////////////////////////////////////////


    ////////////////////  Uhappy path scenarios //////////////////////////
    test("Post auth signup with duplicate email => 400", async () => {
        const res1 = await request(app)
            .post("/api/auth/signup")
            .send({
                ...userSignup,

            });

        const res2 = await request(app)
            .post("/api/auth/signup")
            .send({
                ...userSignup,

            });

        expect(res2.statusCode).toBe(400);
        expect(res2.body).toHaveProperty("message");
        expect(res2.body.message).toBe("User already exists");

    })



    test("Post auth signup with missing fields => 400", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message");

    })

    test("Post auth Login with non-existent user => 404", async () => {

        const res = await request(app)
            .post("/api/auth/login")
            .send(userLogin);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Password or username is incorrect");


    });


    test("Post auth Refresh token without providing refreshToken => 401", async () => {

        await insertUserToDB()
        await loginUser()
        const res = await request(app)
            .post("/api/auth/refresh")


        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("No refresh token provided");

        expect(res.statusCode).toBe(401)

    })


    test("Post auth Refresh token with worng refreshToken => 403", async () => {

        await insertUserToDB()
        await loginUser()
        const res = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", [
                "refreshToken=fhjdhbgyufabhdgyarohgqr9e78fuyerafghadfsu7gfhae78Hf34"
            ]);

        expect(res.body).toHaveProperty("message");
        expect(res.body.message).toBe("Invalid or expired refresh token");

        expect(res.statusCode).toBe(403)

    })
    ////////////////////  Uhappy path scenarios //////////////////////////

})