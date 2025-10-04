# 🚘 Car Rental Backend API

This is the backend of the Car Rental Web App. It handles user authentication, car and booking management, and integrates with Moyassar for payments.

## 🛠️ Tech Stack

- Node.js
- Express
- MongoDB (hosted on MongoDB Atlas)
- JWT Authentication (with HTTP-only cookies)
- Cloudinary (for image uploads and storage)
- Moyassar API (for payment processing)
- AWS EC2 (deployment)

## 🔐 Features

- Role-based JWT authentication (user/admin)
- Secure HTTP-only cookie sessions (access + refresh) token
- CRUD for vehicles and reservations
- Cloudinary image upload support
- Moyassar API payment integration
- Error handling with consistent API responses
- Scheduled cron job runs every 5 minutes to delete reservations that are still unpaid and were created more than 1 hour ago
- Environment-based config for production and development

## 🧪 API Routes (Highlights)

- `POST /api/auth/signup` – signup a new user  
- `POST /api/auth/login` – Login and get JWT  
- `GET /api/cars` – List all cars  
- `POST /api/cars` – Add a car (admin only)  
- `POST /api/reservation` – Create a booking  

## 🚀 Getting Started

### 1. Clone the Repo

git clone https://github.com/Abdulwadood0/Car-Rental-Backend.git
cd car-rental-backend


### 2. Install Dependencies

npm install

### 3. Environment Variables

Create a `.env` file in the root and fill in:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MOYASSAR_API_KEY=your_moyassar_key
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
EMAIL_ADDRESS=your_email@example.com
EMAIL_PASSWORD=your_email_password
```

### 4. Run Locally
```
npm start
Runs on `http://localhost:5000`.

```

## 🌐 Deployment Details

The backend is deployed on an **AWS EC2** instance using the following setup:

- **Ubuntu** server on EC2
- SSH access using private key (`.pem`)
- **Node.js** and **npm** installed
- **PM2** used to run the server in the background (`pm2 start server.js`)
- **MongoDB Atlas** as the production database



#### PM2 Setup:

```bash
pm2 start server.js --name "car-rental-api"
pm2 save
```

This ensures the backend stays running after crashes or reboots.



