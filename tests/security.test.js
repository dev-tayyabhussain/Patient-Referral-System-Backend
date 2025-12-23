const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');

// Mock mongoose to avoid real DB connection
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    const mockSchema = function (definition, options) {
        this.definition = definition;
        this.options = options;
        this.index = jest.fn();
        this.pre = jest.fn();
        this.post = jest.fn();
        this.methods = {};
        this.statics = {};
        this.virtual = jest.fn().mockReturnThis();
        this.get = jest.fn();
    };
    mockSchema.Types = actualMongoose.Schema.Types;

    return {
        connect: jest.fn().mockResolvedValue({
            connection: { host: 'localhost' }
        }),
        Schema: mockSchema,
        model: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(null),
            findById: jest.fn().mockReturnThis(),
            create: jest.fn().mockReturnThis(),
            findByIdAndUpdate: jest.fn().mockReturnThis(),
            countDocuments: jest.fn().mockResolvedValue(0),
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null),
            lean: jest.fn().mockReturnThis(),
            save: jest.fn().mockResolvedValue({}),
        }),
        Types: actualMongoose.Types
    };
});

// Mock email config
jest.mock('../src/config/email', () => ({
    sendEmail: jest.fn().mockResolvedValue({})
}));

describe('Security Integration Tests', () => {
    beforeAll(async () => {
        // Any setup if needed
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    describe('Rate Limiting', () => {
        it('should have rate limiting configured for auth routes', async () => {
            // We can't easily test the internal state of the rate limiter without hitting it many times
            // But we can check if the response headers contain rate limit info if enabled
            const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password' });
            // The standard headers are used since standardHeaders: true is set
            expect(res.headers).toHaveProperty('ratelimit-limit');
        });
    });

    describe('Information Disclosure', () => {
        it('should return a generic message for forgot password even if user is not found', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('If a user with that email exists, a password reset link has been sent');
        });

        it('should not include the sensitive "value" field in validation error responses', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ firstName: 'J', email: 'invalid-email' }); // Trigger validation errors

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed');

            // Check that none of the errors contain the "value" field
            if (res.body.errors) {
                res.body.errors.forEach(error => {
                    expect(error).not.toHaveProperty('value');
                });
            }
        });
    });

    describe('Payload Limits', () => {
        it('should reject payloads larger than 1MB', async () => {
            // Create a large string (> 1MB)
            const largeString = 'a'.repeat(1.1 * 1024 * 1024);
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: largeString });

            expect(res.status).toBe(413); // Payload Too Large
        });
    });
});
