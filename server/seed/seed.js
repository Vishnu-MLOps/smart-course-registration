import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Enrollment } from '../models/Enrollment.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { AcademicRule } from '../models/AcademicRule.js';
import { Notification } from '../models/Notification.js';

dotenv.config();

export const ensureStudentRecords = async (courseMap) => {
  // If courseMap wasn't passed, build it from DB
  if (!courseMap) {
    const courses = await Course.find();
    courseMap = new Map(courses.map((c) => [c.courseCode, c]));
  }

  // Ensure student Vishnu (310624205305) exists
  let vishnu = await User.findOne({
    $or: [{ registrationNumber: '310624205305' }, { email: '310624205305@eec.srmrmp.edu.in' }],
  });

  if (!vishnu) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    vishnu = await User.create({
      name: 'Vishnu',
      email: '310624205305@eec.srmrmp.edu.in',
      passwordHash,
      role: 'student',
      department: 'Information Technology',
      semester: 5,
      registrationNumber: '310624205305',
    });
    console.log('[Seed] Created student Vishnu (310624205305).');
  }

  // Ensure Vishnu's historical academic records (Semesters 1-4, 56 credits)
  await AcademicRecord.deleteMany({ studentId: vishnu._id });

  const vishnuHistorical = [
    { code: 'CS101', grade: 'A', term: 'Fall 2024' },
    { code: 'MA101', grade: 'A', term: 'Fall 2024' },
    { code: 'ENG101', grade: 'A', term: 'Fall 2024' },
    { code: 'IT102', grade: 'A', term: 'Fall 2024' },
    { code: 'CS102', grade: 'A-', term: 'Spring 2025' },
    { code: 'IT201', grade: 'A', term: 'Spring 2025' },
    { code: 'IT202', grade: 'A', term: 'Spring 2025' },
    { code: 'IT203', grade: 'A', term: 'Fall 2025' },
    { code: 'IT204', grade: 'B+', term: 'Fall 2025' },
    { code: 'IT205', grade: 'A', term: 'Fall 2025' },
    { code: 'IT206', grade: 'A', term: 'Fall 2025' },
    { code: 'IT207', grade: 'A', term: 'Fall 2025' },
    { code: 'IT301', grade: 'A', term: 'Spring 2026' },
    { code: 'IT302', grade: 'A-', term: 'Spring 2026' },
    { code: 'IT303', grade: 'B+', term: 'Spring 2026' },
    { code: 'IT305', grade: 'A', term: 'Spring 2026' },
    { code: 'IT405', grade: 'A', term: 'Spring 2026' },
  ];

  for (const item of vishnuHistorical) {
    const course = courseMap.get(item.code);
    if (!course) continue;
    await AcademicRecord.create({
      studentId: vishnu._id,
      courseId: course._id,
      status: 'completed',
      grade: item.grade,
      creditsEarned: course.credits,
      completedTerm: item.term,
    });
  }

  // Ensure welcome notification for Vishnu
  const noteExists = await Notification.findOne({
    userId: vishnu._id,
    title: 'Welcome to Fall 2026 Registration',
  });
  if (!noteExists) {
    await Notification.create({
      userId: vishnu._id,
      title: 'Welcome to Fall 2026 Registration',
      message: 'Fall 2026 course registration is now open. Verify your degree plan and timetable.',
      type: 'info',
      isRead: false,
    });
  }

  return vishnu;
};

export const seedDatabase = async (arg = {}) => {
  let shouldDisconnect = true;
  let resetUsers = false;
  if (typeof arg === 'boolean') {
    shouldDisconnect = arg;
  } else if (typeof arg === 'object' && arg !== null) {
    if (arg.shouldDisconnect !== undefined) shouldDisconnect = arg.shouldDisconnect;
    if (arg.resetUsers !== undefined) resetUsers = arg.resetUsers;
  }

  console.log(`[Seed] Starting database seed process (shouldDisconnect: ${shouldDisconnect}, resetUsers: ${resetUsers})...`);
  await connectDB();

  // Clear non-user collections
  await Promise.all([
    Course.deleteMany({}),
    Section.deleteMany({}),
    AcademicRule.deleteMany({}),
  ]);

  if (resetUsers) {
    await Promise.all([
      User.deleteMany({}),
      Enrollment.deleteMany({}),
      AcademicRecord.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing user & enrollment records.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Ensure Admin exists
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'Dr. Eleanor Vance (Dean / Registrar)',
      email: 'admin@university.edu',
      passwordHash,
      role: 'admin',
      department: 'Information Technology',
      semester: 8,
      registrationNumber: 'ADM-2026-001',
    });
    console.log('[Seed] Created default Administrator account.');
  }

  // 2. Ensure Demo Student Alex Rivera exists
  let alex = await User.findOne({ email: 'alex@student.edu' });
  if (!alex) {
    alex = await User.create({
      name: 'Alex Rivera',
      email: 'alex@student.edu',
      passwordHash,
      role: 'student',
      department: 'Information Technology',
      semester: 3,
      registrationNumber: 'IT2024-001',
    });
    console.log('[Seed] Created demo student Alex Rivera.');
  }

  // Ensure secondary demo students exist
  const studentData = [
    { name: 'Bethany Chen', email: 'bethany@student.edu', reg: 'IT2024-002', sem: 3 },
    { name: 'Carlos Gomez', email: 'carlos@student.edu', reg: 'IT2024-003', sem: 4 },
    { name: 'Dana Scott', email: 'dana@student.edu', reg: 'IT2024-004', sem: 5 },
    { name: 'Ethan Patel', email: 'ethan@student.edu', reg: 'IT2024-005', sem: 2 },
    { name: 'Fiona Gallagher', email: 'fiona@student.edu', reg: 'IT2024-006', sem: 3 },
    { name: 'George Miller', email: 'george@student.edu', reg: 'IT2024-007', sem: 4 },
    { name: 'Hannah Abbott', email: 'hannah@student.edu', reg: 'IT2024-008', sem: 1 },
    { name: 'Ian Wright', email: 'ian@student.edu', reg: 'IT2024-009', sem: 6 },
    { name: 'Julia Roberts', email: 'julia@student.edu', reg: 'IT2024-010', sem: 3 },
    { name: 'Kevin Durant', email: 'kevin@student.edu', reg: 'IT2024-011', sem: 4 },
    { name: 'Laura Bailey', email: 'laura@student.edu', reg: 'IT2024-012', sem: 5 },
    { name: 'Marcus Aurelius', email: 'marcus@student.edu', reg: 'IT2024-013', sem: 2 },
    { name: 'Nadia Comaneci', email: 'nadia@student.edu', reg: 'IT2024-014', sem: 3 },
    { name: 'Oscar Isaac', email: 'oscar@student.edu', reg: 'IT2024-015', sem: 4 },
  ];

  for (const s of studentData) {
    const exists = await User.findOne({ email: s.email });
    if (!exists) {
      await User.create({
        name: s.name,
        email: s.email,
        passwordHash,
        role: 'student',
        department: 'Information Technology',
        semester: s.sem,
        registrationNumber: s.reg,
      });
    }
  }

  // 3. Create at least 21 Courses with realistic prerequisite chains
  // Step A: Courses without prerequisites
  const baseCourses = await Course.create([
    {
      courseCode: 'CS101',
      courseName: 'Introduction to Computer Science & Programming',
      description: 'Foundations of algorithms, computational thinking, and Python programming.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 1,
      courseType: 'core',
    },
    {
      courseCode: 'MA101',
      courseName: 'Discrete Mathematics',
      description: 'Logic, sets, relations, functions, graph theory, and proof techniques.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 1,
      courseType: 'core',
    },
    {
      courseCode: 'ENG101',
      courseName: 'Technical Communication & Academic Writing',
      description: 'Professional communication, technical documentation, and presentation skills.',
      department: 'Information Technology',
      credits: 2,
      recommendedSemester: 1,
      courseType: 'general',
    },
    {
      courseCode: 'IT102',
      courseName: 'Web Development Fundamentals',
      description: 'HTML5, modern CSS, responsive design, and introduction to JavaScript.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 1,
      courseType: 'core',
    },
    {
      courseCode: 'CS102',
      courseName: 'Computer Organization & Architecture',
      description: 'Digital logic, instruction set architecture, memory hierarchy, and I/O.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 2,
      courseType: 'core',
    },
  ]);

  const courseMap = new Map(baseCourses.map((c) => [c.courseCode, c]));

  // Step B: Semester 2 & 3 Courses (prereq: CS101, MA101, etc.)
  const intermediateCourses = await Course.create([
    {
      courseCode: 'IT201',
      courseName: 'Data Structures & Algorithms',
      description: 'Linear & tree data structures, sorting, graph algorithms, and complexity analysis.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 2,
      prerequisites: [courseMap.get('CS101')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT202',
      courseName: 'Object-Oriented Programming with Java',
      description: 'OOP paradigms, polymorphism, exception handling, collections, and multi-threading.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 2,
      prerequisites: [courseMap.get('CS101')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT203',
      courseName: 'Database Management Systems',
      description: 'Relational algebra, SQL, normalization, transactions, ACID properties, and indexing.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 3,
      prerequisites: [courseMap.get('CS101')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT204',
      courseName: 'Computer Networks & Protocols',
      description: 'OSI layers, TCP/IP stack, routing protocols, socket programming, and security basics.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 3,
      prerequisites: [courseMap.get('CS102')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT205',
      courseName: 'Operating Systems & System Programming',
      description: 'Process scheduling, virtual memory, concurrency, semaphores, and file systems.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 3,
      prerequisites: [courseMap.get('CS102')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT206',
      courseName: 'Web Systems & Full Stack Frameworks',
      description: 'Modern front-end frameworks, RESTful API design, Node.js backend integration.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 3,
      prerequisites: [courseMap.get('IT102')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT207',
      courseName: 'Software Engineering & Agile Methodologies',
      description: 'SDLC, Scrum practices, UML modeling, software testing, and CI/CD pipelines.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 3,
      courseType: 'core',
    },
  ]);

  intermediateCourses.forEach((c) => courseMap.set(c.courseCode, c));

  // Step C: Semester 4 & 5 Advanced Courses & Electives
  const advancedCourses = await Course.create([
    {
      courseCode: 'IT301',
      courseName: 'Advanced Database Systems & NoSQL',
      description: 'Distributed databases, MongoDB, query optimization, sharding, and replication.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 4,
      prerequisites: [courseMap.get('IT203')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT302',
      courseName: 'Information & Network Security',
      description: 'Applied cryptography, SSL/TLS, intrusion detection, penetration testing, and IAM.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 4,
      prerequisites: [courseMap.get('IT204')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT303',
      courseName: 'Cloud Computing & DevOps Architecture',
      description: 'Cloud service models (IaaS/PaaS/SaaS), Docker containerization, and orchestration.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 4,
      prerequisites: [courseMap.get('IT205')._id],
      courseType: 'elective',
    },
    {
      courseCode: 'IT304',
      courseName: 'Artificial Intelligence & Machine Learning',
      description: 'Supervised/unsupervised learning, neural networks, feature engineering, and evaluation.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 5,
      prerequisites: [courseMap.get('IT201')._id, courseMap.get('MA101')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT305',
      courseName: 'Mobile Application Development',
      description: 'Native and cross-platform mobile architectures, state management, and device APIs.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 4,
      prerequisites: [courseMap.get('IT202')._id],
      courseType: 'elective',
    },
    {
      courseCode: 'IT306',
      courseName: 'Data Warehousing & Business Intelligence',
      description: 'Star schema, ETL pipelines, analytical processing, and BI dashboard design.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 5,
      prerequisites: [courseMap.get('IT203')._id],
      courseType: 'elective',
    },
    {
      courseCode: 'IT401',
      courseName: 'Distributed Systems & Microservices',
      description: 'Consensus protocols, CAP theorem, gRPC, event-driven architecture, and Kafka.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 5,
      prerequisites: [courseMap.get('IT204')._id, courseMap.get('IT205')._id],
      courseType: 'core',
    },
    {
      courseCode: 'IT405',
      courseName: 'Human-Computer Interaction & UI/UX Design',
      description: 'User-centered design, usability testing, heuristics, and prototyping workflows.',
      department: 'Information Technology',
      credits: 3,
      recommendedSemester: 4,
      courseType: 'elective',
    },
  ]);

  advancedCourses.forEach((c) => courseMap.set(c.courseCode, c));

  // Step D: Semester 6 Advanced Courses (references IT301)
  const sem6Courses = await Course.create([
    {
      courseCode: 'IT402',
      courseName: 'Data Analytics & Big Data Technologies',
      description: 'Hadoop, Spark, streaming analytics, distributed storage, and large-scale data modeling.',
      department: 'Information Technology',
      credits: 4,
      recommendedSemester: 6,
      prerequisites: [courseMap.get('IT301')._id],
      courseType: 'elective',
    },
  ]);

  sem6Courses.forEach((c) => courseMap.set(c.courseCode, c));

  const allCourses = Array.from(courseMap.values());
  console.log(`[Seed] Created ${allCourses.length} courses across the IT curriculum.`);

  // 4. Create Academic Rules
  const coreCourseIds = allCourses
    .filter((c) => c.courseType === 'core')
    .map((c) => c._id);

  await AcademicRule.create({
    department: 'Information Technology',
    academicTerm: 'Fall 2026',
    minimumCredits: 12,
    maximumCredits: 21,
    degreeCreditRequirement: 120,
    applicableSemester: 3,
    coreRequirements: coreCourseIds,
  });

  console.log('[Seed] Created academic rules for IT department.');

  // 5. Create 31 Sections for Fall 2026
  const sectionDefs = [
    {
      code: 'CS101',
      sec: 'SEC-A',
      fac: 'Dr. Alan Turing',
      cap: 35,
      room: 'Turing Hall 101',
      sched: [{ day: 'Monday', startTime: '09:00', endTime: '10:30' }, { day: 'Wednesday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'CS101',
      sec: 'SEC-B',
      fac: 'Prof. Ada Lovelace',
      cap: 35,
      room: 'Lovelace Lab 202',
      sched: [{ day: 'Tuesday', startTime: '11:00', endTime: '12:30' }, { day: 'Thursday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'MA101',
      sec: 'SEC-A',
      fac: 'Dr. Katherine Johnson',
      cap: 40,
      room: 'Newton Math Wing 105',
      sched: [{ day: 'Monday', startTime: '11:00', endTime: '12:30' }, { day: 'Wednesday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT102',
      sec: 'SEC-A',
      fac: 'Prof. Tim Berners-Lee',
      cap: 30,
      room: 'Web Studio 301',
      sched: [{ day: 'Tuesday', startTime: '09:00', endTime: '10:30' }, { day: 'Thursday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT201',
      sec: 'SEC-A',
      fac: 'Dr. Robert Tarjan',
      cap: 30,
      room: 'Algorithms Lab 102',
      sched: [{ day: 'Monday', startTime: '13:00', endTime: '14:30' }, { day: 'Wednesday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT201',
      sec: 'SEC-B',
      fac: 'Dr. Donald Knuth',
      cap: 30,
      room: 'Algorithms Lab 104',
      sched: [{ day: 'Tuesday', startTime: '13:00', endTime: '14:30' }, { day: 'Thursday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT202',
      sec: 'SEC-A',
      fac: 'Prof. James Gosling',
      cap: 30,
      room: 'Gosling Lab 201',
      sched: [{ day: 'Monday', startTime: '15:00', endTime: '16:30' }, { day: 'Friday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT203',
      sec: 'SEC-A',
      fac: 'Dr. Edgar F. Codd',
      cap: 30,
      room: 'Data Center Lab 304',
      sched: [{ day: 'Tuesday', startTime: '15:00', endTime: '16:30' }, { day: 'Thursday', startTime: '15:00', endTime: '16:30' }],
    },
    {
      code: 'IT204',
      sec: 'SEC-A',
      fac: 'Prof. Vint Cerf',
      cap: 30,
      room: 'Networking Wing 203',
      sched: [{ day: 'Friday', startTime: '11:00', endTime: '12:30' }, { day: 'Wednesday', startTime: '15:00', endTime: '16:30' }],
    },
    {
      code: 'IT204',
      sec: 'SEC-B',
      fac: 'Prof. Radia Perlman',
      cap: 25,
      room: 'Networking Wing 205',
      sched: [{ day: 'Monday', startTime: '09:00', endTime: '10:30' }, { day: 'Thursday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT205',
      sec: 'SEC-A',
      fac: 'Dr. Linus Torvalds',
      cap: 28,
      room: 'Systems Core 101',
      sched: [{ day: 'Tuesday', startTime: '13:00', endTime: '14:30' }, { day: 'Friday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT206',
      sec: 'SEC-A',
      fac: 'Prof. Brendan Eich',
      cap: 30,
      room: 'Web Studio 302',
      sched: [{ day: 'Monday', startTime: '11:00', endTime: '12:30' }, { day: 'Wednesday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT207',
      sec: 'SEC-A',
      fac: 'Dr. Margaret Hamilton',
      cap: 35,
      room: 'Apollo Room 401',
      sched: [{ day: 'Wednesday', startTime: '13:00', endTime: '14:30' }, { day: 'Friday', startTime: '15:00', endTime: '16:30' }],
    },
    {
      code: 'IT206',
      sec: 'SEC-FULL',
      fac: 'Prof. Brendan Eich',
      cap: 2,
      room: 'Seminar Room 12',
      sched: [{ day: 'Tuesday', startTime: '09:00', endTime: '10:30' }, { day: 'Thursday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT301',
      sec: 'SEC-A',
      fac: 'Dr. Michael Stonebraker',
      cap: 25,
      room: 'Distributed Systems Lab 1',
      sched: [{ day: 'Monday', startTime: '13:00', endTime: '14:30' }, { day: 'Wednesday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT302',
      sec: 'SEC-A',
      fac: 'Dr. Bruce Schneier',
      cap: 25,
      room: 'Cyber Security Lab 501',
      sched: [{ day: 'Tuesday', startTime: '15:00', endTime: '16:30' }, { day: 'Thursday', startTime: '15:00', endTime: '16:30' }],
    },
    {
      code: 'IT303',
      sec: 'SEC-A',
      fac: 'Prof. Werner Vogels',
      cap: 30,
      room: 'Cloud Center 202',
      sched: [{ day: 'Monday', startTime: '15:00', endTime: '16:30' }, { day: 'Thursday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT304',
      sec: 'SEC-A',
      fac: 'Dr. Geoffrey Hinton',
      cap: 30,
      room: 'Turing Hall 205',
      sched: [{ day: 'Wednesday', startTime: '09:00', endTime: '10:30' }, { day: 'Friday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT304',
      sec: 'SEC-B',
      fac: 'Dr. Fei-Fei Li',
      cap: 30,
      room: 'Vision Center 104',
      sched: [{ day: 'Tuesday', startTime: '11:00', endTime: '12:30' }, { day: 'Thursday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT305',
      sec: 'SEC-A',
      fac: 'Prof. Andy Rubin',
      cap: 25,
      room: 'Mobile Dev Studio 1',
      sched: [{ day: 'Monday', startTime: '09:00', endTime: '10:30' }, { day: 'Friday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT306',
      sec: 'SEC-A',
      fac: 'Dr. Ralph Kimball',
      cap: 25,
      room: 'BI Wing 303',
      sched: [{ day: 'Wednesday', startTime: '15:00', endTime: '16:30' }, { day: 'Friday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT401',
      sec: 'SEC-A',
      fac: 'Dr. Leslie Lamport',
      cap: 20,
      room: 'Lamport Lab 601',
      sched: [{ day: 'Monday', startTime: '11:00', endTime: '12:30' }, { day: 'Wednesday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'IT402',
      sec: 'SEC-A',
      fac: 'Prof. Matei Zaharia',
      cap: 20,
      room: 'Big Data Lab 402',
      sched: [{ day: 'Tuesday', startTime: '13:00', endTime: '14:30' }, { day: 'Thursday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'IT405',
      sec: 'SEC-A',
      fac: 'Prof. Don Norman',
      cap: 30,
      room: 'Design Studio 101',
      sched: [{ day: 'Friday', startTime: '13:00', endTime: '14:30' }, { day: 'Saturday', startTime: '10:00', endTime: '11:30' }],
    },
    {
      code: 'IT405',
      sec: 'SEC-B',
      fac: 'Prof. Don Norman',
      cap: 30,
      room: 'Design Studio 102',
      sched: [{ day: 'Saturday', startTime: '11:30', endTime: '13:00' }, { day: 'Tuesday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT202',
      sec: 'SEC-B',
      fac: 'Prof. Joshua Bloch',
      cap: 30,
      room: 'Gosling Lab 202',
      sched: [{ day: 'Tuesday', startTime: '09:00', endTime: '10:30' }, { day: 'Thursday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'IT203',
      sec: 'SEC-B',
      fac: 'Dr. Jim Gray',
      cap: 30,
      room: 'Data Center Lab 305',
      sched: [{ day: 'Monday', startTime: '15:00', endTime: '16:30' }, { day: 'Wednesday', startTime: '15:00', endTime: '16:30' }],
    },
    {
      code: 'IT205',
      sec: 'SEC-B',
      fac: 'Dr. Andrew Tanenbaum',
      cap: 28,
      room: 'Systems Core 102',
      sched: [{ day: 'Wednesday', startTime: '09:00', endTime: '10:30' }, { day: 'Friday', startTime: '09:00', endTime: '10:30' }],
    },
    {
      code: 'CS102',
      sec: 'SEC-A',
      fac: 'Dr. John Hennessy',
      cap: 30,
      room: 'Hennessy Hall 101',
      sched: [{ day: 'Monday', startTime: '13:00', endTime: '14:30' }, { day: 'Wednesday', startTime: '13:00', endTime: '14:30' }],
    },
    {
      code: 'ENG101',
      sec: 'SEC-A',
      fac: 'Prof. William Strunk',
      cap: 35,
      room: 'Humanities Hall 201',
      sched: [{ day: 'Tuesday', startTime: '11:00', endTime: '12:30' }],
    },
    {
      code: 'MA101',
      sec: 'SEC-B',
      fac: 'Dr. George Boole',
      cap: 35,
      room: 'Newton Math Wing 106',
      sched: [{ day: 'Tuesday', startTime: '15:00', endTime: '16:30' }, { day: 'Thursday', startTime: '15:00', endTime: '16:30' }],
    },
  ];

  const createdSections = [];
  for (const def of sectionDefs) {
    const course = courseMap.get(def.code);
    if (!course) continue;
    const sec = await Section.create({
      courseId: course._id,
      sectionCode: def.sec,
      faculty: def.fac,
      capacity: def.cap,
      schedule: def.sched,
      room: def.room,
      semester: course.recommendedSemester,
      academicTerm: 'Fall 2026',
    });
    createdSections.push(sec);
  }

  console.log(`[Seed] Created ${createdSections.length} sections for Fall 2026.`);

  // 6. Ensure historical academic records for Alex Rivera (Semester 3: CS101, MA101, ENG101, CS102, IT102 = 15 credits)
  await AcademicRecord.deleteMany({ studentId: alex._id });

  const completedCoursesAlex = [
    { code: 'CS101', grade: 'A', term: 'Fall 2025' },
    { code: 'MA101', grade: 'A-', term: 'Fall 2025' },
    { code: 'ENG101', grade: 'A', term: 'Fall 2025' },
    { code: 'CS102', grade: 'B+', term: 'Spring 2026' },
    { code: 'IT102', grade: 'A', term: 'Spring 2026' },
  ];

  for (const rec of completedCoursesAlex) {
    const course = courseMap.get(rec.code);
    if (!course) continue;
    await AcademicRecord.create({
      studentId: alex._id,
      courseId: course._id,
      status: 'completed',
      grade: rec.grade,
      creditsEarned: course.credits,
      completedTerm: rec.term,
    });
  }

  // Ensure Vishnu's student account and records
  await ensureStudentRecords(courseMap);

  // 7. Seed active demo registrations for Alex Rivera
  // Always reset Alex's enrollments to base demonstration state so scenarios & tests pass deterministically
  await Enrollment.deleteMany({ studentId: alex._id });

  const it201SecA = createdSections.find(
    (s) => s.courseId.toString() === courseMap.get('IT201')._id.toString() && s.sectionCode === 'SEC-A'
  );
  const it202SecA = createdSections.find(
    (s) => s.courseId.toString() === courseMap.get('IT202')._id.toString() && s.sectionCode === 'SEC-A'
  );
  const it203SecA = createdSections.find(
    (s) => s.courseId.toString() === courseMap.get('IT203')._id.toString() && s.sectionCode === 'SEC-A'
  );

  if (it201SecA && it202SecA && it203SecA) {
    await Enrollment.create([
      {
        studentId: alex._id,
        sectionId: it201SecA._id,
        courseId: courseMap.get('IT201')._id,
        academicTerm: 'Fall 2026',
        status: 'registered',
        registrationDate: new Date(Date.now() - 86400000 * 3),
      },
      {
        studentId: alex._id,
        sectionId: it202SecA._id,
        courseId: courseMap.get('IT202')._id,
        academicTerm: 'Fall 2026',
        status: 'registered',
        registrationDate: new Date(Date.now() - 86400000 * 2),
      },
      {
        studentId: alex._id,
        sectionId: it203SecA._id,
        courseId: courseMap.get('IT203')._id,
        academicTerm: 'Fall 2026',
        status: 'registered',
        registrationDate: new Date(Date.now() - 86400000 * 1),
      },
    ]);
  }

  // Ensure IT206 SEC-FULL is filled with 2 students for test scenario
  const it206SecFull = createdSections.find((s) => s.sectionCode === 'SEC-FULL');
  if (it206SecFull) {
    await Enrollment.deleteMany({ sectionId: it206SecFull._id });
    const bethany = await User.findOne({ email: 'bethany@student.edu' });
    const carlos = await User.findOne({ email: 'carlos@student.edu' });
    if (bethany && carlos) {
      await Enrollment.create([
        {
          studentId: bethany._id,
          sectionId: it206SecFull._id,
          courseId: courseMap.get('IT206')._id,
          academicTerm: 'Fall 2026',
          status: 'registered',
        },
        {
          studentId: carlos._id,
          sectionId: it206SecFull._id,
          courseId: courseMap.get('IT206')._id,
          academicTerm: 'Fall 2026',
          status: 'registered',
        },
      ]);
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
  if (shouldDisconnect) {
    await disconnectDB();
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase({ shouldDisconnect: true, resetUsers: false })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
