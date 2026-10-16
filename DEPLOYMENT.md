# Cloud Deployment Guide — Smart Course Registration and Academic Planning System

This guide provides step-by-step instructions for deploying the **Smart Course Registration and Academic Planning System** to the cloud using the free tiers of:
- **MongoDB Atlas** (Database)
- **Render** (Node.js/Express REST API Backend)
- **Vercel** (React/Vite Frontend)

---

## 1. MongoDB Atlas Setup (Cloud Database)

1. **Sign Up / Log In**: Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Create Free Cluster**:
   - Click **Create Deployment** -> Select **M0 Free (Shared)**.
   - Choose a cloud provider and region close to your users (e.g., AWS / `us-east-1` or `ap-south-1`).
   - Cluster Name: e.g. `Cluster0`.
   - Click **Create Deployment**.
3. **Configure Database User**:
   - Go to **Security** -> **Database Access** -> Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: e.g. `app_user`.
   - Password: Click **Autogenerate Secure Password** or enter a strong password (copy and save this password!).
   - Database User Privileges: **Read and write to any database** (Atlas admin or `readWriteAnyDatabase`).
   - Click **Add User**.
4. **Configure Network Access (IP Whitelist)**:
   - Go to **Security** -> **Network Access** -> Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`). *(Required because Render uses dynamic serverless IP ranges)*.
   - Click **Confirm**.
5. **Retrieve Connection String**:
   - Go to **Database** -> **Deployments** -> Click **Connect**.
   - Choose **Drivers** (Node.js).
   - Copy the connection string. It looks like:
     ```text
     mongodb+srv://app_user:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<db_password>` with your actual user password and specify the database name `smart_course_registration`:
     ```text
     mongodb+srv://app_user:YourActualPassword@cluster0.xxxxx.mongodb.net/smart_course_registration?retryWrites=true&w=majority
     ```

---

## 2. GitHub Repository Push

1. Open [github.com/new](https://github.com/new) and create a new repository (e.g. `smart-course-registration`).
2. In your terminal, link your local repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/smart-course-registration.git
   git push -u origin main
   ```

---

## 3. Render Setup (Backend API)

1. **Sign In**: Log into [render.com](https://render.com) using your GitHub account.
2. **Create Web Service**:
   - Click **New +** -> **Web Service**.
   - Select **Build and deploy from a Git repository** -> Connect your `smart-course-registration` repository.
3. **Configure Service Details**:
   - **Name**: `smart-course-registration-api` (or your choice).
   - **Region**: Choose the region closest to your MongoDB Atlas cluster.
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. **Environment Variables**:
   Under the **Environment Variables** section, add:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<your MongoDB Atlas connection string from Step 1>`
   - `JWT_SECRET`: `<generate a random 32+ character string, e.g. a strong secret>`
   - `CLIENT_URL`: `http://localhost:5173` *(We will update this with your Vercel URL in Step 5)*
5. **Deploy**:
   - Click **Create Web Service**.
   - Watch the build and deployment logs.
   - Once running, note your Render backend URL (e.g. `https://smart-course-registration-api.onrender.com`).
   - The backend will automatically connect to Atlas and seed all 21 courses, 31 sections, and initial curriculum rules on first boot!
   - Verify health: Open `https://smart-course-registration-api.onrender.com/api/health` in your browser. It will return `{"status":"healthy","database":"connected",...}`.

---

## 4. Vercel Setup (Frontend App)

1. **Sign In**: Log into [vercel.com](https://vercel.com) using your GitHub account.
2. **Import Project**:
   - Click **Add New...** -> **Project**.
   - Select your `smart-course-registration` GitHub repository.
3. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `client`.
   - **Build Command**: `vite build` (or leave default)
   - **Output Directory**: `dist` (or leave default)
4. **Environment Variables**:
   Add the following environment variable:
   - `VITE_API_URL`: `<Your Render Backend URL from Step 3>`
     - Example: `https://smart-course-registration-api.onrender.com`
5. **Deploy**:
   - Click **Deploy**.
   - Vercel will build the frontend and provide your live production URL (e.g. `https://smart-course-registration.vercel.app`).
   - Client-side routing is pre-configured via `client/vercel.json`, so refreshing any page (`/catalog`, `/planner`, etc.) works seamlessly.

---

## 5. Final Step: Link Vercel Domain in Render CORS

1. Go back to your Render Dashboard -> Select `smart-course-registration-api` -> **Environment**.
2. Update `CLIENT_URL` with your live Vercel URL:
   - Example: `https://smart-course-registration.vercel.app`
3. Click **Save Changes** (Render will trigger a quick redeploy).

---

## 6. Verification Checklist

- [ ] **Root Health Check**: Open `https://<render-url>/` -> Confirms API operational message.
- [ ] **API Health Check**: Open `https://<render-url>/api/health` -> Confirms database is connected.
- [ ] **Frontend Home**: Visit your Vercel URL -> Login page renders cleanly.
- [ ] **Student Login**:
  - Email: `alex.rivera@university.edu` | Password: `Password123!` (or register a new student account).
  - Verify Dashboard, Course Catalog, Timetable, and Academic Planner with 11 remaining core courses.
- [ ] **Course Registration**:
  - Go to **Course Catalog** -> Search for an open section -> Click **Register**.
  - Verify it appears in **My Registrations** and **Weekly Timetable**.
- [ ] **Admin Login**:
  - Email: `admin@university.edu` | Password: `AdminPassword123!`
  - Verify course management, section management, and student rosters.
