# 🔐 MediNet Backend API Documentation

## Authentication Endpoints

### Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://medinet-backend.onrender.com/api`

---

## 🔑 Authentication API

### 1. Register User

**POST** `/api/auth/register`

Register a new user in the system.

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "patient",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "hospitalId": "60f7b3b3b3b3b3b3b3b3b3b3", // Required for hospital_admin and doctor
  "licenseNumber": "MD123456", // Required for doctor
  "specialization": "Cardiology", // Required for doctor
  "yearsOfExperience": 5 // Required for doctor
}
```

#### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "patient",
    "isActive": true,
    "isEmailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Validation Rules

- **firstName**: Required, 2-50 characters
- **lastName**: Required, 2-50 characters
- **email**: Required, valid email format
- **password**: Required, min 6 characters, must contain uppercase, lowercase, and number
- **confirmPassword**: Must match password
- **role**: Required, one of: `super_admin`, `hospital_admin`, `doctor`, `patient`
- **phone**: Optional, valid phone number
- **gender**: Optional, one of: `male`, `female`, `other`
- **dateOfBirth**: Optional, valid ISO date
- **hospitalId**: Required for `hospital_admin` and `doctor` roles
- **licenseNumber**: Required for `doctor` role, 5-20 characters
- **specialization**: Required for `doctor` role, 2-100 characters
- **yearsOfExperience**: Required for `doctor` role, 0-50 years

---

### 2. Login User

**POST** `/api/auth/login`

Authenticate user and return JWT token.

#### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

#### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "patient",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3. Get Current User

**GET** `/api/auth/me`

Get current authenticated user's information.

#### Headers

```
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "patient",
    "isActive": true,
    "isEmailVerified": false
  }
}
```

---

### 4. Logout User

**POST** `/api/auth/logout`

Logout user and clear JWT token.

#### Headers

```
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Forgot Password

**POST** `/api/auth/forgot-password`

Send password reset email to user.

#### Request Body

```json
{
  "email": "john.doe@example.com"
}
```

#### Response

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### 6. Reset Password

**POST** `/api/auth/reset-password/:token`

Reset user password using reset token.

#### Request Body

```json
{
  "password": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

#### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

---

### 7. Verify Email

**GET** `/api/auth/verify-email/:token`

Verify user's email address.

#### Response

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 8. Update Profile

**PUT** `/api/auth/profile`

Update user profile information.

#### Headers

```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "profileImage": "https://cloudinary.com/image.jpg"
}
```

#### Response

```json
{
  "success": true,
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }
}
```

---

### 9. Change Password

**PUT** `/api/auth/change-password`

Change user's password.

#### Headers

```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "currentPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

#### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

---

## 🔒 Authentication Middleware

### Protect Routes

Use `protect` middleware to protect routes that require authentication:

```javascript
const { protect } = require("../middleware/auth");

router.get("/protected-route", protect, (req, res) => {
  // req.user contains the authenticated user
  res.json({ user: req.user });
});
```

### Role-based Access

Use `authorize` middleware to restrict access by role:

```javascript
const { protect, authorize } = require("../middleware/auth");

// Only super_admin and hospital_admin can access
router.get(
  "/admin-route",
  protect,
  authorize("super_admin", "hospital_admin"),
  (req, res) => {
    res.json({ message: "Admin only route" });
  }
);
```

### Email Verification Required

Use `requireEmailVerification` middleware for features requiring verified email:

```javascript
const { protect, requireEmailVerification } = require("../middleware/auth");

router.get(
  "/verified-feature",
  protect,
  requireEmailVerification,
  (req, res) => {
    res.json({ message: "Verified user feature" });
  }
);
```

---

## 🚨 Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "message": "User role patient is not authorized to access this route"
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Server error during registration",
  "error": "Detailed error message (development only)"
}
```

---

## 🔧 Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM=noreply@medinet.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

---

## 🧪 Testing the API

### Using cURL

#### Register a new user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test123",
    "confirmPassword": "Test123",
    "role": "patient"
  }'
```

#### Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123"
  }'
```

#### Get current user:

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 Notes

1. **Password Requirements**: Passwords must be at least 6 characters and contain at least one uppercase letter, one lowercase letter, and one number.

2. **JWT Tokens**: Tokens are returned in both the response body and as HTTP-only cookies for security.

3. **Email Verification**: Users receive a verification email upon registration. Some features may require email verification.

4. **Role-based Access**: Different user roles have different permissions and required fields.

5. **Security**: All passwords are hashed using bcrypt with a salt rounds of 12.

6. **Rate Limiting**: Consider implementing rate limiting for production use.

7. **CORS**: Configure CORS properly for your frontend domain.

---

**Built with ❤️ for better healthcare** 🏥
