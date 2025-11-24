# MediNet Backend

A robust Node.js backend API for the MediNet healthcare management platform. Built with Express.js, MongoDB, and JWT authentication, featuring a comprehensive approval workflow system for hospitals and doctors.

## 🚀 Features

### Core Features

- **RESTful API**: Complete REST API with Swagger documentation
- **Authentication & Authorization**: JWT-based secure authentication
- **Approval Workflow**: Multi-level approval system for hospitals and doctors
- **Role-Based Access Control**: Granular permissions for different user types
- **Email Notifications**: Automated email system for approvals
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: Password hashing, CORS protection, and security headers

### User Management

- **User Registration**: Multi-role user registration with validation
- **Login System**: Secure JWT-based authentication
- **Profile Management**: User profile updates and management
- **Password Management**: Secure password reset and change functionality

### Approval System

- **Hospital Approval**: Super Admin approves hospital registrations
- **Doctor Approval**: Hospital Admin approves doctor registrations
- **Status Tracking**: Real-time approval status management
- **Email Notifications**: Automated approval/rejection emails

### API Features

- **Swagger Documentation**: Interactive API documentation
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: API rate limiting for security
- **CORS Support**: Cross-origin resource sharing configuration

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Express Validator** - Input validation
- **Swagger** - API documentation
- **Cors** - Cross-origin resource sharing

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/DaniyalAlam09/medinet-backend.git
   cd medinet-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Update the environment variables in `.env`:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/medinet
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7
   FRONTEND_URL=http://localhost:5173
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Render (Recommended)

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
src/
├── config/             # Configuration files
│   ├── database.js     # MongoDB connection
│   ├── email.js        # Email configuration
│   └── swagger.js      # Swagger documentation
├── controllers/        # Route controllers
│   ├── authController.js
│   ├── approvalController.js
│   └── hospitalController.js
├── middleware/         # Custom middleware
│   ├── auth.js         # Authentication middleware
│   ├── approval.js     # Approval workflow middleware
│   └── validation.js   # Input validation
├── models/             # Database models
│   ├── User.js         # User model
│   └── Hospital.js     # Hospital model
├── routes/             # API routes
│   ├── auth.js         # Authentication routes
│   ├── approval.js     # Approval routes
│   └── hospitals.js    # Hospital routes
├── utils/              # Utility functions
└── server.js           # Main server file
```

## 🔐 Authentication & Authorization

### JWT Authentication

- Secure token-based authentication
- Configurable token expiration
- Refresh token support
- Token validation middleware

### Role-Based Access Control

- **Super Admin**: Full system access
- **Hospital Admin**: Hospital and doctor management
- **Doctor**: Patient care and appointments
- **Patient**: Personal health records

### Approval Workflow

1. **Hospital Registration**:

   - Hospital registers → Status: `pending`
   - Super Admin reviews and approves
   - Hospital Admin gets approved automatically

2. **Doctor Registration**:
   - Doctor registers → Status: `pending`
   - Hospital Admin reviews and approves
   - Doctor gains access to system

## 📚 API Documentation

### Swagger UI

Access the interactive API documentation at:

```
http://localhost:5000/api-docs
```

### Key Endpoints

#### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

#### Approval System

- `GET /api/approval/pending-users` - Get pending users
- `POST /api/approval/approve-user/:id` - Approve user
- `POST /api/approval/reject-user/:id` - Reject user
- `GET /api/approval/pending-hospitals` - Get pending hospitals
- `POST /api/approval/approve-hospital/:id` - Approve hospital

#### Hospitals

- `POST /api/hospitals` - Create hospital
- `GET /api/hospitals` - Get all hospitals
- `GET /api/hospitals/approved` - Get approved hospitals
- `GET /api/hospitals/:id` - Get hospital by ID

## 🗄️ Database Schema

### User Model

```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['super_admin', 'hospital_admin', 'doctor', 'patient'],
  phone: String,
  dateOfBirth: Date,
  gender: Enum ['male', 'female', 'other'],
  address: Object,
  approvalStatus: Enum ['pending', 'approved', 'rejected'],
  hospitalId: ObjectId (for doctors),
  // Role-specific fields...
}
```

### Hospital Model

```javascript
{
  name: String (unique),
  email: String (unique),
  phone: String,
  address: Object,
  type: Enum ['public', 'private', 'non-profit', 'government'],
  specialties: [String],
  capacity: Object,
  status: Enum ['pending', 'approved', 'rejected', 'suspended'],
  isActive: Boolean
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run build` - Build the application
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRE` - JWT expiration time
- `FRONTEND_URL` - Frontend URL for CORS
- `EMAIL_*` - Email service configuration

### Database Configuration

- MongoDB connection with Mongoose
- Connection pooling
- Error handling and reconnection
- Index optimization

## 🛡️ Security Features

### Authentication Security

- JWT token-based authentication
- Password hashing with bcrypt
- Secure cookie configuration
- Token expiration handling

### API Security

- CORS protection
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Data Security

- Environment variable protection
- Secure password storage
- Data encryption in transit
- Access control and permissions

## 📊 Monitoring & Logging

### Logging

- Request/response logging
- Error logging and tracking
- Performance monitoring
- Security event logging

### Health Checks

- Database connection status
- API endpoint health
- Service availability
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@medinet.com or create an issue in the repository.

## 🔄 Version History

- **v1.0.0** - Initial release with approval workflow
- **v0.9.0** - Beta release with basic functionality
- **v0.8.0** - Alpha release with core features

---

**MediNet Backend** - Powering healthcare management through robust APIs and secure authentication.
