const request = require("supertest");
const app = require("../../app");
const agent = request.agent(app);
const { User } = require("../../models/User")

const userSignup = {
    firstname: "test",
    lastname: "test",
    username: "Testing1",
    phone: "0509223442",
    email: "test@gmail.com",
    password: "123456",
}
const userLogin = {
    usernameOrEmail: userSignup.email,
    password: userSignup.password
}

async function insertUserToDB() {
    await request(app)
        .post("/api/auth/signup")
        .send(userSignup);

}


async function loginUser() {
    const res = await agent
        .post("/api/auth/login")
        .send(userLogin);

    return res
}

async function createAuthenticatedUser() {
    await insertUserToDB()
    const loggedIn = await loginUser()

    return loggedIn.body
}


async function createAdminUser() {
    await insertUserToDB()

    const res = await agent
        .post("/api/auth/login")
        .send(userLogin);

    await User.findByIdAndUpdate(res.body.user._id, { isAdmin: true });
    const res2 = await agent
        .post("/api/auth/login")
        .send(userLogin);

    return res2.body.accessToken

}

module.exports = {
    agent,
    userSignup,
    userLogin,
    loginUser,
    insertUserToDB,
    createAuthenticatedUser,
    createAdminUser
}