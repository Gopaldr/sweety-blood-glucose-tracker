\# Sweety – Blood Glucose Tracker



A full-stack blood glucose tracking application built using React, Node.js, Express, and PostgreSQL.



\## Features



\### Authentication

\- User registration and login

\- Password hashing using bcrypt

\- JWT-based authentication

\- Protected API routes



\### Glucose Reading Management

\- Add, view, update, and delete glucose readings

\- Four daily time slots:

&#x20; - Morning (fasting)

&#x20; - After breakfast

&#x20; - After lunch

&#x20; - After dinner

\- Glucose values restricted to whole numbers between 40 and 600 mg/dl

\- One reading per time slot per day

\- Maximum of four readings per day

\- Future-date validation

\- User-specific reading access



\### Reports

\- Daily report

\- Month-to-date report

\- Previous-month report

\- Highest, lowest, average, and total reading statistics

\- Daily breakdown for monthly reports

\- Empty-state messages when no readings exist



\## Technology Stack



| Layer | Technology |

|---|---|

| Frontend | React, Vite |

| Routing | React Router |

| API requests | Axios |

| Backend | Node.js, Express |

| Database | PostgreSQL |

| Authentication | JWT |

| Password security | bcrypt |

| Development | Nodemon |



\## Project Structure



sweety-blood-glucose-tracker/

│

├── client/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   │   ├── Login.jsx

│   │   │   ├── Register.jsx

│   │   │   ├── Dashboard.jsx

│   │   │   └── Reports.jsx

│   │   ├── services/

│   │   │   └── api.js

│   │   ├── App.jsx

│   │   ├── main.jsx

│   │   └── index.css

│   ├── .env.example

│   └── package.json

│

├── server/

│   ├── config/

│   │   └── db.js

│   ├── controllers/

│   │   ├── authController.js

│   │   ├── readingController.js

│   │   └── reportController.js

│   ├── middleware/

│   │   └── authMiddleware.js

│   ├── routes/

│   │   ├── authRoutes.js

│   │   ├── readingRoutes.js

│   │   └── reportRoutes.js

│   ├── scripts/

│   │   └── seed.js

│   ├── .env.example

│   ├── app.js

│   └── server.js

│

├── .gitignore

└── README.md





\## Prerequisites



Install the following:



\- Node.js and npm

\- PostgreSQL

\- Git



\## Installation and Setup



\### 1. Clone the repository





git clone https://github.com/YOUR\_USERNAME/sweety-blood-glucose-tracker.git

cd sweety-blood-glucose-tracker





\### 2. Create the PostgreSQL database



Open PostgreSQL and execute:





CREATE DATABASE sweety\_db;





Connect to `sweety\_db` and create the tables:





CREATE TABLE users (

&#x20;   id SERIAL PRIMARY KEY,

&#x20;   name VARCHAR(100) NOT NULL,

&#x20;   email VARCHAR(255) UNIQUE NOT NULL,

&#x20;   password\_hash TEXT NOT NULL,

&#x20;   created\_at TIMESTAMPTZ DEFAULT NOW()

);



CREATE TABLE readings (

&#x20;   id SERIAL PRIMARY KEY,

&#x20;   user\_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20;   reading\_date DATE NOT NULL,

&#x20;   time\_slot VARCHAR(30) NOT NULL

&#x20;       CHECK (time\_slot IN (

&#x20;           'Morning (fasting)',

&#x20;           'After breakfast',

&#x20;           'After lunch',

&#x20;           'After dinner'

&#x20;       )),

&#x20;   glucose\_value INTEGER NOT NULL

&#x20;       CHECK (glucose\_value BETWEEN 40 AND 600),

&#x20;   created\_at TIMESTAMPTZ DEFAULT NOW(),

&#x20;   updated\_at TIMESTAMPTZ DEFAULT NOW(),

&#x20;   UNIQUE (user\_id, reading\_date, time\_slot)

);



CREATE INDEX idx\_readings\_user\_date

ON readings(user\_id, reading\_date);





\### 3. Configure the backend



Copy `server/.env.example` to `server/.env`.



Update the PostgreSQL password and generate a secure JWT secret.



Install backend dependencies:





cd server

npm install





Start the backend:





npm run dev



Backend URL:



`http://localhost:5000`



Health check:



`http://localhost:5000/api/health`



\### 4. Configure the frontend



Open another terminal:





cd client





Copy `client/.env.example` to `client/.env`.



Install frontend dependencies:





npm install





Start the frontend:





npm run dev





Frontend URL:



`http://localhost:5173`



\### 5. Seed demo data



From the server directory:





npm run seed





Demo account:



\- Email: `demo@sweety.com`

\- Password: `SweetyDemo@123`



Use this account only for local demonstration.



\## API Endpoints



\### Authentication



| Method | Endpoint | Description |

|---|---|---|

| POST | `/api/auth/register` | Register a user |

| POST | `/api/auth/login` | Log in |

| GET | `/api/auth/me` | Get authenticated user |



\### Glucose Readings



All reading endpoints require a valid JWT.



| Method | Endpoint | Description |

|---|---|---|

| POST | `/api/readings` | Create a reading |

| GET | `/api/readings` | Get readings |

| PUT | `/api/readings/:id` | Update a reading |

| DELETE | `/api/readings/:id` | Delete a reading |



\### Reports



All report endpoints require a valid JWT.



| Method | Endpoint | Description |

|---|---|---|

| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |

| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month-to-date report |

| GET | `/api/reports/monthly?date=YYYY-MM-DD` | Previous-month report |



\## Validation Rules



\- Glucose value is required.

\- Glucose value must be a whole number from 40 to 600 mg/dl.

\- Only one reading is allowed per time slot per day.

\- A maximum of four readings is allowed per day.

\- Future dates are not accepted.

\- Users can only access their own readings and reports.



\## Testing



Manually verify the following workflows:



1\. User registration and login.

2\. Unauthorized access to protected endpoints.

3\. Add and retrieve glucose readings.

4\. Update and delete readings.

5\. Reject duplicate time-slot readings.

6\. Reject invalid glucose values.

7\. Reject future dates.

8\. Verify daily report calculations.

9\. Verify month-to-date report.

10\. Verify previous-month report.

11\. Verify the empty-report state.

12\. Verify that one user cannot access another user's readings.



\## Notes, Assumptions, and Future Improvements



\### Assumptions

\- Dates are interpreted using the application's configured India time zone (Asia/Kolkata) for future-date validation.

\- Each of the four specified time slots can have at most one reading per day.

\- Reports are generated for the authenticated user only.

\- Monthly reports cover the complete previous calendar month relative to the selected date.



\### Future Improvements

\- Add pagination for large reading histories.

\- Add glucose trend charts.

\- Add automated frontend and backend test suites.

\- Add Docker support.

\- Add caching for frequently requested reports.

\- Add scheduled background jobs for notifications.

\- Introduce a doctor role and secure patient-sharing workflow.



\## Security



\- Passwords are hashed with bcrypt.

\- JWT authentication protects private endpoints.

\- Database queries use parameterized SQL.

\- User-specific data is filtered using the authenticated user ID.

\- Environment files containing secrets are excluded from Git.



\## Author



Gopal Reddy Desireddy



GitHub: https://github.com/Gopaldr







\*\*Project:\*\* Sweety – Blood Glucose Tracker

