const request = require("supertest")
const app = require("../../app")
const { User } = require("../../models/User")
const { VerificationToken } = require("../../models/VerificationToken")
const bcrypt = require('bcrypt');



// Mock the sendEmail function at the top of your test file
jest.mock("../../services/emailService", () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));

const { sendEmail } = require("../../services/emailService");



describe("Password routes", () => {
    ////////////////////  Happy path scenarios //////////////////////////
    beforeEach(async () => {
        // Clear users and tokens before each test
        await User.deleteMany({});
        await VerificationToken.deleteMany({});
        jest.clearAllMocks(); // Clear mock call history
    });


    test("Send reset password link with valid email => 200", async () => {
        // Create a test user first
        const user = await User.create({
            email: "test@example.com",
            password: "password123",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        const res = await request(app)
            .post("/api/password/reset-password-link")
            .send({
                email: "test@example.com"
            })
            .expect(200);

        expect(res.body.message).toBe("Password reset link sent successfully, check your email");

        // Verify that a verification token was created/updated
        const verificationToken = await VerificationToken.findOne({ userId: user._id });
        expect(verificationToken).toBeTruthy();
        expect(verificationToken.token).toBeDefined();

        // Verify that sendEmail was called with the correct parameters
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(sendEmail).toHaveBeenCalledWith(
            "test@example.com",
            "Password Reset Request",
            expect.stringContaining("Reset Password") // Check that HTML contains the reset button
        );
    });

    test("Verify password reset link with valid user and token => 200", async () => {
        // Create a test user first
        const user = await User.create({
            email: "test@example.com",
            password: "password123",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        // Create a verification token for the user
        const verificationToken = await VerificationToken.create({
            userId: user._id,
            token: "valid-token-123"
        });

        const res = await request(app)
            .get(`/api/password/reset-password/${user._id}/${verificationToken.token}`)
            .expect(200);

        expect(res.body.message).toBe("Verification successful");
    });

    test("Reset password with valid data => 200", async () => {
        // Create a test user first
        const user = await User.create({
            email: "test@example.com",
            password: "oldPassword123", // Old password
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        // Create a verification token for the user
        const verificationToken = await VerificationToken.create({
            userId: user._id,
            token: "valid-token-123"
        });

        const newPassword = "newSecurePassword123";

        const res = await request(app)
            .put(`/api/password/reset-password/${user._id}/${verificationToken.token}`)
            .send({
                password: newPassword
            })
            .expect(200);

        expect(res.body.message).toBe("Password reset successfully");

        // Verify that the password was actually updated
        const updatedUser = await User.findById(user._id);
        const isPasswordUpdated = await bcrypt.compare(newPassword, updatedUser.password);
        expect(isPasswordUpdated).toBe(true);

        // Verify that the verification token was deleted
        const deletedToken = await VerificationToken.findOne({ userId: user._id });
        expect(deletedToken).toBeNull();
    });

    ////////////////////  Happy path scenarios //////////////////////////





    ////////////////////  Uhappy path scenarios //////////////////////////

    test("Send reset password link with invalid email format => 400", async () => {
        const res = await request(app)
            .post("/api/password/reset-password-link")
            .send({
                email: "invalid-email-format"
            })
            .expect(400);

        expect(res.body).toHaveProperty("message");
    });

    test("Send reset password link with non-existent email => 404", async () => {
        const res = await request(app)
            .post("/api/password/reset-password-link")
            .send({
                email: "definitely-does-not-exist@example.com"
            })
            .expect(404);

        expect(res.body.message).toBe("No account associated with this email");

        expect(sendEmail).not.toHaveBeenCalled();
    });




    test("Verify password reset link with non-existent user => 404", async () => {
        const fakeUserId = "64f2c1f1c2a1f1a1f1a1f1a2"; // Valid format but doesn't exist
        const fakeToken = "some-token";

        const res = await request(app)
            .get(`/api/password/reset-password/${fakeUserId}/${fakeToken}`)
            .expect(404);

        expect(res.body.message).toBe("User not found");
    });

    test("Verify password reset link with invalid token => 404", async () => {
        // Create a test user
        const user = await User.create({
            email: "test@example.com",
            password: "password123",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        // Create a verification token for the user
        await VerificationToken.create({
            userId: user._id,
            token: "correct-token-123"
        });

        const res = await request(app)
            .get(`/api/password/reset-password/${user._id}/wrong-token-456`) // Wrong token
            .expect(404);

        expect(res.body.message).toBe("Verification token not found");
    });



    test("Reset password with invalid password format => 400", async () => {
        // Create a test user and token
        const user = await User.create({
            email: "test@example.com",
            password: "oldPassword123",
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        const verificationToken = await VerificationToken.create({
            userId: user._id,
            token: "valid-token-123"
        });

        const res = await request(app)
            .put(`/api/password/reset-password/${user._id}/${verificationToken.token}`)
            .send({
                password: "123" // Invalid password (too short or doesn't meet requirements)
            })
            .expect(400);

        expect(res.body).toHaveProperty("message");
        // The specific message depends on your validateNewPassword function
    });

    test("Reset password with invalid token => 404", async () => {
        // Create a test user with a known hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("oldPassword123", salt);

        const user = await User.create({
            email: "test@example.com",
            password: hashedPassword, // Use pre-hashed password
            username: "testuser",
            firstname: "John",
            lastname: "Doe",
            phone: "1234567890"
        });

        // Create a verification token for the user
        await VerificationToken.create({
            userId: user._id,
            token: "correct-token-123"
        });

        const res = await request(app)
            .put(`/api/password/reset-password/${user._id}/wrong-token-456`)
            .send({
                password: "newValidPassword123"
            })
            .expect(404);

        expect(res.body.message).toBe("Verification token not found");

        // Verify that the password was NOT updated
        const unchangedUser = await User.findById(user._id);
        const isPasswordUnchanged = await bcrypt.compare("oldPassword123", unchangedUser.password);
        expect(isPasswordUnchanged).toBe(true);
    });



    ////////////////////  Uhappy path scenarios //////////////////////////


})
