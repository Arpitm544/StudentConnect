# StudentConnect (TaskNest)

StudentConnect is a full-stack web application designed to connect students for task sharing and completion. It features a modern user interface and a robust backend API to handle user authentication, task management, and communication.

## Tech Stack

### Frontend
- **Framework**: React with Vite
- **Styling**: TailwindCSS
- **Routing**: React Router DOM
- **Authentication/Integrations**: Firebase
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Language**: Go
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL (CockroachDB)
- **Authentication**: JWT & Firebase Admin SDK
- **Storage**: AWS S3 (for media/file uploads)
- **Email Delivery**: SMTP
- **Security**: CORS, Bcrypt

---

## Local Setup Instructions

Follow these steps to set up the project locally on your machine.

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Go](https://golang.org/) (v1.25 or higher)
- A PostgreSQL or CockroachDB database instance
- An AWS Account (for S3 storage)
- A Firebase Project (for Auth/Config)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd StudentConnect-main
```

### 2. Backend Setup
The backend runs on Go and requires several environment variables to connect to external services.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Go dependencies:
   ```bash
   go mod tidy
   ```

3. Create a `.env` file in the `backend` directory with the following variables:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key

   # Server Configuration
   PORT=8080

   # SMTP Configuration (for sending emails)
   SMTP_EMAIL=your_support_email@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587

   # AWS S3 Configuration (for file uploads)
   AWS_REGION=your_aws_region
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET=your_s3_bucket_name

   # Firebase Configuration
   FIREBASE_SERVICE_ACCOUNT_JSON=./firebase/your-firebase-adminsdk.json
   ```

4. Add your Firebase service account JSON file to the `backend/firebase/` directory and ensure the path matches the `FIREBASE_SERVICE_ACCOUNT_JSON` variable in your `.env`.

5. Start the backend server:
   ```bash
   go run main.go
   ```
   The backend should now be running on `http://localhost:8080`.

### 3. Frontend Setup
The frontend is a React application powered by Vite.

1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend` directory with your Firebase and API configurations:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Backend API URL (for local development)
   VITE_API_URL=http://localhost:8080
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend should now be running, typically on `http://localhost:5173`. Open this URL in your browser to view the application.

---

## Deployment

For details on how to deploy this application to a production server, please see the [DEPLOYMENT.md](./DEPLOYMENT.md) guide.
