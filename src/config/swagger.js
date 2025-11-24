const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MediNet API',
            version: '1.0.0',
            description: 'A comprehensive Doctor Referral & Health Record Management System API',
            contact: {
                name: 'MediNet Support',
                email: 'support@medinet.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://medinet-backend.onrender.com/api'
                    : 'http://localhost:5000/api',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'email', 'password', 'role'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'User ID',
                            example: '60f7b3b3b3b3b3b3b3b3b3b3',
                        },
                        firstName: {
                            type: 'string',
                            description: 'User first name',
                            example: 'John',
                            minLength: 2,
                            maxLength: 50,
                        },
                        lastName: {
                            type: 'string',
                            description: 'User last name',
                            example: 'Doe',
                            minLength: 2,
                            maxLength: 50,
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                            example: 'john.doe@example.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['super_admin', 'hospital_admin', 'doctor', 'patient'],
                            description: 'User role',
                            example: 'patient',
                        },
                        phone: {
                            type: 'string',
                            description: 'User phone number',
                            example: '+1234567890',
                        },
                        dateOfBirth: {
                            type: 'string',
                            format: 'date',
                            description: 'User date of birth',
                            example: '1990-01-01',
                        },
                        gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            description: 'User gender',
                            example: 'male',
                        },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string', example: '123 Main St' },
                                city: { type: 'string', example: 'New York' },
                                state: { type: 'string', example: 'NY' },
                                zipCode: { type: 'string', example: '10001' },
                                country: { type: 'string', example: 'USA' },
                            },
                        },
                        isActive: {
                            type: 'boolean',
                            description: 'User active status',
                            example: true,
                        },
                        isEmailVerified: {
                            type: 'boolean',
                            description: 'Email verification status',
                            example: false,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User creation date',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User last update date',
                        },
                    },
                },
                LoginCredentials: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                            example: 'john.doe@example.com',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                            example: 'password123',
                            minLength: 6,
                        },
                    },
                },
                RegisterData: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'email', 'password', 'role'],
                    properties: {
                        firstName: {
                            type: 'string',
                            description: 'User first name',
                            example: 'John',
                            minLength: 2,
                            maxLength: 50,
                        },
                        lastName: {
                            type: 'string',
                            description: 'User last name',
                            example: 'Doe',
                            minLength: 2,
                            maxLength: 50,
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                            example: 'john.doe@example.com',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                            example: 'password123',
                            minLength: 6,
                        },
                        confirmPassword: {
                            type: 'string',
                            description: 'Password confirmation',
                            example: 'password123',
                        },
                        role: {
                            type: 'string',
                            enum: ['super_admin', 'hospital_admin', 'doctor', 'patient'],
                            description: 'User role',
                            example: 'patient',
                        },
                        phone: {
                            type: 'string',
                            description: 'User phone number',
                            example: '+1234567890',
                        },
                        dateOfBirth: {
                            type: 'string',
                            format: 'date',
                            description: 'User date of birth',
                            example: '1990-01-01',
                        },
                        gender: {
                            type: 'string',
                            enum: ['male', 'female', 'other'],
                            description: 'User gender',
                            example: 'male',
                        },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string', example: '123 Main St' },
                                city: { type: 'string', example: 'New York' },
                                state: { type: 'string', example: 'NY' },
                                zipCode: { type: 'string', example: '10001' },
                                country: { type: 'string', example: 'USA' },
                            },
                        },
                        hospitalId: {
                            type: 'string',
                            description: 'Hospital ID (required for hospital_admin and doctor roles)',
                            example: '60f7b3b3b3b3b3b3b3b3b3b3',
                        },
                        licenseNumber: {
                            type: 'string',
                            description: 'Medical license number (required for doctor role)',
                            example: 'MD12345',
                        },
                        specialization: {
                            type: 'string',
                            description: 'Medical specialization (required for doctor role)',
                            example: 'Cardiology',
                        },
                        yearsOfExperience: {
                            type: 'number',
                            description: 'Years of experience (required for doctor role)',
                            example: 5,
                            minimum: 0,
                            maximum: 50,
                        },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Request success status',
                            example: true,
                        },
                        message: {
                            type: 'string',
                            description: 'Response message',
                            example: 'User registered successfully',
                        },
                        token: {
                            type: 'string',
                            description: 'JWT token',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                    },
                },
                Hospital: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Hospital ID',
                            example: '60f7b3b3b3b3b3b3b3b3b3b3',
                        },
                        name: {
                            type: 'string',
                            description: 'Hospital name',
                            example: 'City General Hospital',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Hospital email',
                            example: 'info@citygeneral.com',
                        },
                        phone: {
                            type: 'string',
                            description: 'Hospital phone number',
                            example: '+1234567890',
                        },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string', example: '123 Medical St' },
                                city: { type: 'string', example: 'New York' },
                                state: { type: 'string', example: 'NY' },
                                zipCode: { type: 'string', example: '10001' },
                                country: { type: 'string', example: 'USA' },
                            },
                        },
                        type: {
                            type: 'string',
                            enum: ['public', 'private', 'non-profit', 'government'],
                            description: 'Hospital type',
                            example: 'public',
                        },
                        specialties: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Medical specialties offered',
                            example: ['Cardiology', 'Neurology', 'Emergency Medicine'],
                        },
                        capacity: {
                            type: 'object',
                            properties: {
                                beds: { type: 'integer', example: 200 },
                                icuBeds: { type: 'integer', example: 20 },
                                emergencyBeds: { type: 'integer', example: 15 },
                            },
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'approved', 'rejected', 'suspended'],
                            description: 'Hospital approval status',
                            example: 'pending',
                        },
                        isActive: {
                            type: 'boolean',
                            description: 'Hospital active status',
                            example: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Hospital creation date',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Hospital last update date',
                        },
                    },
                },
                HospitalRegistration: {
                    type: 'object',
                    required: ['name', 'email', 'phone', 'address', 'type', 'capacity'],
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Hospital name',
                            example: 'City General Hospital',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Hospital email',
                            example: 'info@citygeneral.com',
                        },
                        phone: {
                            type: 'string',
                            description: 'Hospital phone number',
                            example: '+1234567890',
                        },
                        address: {
                            type: 'object',
                            required: ['street', 'city', 'state', 'zipCode'],
                            properties: {
                                street: { type: 'string', example: '123 Medical St' },
                                city: { type: 'string', example: 'New York' },
                                state: { type: 'string', example: 'NY' },
                                zipCode: { type: 'string', example: '10001' },
                                country: { type: 'string', example: 'USA' },
                            },
                        },
                        type: {
                            type: 'string',
                            enum: ['public', 'private', 'non-profit', 'government'],
                            description: 'Hospital type',
                            example: 'public',
                        },
                        specialties: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Medical specialties offered',
                            example: ['Cardiology', 'Neurology'],
                        },
                        capacity: {
                            type: 'object',
                            required: ['beds'],
                            properties: {
                                beds: { type: 'integer', example: 200 },
                                icuBeds: { type: 'integer', example: 20 },
                                emergencyBeds: { type: 'integer', example: 15 },
                            },
                        },
                        services: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Services offered',
                            example: ['Emergency Care', 'Surgery', 'Radiology'],
                        },
                        website: {
                            type: 'string',
                            format: 'uri',
                            description: 'Hospital website',
                            example: 'https://citygeneral.com',
                        },
                        description: {
                            type: 'string',
                            description: 'Hospital description',
                            example: 'A leading medical facility providing comprehensive healthcare services.',
                        },
                    },
                },
                HospitalUpdate: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Hospital name',
                            example: 'City General Hospital',
                        },
                        phone: {
                            type: 'string',
                            description: 'Hospital phone number',
                            example: '+1234567890',
                        },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string', example: '123 Medical St' },
                                city: { type: 'string', example: 'New York' },
                                state: { type: 'string', example: 'NY' },
                                zipCode: { type: 'string', example: '10001' },
                                country: { type: 'string', example: 'USA' },
                            },
                        },
                        specialties: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Medical specialties offered',
                            example: ['Cardiology', 'Neurology'],
                        },
                        capacity: {
                            type: 'object',
                            properties: {
                                beds: { type: 'integer', example: 200 },
                                icuBeds: { type: 'integer', example: 20 },
                                emergencyBeds: { type: 'integer', example: 15 },
                            },
                        },
                        services: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Services offered',
                            example: ['Emergency Care', 'Surgery'],
                        },
                        website: {
                            type: 'string',
                            format: 'uri',
                            description: 'Hospital website',
                            example: 'https://citygeneral.com',
                        },
                        description: {
                            type: 'string',
                            description: 'Hospital description',
                            example: 'A leading medical facility.',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Request success status',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            description: 'Error message',
                            example: 'Validation failed',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string', example: 'email' },
                                    message: { type: 'string', example: 'Email is required' },
                                    value: { type: 'string', example: '' },
                                },
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
