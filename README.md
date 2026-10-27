# 🏋️ GymCare – Gym Membership Management System

A full-stack, responsive Gym Membership and Attendance Management System designed and built for a **Third-Year B.Tech Computer Engineering College Project**.

---

## 📌 Project Overview

**GymCare** solves the challenges of physical fitness centers by providing a digital platform for both gym members and administrators. Members can explore plans, register, renew memberships via simulated demo payments, track attendance, and provide feedback. Administrators can monitor real-time gym stats, manage plans, oversee members, mark attendance, and reply to user feedback.

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Description |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive layout, modern UI cards, CSS variables, modal popups, and toast notifications without heavy frontend frameworks. |
| **Backend** | Node.js & Express.js | RESTful API architecture, structured routing, error handling, and static file serving. |
| **Database** | MongoDB | Document-based NoSQL database for flexible data persistence. |
| **ODM** | Mongoose (v8) | Schema validation, hooks (pre-save hashing), virtuals, and relationships. |
| **Authentication** | `bcryptjs` & `express-session` | Cryptographic password hashing (salt rounds: 10), HTTP-only cookies, and persistent session storage. |
| **Environment** | `dotenv` | Safe externalization of secrets, port, and database URIs. |
| **Testing** | Node assert & automated test runner | Unit tests verifying authorization, password hashing, and business logic. |

---

## 🎨 Design & Colour Palette

GymCare adheres to a clean, professional aesthetic:
- **Dark Navy Blue**: `#0B1F3A` (Navigation bar, sidebar headers, dark accents)
- **Primary Blue**: `#2563EB` (Primary action buttons, links, highlights)
- **White**: `#FFFFFF` (Card backgrounds, tables, clean canvas)
- **Light Grey**: `#F1F5F9` (Page background for high readability)
- **Status Accents**: Emerald Green (`#10B981`) for Active, Amber (`#F59E0B`) for Pending/Late, Crimson (`#EF4444`) for Expired/Suspended.

---

## 📁 Project Directory Structure

```text
gymcare/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & reconnection handler
│   ├── middleware/
│   │   └── authMiddleware.js     # isAuthenticated & isAdmin role guards
│   ├── models/
│   │   ├── User.js               # Member & Admin schema with bcrypt hooks
│   │   ├── MembershipPlan.js     # Configurable gym plans (1, 3, 6, 12 months)
│   │   ├── Membership.js         # Subscribed memberships & expiry tracker
│   │   ├── Payment.js            # Demo payment simulation records
│   │   ├── Attendance.js         # Daily check-in logs
│   │   └── Feedback.js           # Member feedback & admin replies
│   ├── routes/
│   │   ├── authRoutes.js         # Register, Login, Admin Login, Logout, Profile
│   │   ├── planRoutes.js         # Public plan viewing & Admin plan CRUD
│   │   ├── membershipRoutes.js   # Member subscription & renewal logic
│   │   ├── paymentRoutes.js      # Demo payment ledger (User & Admin)
│   │   ├── attendanceRoutes.js   # Attendance logging & history
│   │   ├── feedbackRoutes.js     # Feedback submission & resolution
│   │   └── adminRoutes.js        # Admin metrics & member management
│   ├── scripts/
│   │   ├── seedAdmin.js          # One-time protected admin creator script
│   │   ├── seedPlans.js          # Default starter plans seeder
│   │   └── testSuite.js          # Automated unit & security test suite
│   └── server.js                 # Express server & static asset host
├── frontend/
│   ├── index.html                # Public landing page (Hero, About, Plans, Facilities)
│   ├── login.html                # Member login portal
│   ├── register.html             # Member registration portal
│   ├── user-dashboard.html       # Member dashboard (Plans, Payments, Attendance)
│   ├── admin-login.html          # Protected staff & administrator login
│   ├── admin-dashboard.html      # Full-featured administrative control panel
│   ├── css/
│   │   └── style.css             # Unified responsive stylesheet
│   └── js/
│       ├── main.js               # Shared toast, formatting, & nav logic
│       ├── auth.js               # Login, registration, & form handlers
│       ├── user-dashboard.js     # Member dashboard API controller
│       └── admin-dashboard.js    # Admin dashboard API controller
├── .env.example                  # Safe environment template
├── .gitignore                    # Excludes node_modules, .env, and logs
├── package.json                  # Dependencies & npm scripts
└── README.md                     # Complete project documentation
```

---

## 🔑 Key Features

### 1. Public Website (`index.html`)
- Responsive navigation bar with mobile hamburger menu.
- Hero banner with quick stats (500+ Members, 15+ Trainers, 4 Plans).
- About the Gym & 6 amenity showcase cards (Cardio, Free Weights, Yoga, Steam, etc.).
- Membership plans section loaded dynamically from MongoDB.
- Contact information and working quick inquiry form.

### 2. User Authentication & Security
- Public registration (`register.html`) with validation for full name, unique username, email, phone number, address, and password matching.
- **Role Isolation**: Public registration **always** creates members (`role: 'member'`). Users can never assign themselves administrative privileges.
- **Passwords**: Passwords are cryptographically salted and hashed using `bcryptjs` before hitting the database. Plaintext passwords are never saved.
- **Sanitized Responses**: Sensitive fields (`password`, `__v`) are stripped from JSON API outputs via `user.toSafeObject()`.

### 3. Member Dashboard (`user-dashboard.html`)
- Welcome banner, personalized avatar, and active plan summary.
- **Real-time Status**: Active badge, remaining days countdown, and expiry date.
- **Simulated Demo Payment Modal**: Subscribe or renew any plan using simulated Demo UPI, NetBanking, Card, or Front Desk Cash without real charges.
- **Automatic Date Calculation**:
  - Fresh memberships start today and end in `today + plan.durationMonths`.
  - Renewals seamlessly extend from the existing expiry date.
- **Payment History**: Table of demo transactions with unique transaction references (`DEMO-PAY-XXXXXXXX`).
- **Attendance Log**: View recorded workout sessions and check-in dates.
- **Feedback & Support**: Submit 1 to 5 star ratings with messages, and view administrator responses.
- **Profile Settings**: Update name, phone, and address.

### 4. Admin Portal & Dashboard (`admin-dashboard.html`)
- **Dedicated Secure Login** (`admin-login.html`): Checks password AND verifies `user.role === 'admin'`.
- **Backend Guard**: All `/api/admin/*` routes verify active session with `isAdmin` middleware.
- **Dashboard Metrics**:
  - Total Registered Members
  - Active Memberships
  - Expired Memberships
  - Total Demo Revenue Recorded
  - Today's Gym Check-ins
  - Pending User Feedback Count
- **Member Management**: Search members by name/username/email, view individual member history modals, and toggle active/suspended statuses.
- **Plan Management**: Add new packages with custom durations and pricing, edit features, and toggle active status.
- **Membership Operations**: Extend user end dates by +1, +3, +6, or +12 months.
- **Attendance Management**: Mark daily check-ins for any registered member (Present / Late / Excused).
- **Feedback Console**: Review member queries and submit official gym replies.

---

## 🚀 Step-by-Step Setup Instructions (Windows)

Open **Windows Command Prompt (`cmd.exe`)** or **PowerShell** and navigate to your project directory:

```cmd
cd C:\Users\Dell\OneDrive\Desktop\Project_Invoizmo
```

### Step 1: Install Dependencies
Run the following command to install all required npm packages:
```cmd
npm install
```

### Step 2: Configure Environment Variables
Copy the template configuration file:
```cmd
copy .env.example .env
```
Open `.env` in any text editor (Notepad, VS Code) if you want to customize your port or database connection. By default, it connects to local MongoDB:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/gymcare
SESSION_SECRET=gymcare_secret_session_key_college_project_2026
ADMIN_NAME=GymCare Administrator
ADMIN_EMAIL=admin@gymcare.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@12345
```

### Step 3: Configure MongoDB

#### Option A: Local MongoDB Community Server
If you have MongoDB installed on your computer, ensure the service is running:
```cmd
net start MongoDB
```
*(If installed as a manual binary, run `mongod --dbpath <data-folder>`)*.

#### Option B: Free MongoDB Atlas Cloud Database (Recommended for Viva/Presentations)
1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g., `gymadmin`) and password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect -> Drivers** and copy your connection string:
   ```env
   MONGODB_URI=mongodb+srv://gymadmin:<password>@cluster0.abcde.mongodb.net/gymcare?retryWrites=true&w=majority
   ```
6. Paste this URI into your `.env` file.

### Step 4: Seed Default Plans and Administrator
Initialize the 4 standard gym plans and the super administrator account:
```cmd
npm run seed
```
*(Or seed them individually via `npm run seed:plans` and `npm run seed:admin`)*.

### Step 5: Start the GymCare Application
```cmd
npm start
```
*(For auto-reloading during development, run `npm run dev`)*.

### Step 6: Open the Application in your Browser
- **Public Home Page**: [http://localhost:5000](http://localhost:5000)
- **Member Login**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Member Registration**: [http://localhost:5000/register.html](http://localhost:5000/register.html)
- **Admin Portal**: [http://localhost:5000/admin-login.html](http://localhost:5000/admin-login.html)

---

## 🧪 Testing the Application

### Running Automated Test Suite
GymCare comes with a built-in automated test suite verifying password hashing, authorization gates, and expiry date logic:
```cmd
npm test
```
Expected output:
```text
====================================================
🧪 Starting GymCare Logic & Security Test Suite
====================================================

  ✅ PASSED: Password Security: Bcrypt hashing & verification
  ✅ PASSED: Data Privacy: User.toSafeObject() excludes password and sensitive fields
  ✅ PASSED: Business Logic: Membership Expiry Calculation for 1, 3, 6, 12 months
  ✅ PASSED: Payment Security: Demo Payment Structure & Simulation Safeguard
  ✅ PASSED: Security Middleware: isAuthenticated blocks unauthenticated requests
  ✅ PASSED: Security Middleware: isAdmin strictly forbids non-admin members
  ✅ PASSED: Validation: Feedback rating limits (1 to 5 stars)
  ✅ PASSED: Attendance: Model validates user, date, and status

====================================================
📊 Test Results: 8 Passed | 0 Failed
====================================================
```

### Manual Testing Walkthrough for College Viva

1. **Member Journey**:
   - Visit [http://localhost:5000/register.html](http://localhost:5000/register.html) and register a new member account (e.g. `rohit_kumar`).
   - You will be automatically redirected to your **Member Dashboard**.
   - Notice the status shows **"No Active Plan"**.
   - Navigate to the **Membership Plans** tab, select the **6 Months Elite Plan**, choose **Demo UPI**, and confirm the demo payment.
   - The status updates immediately to **Active (180 Days Remaining)**.
   - Click **Payment History** to review the recorded demo invoice.
   - Go to **Feedback & Support** and submit a 5-star review.
   - Log out.

2. **Administrator Journey**:
   - Visit [http://localhost:5000/admin-login.html](http://localhost:5000/admin-login.html).
   - Enter credentials:
     - Username: `admin`
     - Password: `Admin@12345`
   - Review the updated stats: Total Members, Active Memberships, and Demo Revenue.
   - Switch to **Member Management** to see the newly registered member.
   - Switch to **Attendance Logging**, select the member from the dropdown, choose today's date, and click **Mark Check-in**.
   - Switch to **Member Feedback**, view the member's submission, click **Reply / Resolve**, type an official reply, and save.
   - Log out of Admin.

3. **Verification of Security Rules**:
   - Log back in as the member `rohit_kumar`.
   - In your browser URL bar, try navigating directly to `http://localhost:5000/admin-dashboard.html`.
   - The system intercepts the request, blocks unauthorized access, and redirects to the admin login page with an alert.
   - Check the member's **Feedback** and **Attendance** tabs to see the admin's reply and recorded check-in session!

---

## 🔐 Pre-Configured Demo Credentials

| Role | Username / Email | Password | Access URL |
|---|---|---|---|
| **Administrator** | `admin` or `admin@gymcare.com` | `Admin@12345` | `/admin-login.html` |
| **New Member** | Register via `/register.html` | Your chosen password | `/login.html` |

---

## 🐙 Pushing Code to Your GitHub Repository

Follow these exact commands to push this project to your GitHub account:

1. Create a new empty repository on [GitHub](https://github.com/new) named `gymcare-management-system` (do not initialize with README or license).
2. Open Windows Command Prompt in the project folder and run:

```cmd
git init
git add .
git commit -m "Initial commit: Complete GymCare full-stack management system"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/gymcare-management-system.git
git push -u origin main
```

*(Note: The included `.gitignore` automatically prevents your `.env` secrets and `node_modules` from being pushed to GitHub).*

---

## ☁️ Deployment Guide (Production Hosting)

### 1. Hosted Database: MongoDB Atlas
Create a free database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) as described in Step 3B above.

### 2. Backend & Frontend Hosting (e.g. Render.com / Railway.app)
Because Express serves the frontend static files directly from `frontend/`, the entire project runs as a single unified service:

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service** and connect your GitHub repository.
3. Configure the service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `<Your MongoDB Atlas Connection String>`
   - `SESSION_SECRET` = `<Generate a long random string>`
   - `ADMIN_PASSWORD` = `<Choose a strong admin password>`
5. Click **Deploy Web Service**.
6. Once deployed, Render will provide a live HTTPS URL (e.g., `https://gymcare-xyz.onrender.com`).
7. Access `https://gymcare-xyz.onrender.com/admin-login.html` to manage your live gym!

---

## 📄 License & Academic Integrity

This project is built for educational and demonstration purposes as part of the **B.Tech Computer Engineering Third-Year Curriculum**. All simulated payment features are for educational demonstration only.
