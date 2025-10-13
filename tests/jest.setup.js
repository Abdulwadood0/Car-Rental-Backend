const mongoose = require('mongoose');
const { MongoMemoryServer } = require("mongodb-memory-server");
let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: "Mocked response" } }]
                })
            }
        }
    }));
});

jest.mock('../services/openAiService', () => ({
    askQuestion: jest.fn().mockResolvedValue("Mocked AI response"),
}));
