import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed/seed.js';
import app from '../server.js';

describe('Authentication & Role-Based Access Control Tests', () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    await seedDatabase(false);
    serverInstance = app.listen(0);
    const port = serverInstance.address().port;
    baseUrl = `http://localhost:${port}/api`;
  });

  after(async () => {
    if (serverInstance) serverInstance.close();
    await disconnectDB();
  });

  test('Student Login: succeeds with valid credentials and issues JWT token', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@student.edu', password: 'Password123!' }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token, 'Must return JWT token');
    assert.equal(data.user.role, 'student');
    assert.equal(data.user.email, 'alex@student.edu');
  });

  test('Admin Login: succeeds with valid admin credentials and returns admin role', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@university.edu', password: 'Password123!' }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'admin');
  });

  test('Invalid Credentials: login is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@student.edu', password: 'WrongPassword!' }),
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  test('Unauthorized Access: protected routes reject requests without a token', async () => {
    const res = await fetch(`${baseUrl}/enrollments/me`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.match(data.message, /No token provided/i);
  });

  test('Role Restriction: student token is blocked from admin routes with 403 Forbidden', async () => {
    // 1. Login as student
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@student.edu', password: 'Password123!' }),
    });
    const { token } = await loginRes.json();

    // 2. Try to access admin dashboard
    const adminRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(adminRes.status, 403);
    const data = await adminRes.json();
    assert.equal(data.success, false);
    assert.match(data.message, /Forbidden/i);
  });

  test('Admin Access: admin token successfully accesses admin dashboard', async () => {
    // 1. Login as admin
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@university.edu', password: 'Password123!' }),
    });
    const { token } = await loginRes.json();

    // 2. Access admin dashboard
    const adminRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(adminRes.status, 200);
    const data = await adminRes.json();
    assert.equal(data.success, true);
    assert.ok(data.data.totalStudents >= 15);
    assert.ok(data.data.totalCourses >= 20);
    assert.ok(data.data.totalSections >= 30);
  });
});
