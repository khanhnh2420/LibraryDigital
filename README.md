# Library Digital Management

Library Digital Management is a **library management web application** that provides a RESTful backend for user authentication and book management, together with a web frontend for interacting with the system.

The project is built around **Node.js, Express.js, MongoDB, React, Redux, and JWT authentication**. It demonstrates a typical client-server architecture with separated API routes, controllers, data models, authentication utilities, and frontend state management.

## Features

### Authentication & Authorization

- User registration.
- User login.
- Password hashing with **bcrypt**.
- JWT-based authentication.
- Access token and refresh token flow.
- Refresh-token persistence.
- User role and account status information.
- Protected API endpoints.

### User Management

The user model supports information such as:

- Username
- Email
- Password hash
- Full name
- Role
- Account status
- Borrowing limit
- Refresh token

### Book Management

The application supports:

- Create books.
- Retrieve books.
- Retrieve a book by ID.
- Update books.
- Delete books.
- Search by ISBN.
- Filter by category.
- Search by author.
- Retrieve available books.
- Retrieve book categories.
- Sort/filter book results.

Book information includes fields such as:

- Title
- Author
- ISBN
- Category
- Description
- Publisher
- Publication date
- Quantity
- Available quantity
- Cover image

## Technology Stack

| Category | Technology |
|---|---|
| Frontend | React |
| State Management | Redux |
| Backend | Node.js |
| Web Framework | Express.js |
| Database | MongoDB |
| Authentication | JWT |
| Password Hashing | bcrypt |
| HTTP Client | Axios |
| API Style | RESTful API |
| Package Manager | npm |
| Version Control | Git / GitHub |

## Architecture

The application follows a client-server architecture:

```text
┌───────────────────────────────┐
│          React Frontend       │
│                               │
│  Components / Pages           │
│  Redux State                  │
│  Axios API Client             │
└───────────────┬───────────────┘
                │ HTTP / REST API
                ▼
┌───────────────────────────────┐
│       Express.js Backend      │
│                               │
│  Routes                       │
│      ↓                        │
│  Controllers                  │
│      ↓                        │
│  Models                       │
│      ↓                        │
│  MongoDB                      │
└───────────────────────────────┘

Authentication:
Client → JWT Access Token → Protected API
                    │
                    └── Refresh Token → New Access Token
```

## Backend Structure

The backend is organized into separate responsibilities:

```text
backend/
├── config/          # Database and application configuration
├── controllers/     # Request handling and business operations
├── middleware/      # Authentication / request middleware
├── models/          # MongoDB data models
├── routes/          # REST API routes
├── utils/           # Authentication and helper utilities
└── server.js        # Application entry point
```

This structure keeps HTTP routing, request handling, database models, and utility logic separated and makes the application easier to maintain.

## Frontend Structure

The React frontend is responsible for presenting the user interface and communicating with the backend API.

Typical responsibilities include:

```text
Frontend
├── Components
├── Pages
├── Redux Store
├── API / Axios
└── Authentication State
```

Redux is used to manage shared client-side application state, while Axios is used for HTTP communication with the backend.

## Authentication Flow

The authentication system uses a short-lived access token together with a refresh token.

```text
                ┌──────────────┐
                │    Login     │
                └──────┬───────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Verify password │
              │    bcrypt       │
              └────────┬────────┘
                       │
                       ▼
             ┌──────────────────┐
             │ Generate JWT     │
             │ Access Token     │
             │ Refresh Token    │
             └────────┬─────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    Access Token             Refresh Token
          │                       │
          ▼                       ▼
  Protected API             Token Refresh
                                  │
                                  ▼
                           New Access Token
```

Passwords are not stored in plaintext. Passwords are hashed using bcrypt before being stored in MongoDB.

## REST API

The backend exposes REST-style endpoints for authentication and book management.

### Authentication

Typical authentication operations include:

```text
POST   /register
POST   /login
POST   /refresh-token
```

### Books

The book API provides operations such as:

```text
GET    /books
GET    /books/:id
POST   /books
PUT    /books/:id
DELETE /books/:id
```

Additional query functionality supports searching/filtering books by:

```text
ISBN
Category
Author
Availability
```

> The exact API prefix may depend on the server/router configuration in the current project.

## MongoDB Data Model

### User

The user entity contains authentication and account-management information.

```text
User
├── username
├── email
├── password
├── fullName
├── role
├── status
├── borrowingLimit
└── refreshToken
```

### Book

The book entity contains information needed for catalog and availability management.

```text
Book
├── title
├── author
├── isbn
├── category
├── description
├── publisher
├── publicationDate
├── quantity
├── availableQuantity
└── coverImage
```

## Query & Filtering

The backend supports several book-query scenarios.

Examples include:

```text
Search by ISBN
Search by author
Filter by category
Find available books
Retrieve categories
Sort book results
```

Author searching is handled in a case-insensitive manner, allowing users to search without depending on exact capitalization.

## Error Handling & Validation

The API handles common application errors such as:

- Missing authentication credentials.
- Invalid login information.
- Duplicate user registration.
- Invalid or expired authentication tokens.
- Missing required book information.
- Book not found.
- Unavailable resources.
- Invalid request parameters.

The backend returns appropriate HTTP responses for unsuccessful operations so that the frontend can handle API errors.

## Installation

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB or a MongoDB Atlas connection
- Git

### Clone the Repository

```bash
git clone https://github.com/khanhnh2420/LibraryDigital.git
cd LibraryDigital
```

### Install Dependencies

Install dependencies for the backend:

```bash
cd backend
npm install
```

If the frontend is provided as a separate application/package, install its dependencies as well:

```bash
cd frontend
npm install
```

## Environment Configuration

Create a `.env` file for environment-specific configuration.

Example:

```env
PORT=5000
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_token_secret>
```

Do not commit real secrets, database credentials, or production tokens to Git.

> Adjust the variable names above to match the environment configuration expected by the current source code.

## Running the Application

### Start Backend

```bash
npm start
```

or, depending on the available npm scripts:

```bash
npm run dev
```

The Express server will start on the configured port.

### Start Frontend

From the frontend directory:

```bash
npm start
```

The React application will start using the configured development server.

## Development Workflow

A typical request flows through the following layers:

```text
React Component
      │
      ▼
Axios API Request
      │
      ▼
Express Route
      │
      ▼
Controller
      │
      ▼
MongoDB Model
      │
      ▼
MongoDB
      │
      ▼
JSON Response
      │
      ▼
Redux / React UI
```

This separation makes the frontend independent from database implementation details and allows the backend API to be consumed by other clients in the future.

## Key Technical Highlights

- Designed and implemented a **RESTful API** using Express.js.
- Implemented **JWT access/refresh token authentication**.
- Applied **bcrypt password hashing** for secure credential storage.
- Designed MongoDB schemas for users and books.
- Implemented CRUD operations for book management.
- Implemented search and filtering using MongoDB queries and aggregation.
- Separated backend responsibilities into routes, controllers, models, middleware, and utilities.
- Integrated a React frontend with the backend through Axios.
- Used Redux for centralized frontend state management.

## Future Improvements

Potential improvements for a production-ready version include:

- Add comprehensive automated tests.
- Introduce request schema validation.
- Implement more granular role-based access control.
- Add rate limiting and security headers.
- Move all secrets and configuration to environment variables.
- Add centralized error-handling middleware.
- Add pagination for large book collections.
- Add borrowing/return transaction management.
- Add borrowing history and overdue-book management.
- Add audit logging for administrative operations.
- Add Docker and CI/CD configuration.
- Improve refresh-token rotation and token revocation.

## License

This project was developed for educational purposes.

