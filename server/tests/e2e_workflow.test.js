import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed/seed.js';
import app from '../server.js';
import { Section } from '../models/Section.js';
import { Course } from '../models/Course.js';

describe('End-to-End User & Administrative Lifecycle Workflow', () => {
  let serverInstance;
  let baseUrl;
  let studentToken;
  let adminToken;
  let it204SecAId;

  before(async () => {
    await seedDatabase(false);
    serverInstance = app.listen(0);
    const port = serverInstance.address().port;
    baseUrl = `http://localhost:${port}/api`;

    const it204 = await Course.findOne({ courseCode: 'IT204' });
    const sec = await Section.findOne({ courseId: it204._id, sectionCode: 'SEC-A' });
    it204SecAId = sec._id.toString();
  });

  after(async () => {
    if (serverInstance) serverInstance.close();
    await disconnectDB();
  });

  test('E2E Step 1: Student Alex Rivera authenticates', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@student.edu', password: 'Password123!' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.user.role, 'student');
    studentToken = data.token;
  });

  test('E2E Step 2: Student checks real-time eligibility for IT204 SEC-A', async () => {
    const res = await fetch(`${baseUrl}/enrollments/check-eligibility?sectionId=${it204SecAId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.eligible, true);
    assert.equal(data.data.code, 'ELIGIBLE');
  });

  test('E2E Step 3: Student registers for IT204 SEC-A', async () => {
    const res = await fetch(`${baseUrl}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ sectionId: it204SecAId }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'registered');
  });

  test('E2E Step 4: Timetable reflects confirmed class meetings', async () => {
    const res = await fetch(`${baseUrl}/academic/timetable`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    const codes = data.data.flatMeetings.map((m) => m.courseCode);
    assert.ok(codes.includes('IT204'), 'IT204 meetings must be included in weekly timetable');
  });

  test('E2E Step 5: Student withdraws from IT204 SEC-A and releases seat', async () => {
    // Get enrollment ID
    const myRes = await fetch(`${baseUrl}/enrollments/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myData = await myRes.json();
    const it204Enr = myData.data.find((e) => e.courseId?.courseCode === 'IT204');
    assert.ok(it204Enr, 'Active IT204 enrollment must be found');

    const withdrawRes = await fetch(`${baseUrl}/enrollments/${it204Enr._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const withdrawData = await withdrawRes.json();
    assert.equal(withdrawRes.status, 200);
    assert.equal(withdrawData.data.status, 'withdrawn');
  });

  test('E2E Step 6: Administrator logs in and inspects telemetry', async () => {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@university.edu', password: 'Password123!' }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.equal(loginData.user.role, 'admin');
    adminToken = loginData.token;

    const statsRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    assert.equal(statsRes.status, 200);
    assert.ok(statsData.data.totalRegistrations > 0);
  });
});
