/**
 * Script sinh dữ liệu mẫu cho thư viện
 * Chạy: npm install @faker-js/faker mongodb
 * Rồi: node seed.js
 */

const { faker } = require('@faker-js/faker');
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // URL kết nối MongoDB
const dbName = 'libraryDB'; // Tên database

// Số lượng mẫu
const NUM_USERS = 10;
const NUM_AUTHORS = 5;
const NUM_CATEGORIES = 5;
const NUM_BOOKS = 20;
const NUM_BORROWS = 15;
const NUM_NOTIFICATIONS = 10;
const NUM_FINES = 5;
const NUM_RESERVATIONS = 8;
const NUM_TRANSACTIONS = 10;
const NUM_REVIEWS = 12;

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công');

    const db = client.db(dbName);

    // Xóa dữ liệu cũ
    await db.collection('users').deleteMany({});
    await db.collection('authors').deleteMany({});
    await db.collection('categories').deleteMany({});
    await db.collection('books').deleteMany({});
    await db.collection('borrows').deleteMany({});
    await db.collection('notifications').deleteMany({});
    await db.collection('fines').deleteMany({});
    await db.collection('reservations').deleteMany({});
    await db.collection('transactions').deleteMany({});
    await db.collection('reviews').deleteMany({});

    // ===== USERS =====
    const users = Array.from({ length: NUM_USERS }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      passwordHash: faker.string.alphanumeric(32), // giả lập hash
      role: faker.helpers.arrayElement(['member', 'librarian']),
      joinDate: faker.date.past(),
    }));
    const usersResult = await db.collection('users').insertMany(users);
    console.log(`📦 Inserted ${usersResult.insertedCount} users`);

    // ===== AUTHORS =====
    const authors = Array.from({ length: NUM_AUTHORS }, () => ({
      name: faker.person.fullName(),
      bio: faker.lorem.paragraph(),
      birthDate: faker.date.past(50),
    }));
    const authorsResult = await db.collection('authors').insertMany(authors);
    console.log(`📦 Inserted ${authorsResult.insertedCount} authors`);

    // ===== CATEGORIES =====
    const categories = Array.from({ length: NUM_CATEGORIES }, () => ({
      name: faker.commerce.department(),
      description: faker.lorem.sentence(),
    }));
    const categoriesResult = await db.collection('categories').insertMany(categories);
    console.log(`📦 Inserted ${categoriesResult.insertedCount} categories`);

    // ===== BOOKS =====
    const books = Array.from({ length: NUM_BOOKS }, () => ({
      title: faker.commerce.productName(),
      authorId: faker.helpers.arrayElement(Object.values(authorsResult.insertedIds)),
      categoryId: faker.helpers.arrayElement(Object.values(categoriesResult.insertedIds)),
      publishedYear: faker.date.past(20).getFullYear(),
      ISBN: faker.string.alphanumeric(13).toUpperCase(),
      copiesAvailable: faker.number.int({ min: 1, max: 10 }),
    }));
    const booksResult = await db.collection('books').insertMany(books);
    console.log(`📦 Inserted ${booksResult.insertedCount} books`);

    // ===== BORROWS =====
    const borrows = Array.from({ length: NUM_BORROWS }, () => {
      const borrowDate = faker.date.past(1);
      const dueDate = faker.date.soon({ days: 14, refDate: borrowDate });
      return {
        userId: faker.helpers.arrayElement(Object.values(usersResult.insertedIds)),
        bookId: faker.helpers.arrayElement(Object.values(booksResult.insertedIds)),
        borrowDate,
        dueDate,
        returnDate: faker.datatype.boolean() ? faker.date.between({ from: borrowDate, to: dueDate }) : null,
      };
    });
    await db.collection('borrows').insertMany(borrows);
    console.log(`📦 Inserted ${borrows.length} borrows`);

    // ===== NOTIFICATIONS =====
    const notifications = Array.from({ length: NUM_NOTIFICATIONS }, () => {
      const type = faker.helpers.arrayElement(['general', 'personal']);
      return {
        title: faker.lorem.sentence(),
        message: faker.lorem.paragraph(),
        type,
        userId: type === 'personal' ? faker.helpers.arrayElement(Object.values(usersResult.insertedIds)) : null,
        createdAt: faker.date.recent(),
      };
    });
    await db.collection('notifications').insertMany(notifications);
    console.log(`📦 Inserted ${notifications.length} notifications`);

    // ===== FINES =====
    const fines = Array.from({ length: NUM_FINES }, () => ({
      userId: faker.helpers.arrayElement(Object.values(usersResult.insertedIds)),
      amount: faker.number.float({ min: 1, max: 50, precision: 0.01 }),
      reason: faker.lorem.sentence(),
      paid: faker.datatype.boolean(),
    }));
    await db.collection('fines').insertMany(fines);
    console.log(`📦 Inserted ${fines.length} fines`);

    // ===== RESERVATIONS =====
    const reservations = Array.from({ length: NUM_RESERVATIONS }, () => ({
      userId: faker.helpers.arrayElement(Object.values(usersResult.insertedIds)),
      bookId: faker.helpers.arrayElement(Object.values(booksResult.insertedIds)),
      reservationDate: faker.date.recent(30),
      status: faker.helpers.arrayElement(['pending', 'fulfilled', 'cancelled']),
    }));
    await db.collection('reservations').insertMany(reservations);
    console.log(`📦 Inserted ${reservations.length} reservations`);

    // ===== TRANSACTIONS =====
    const transactions = Array.from({ length: NUM_TRANSACTIONS }, () => ({
      userId: faker.helpers.arrayElement(Object.values(usersResult.insertedIds)),
      amount: faker.number.float({ min: 5, max: 100, precision: 0.01 }),
      type: faker.helpers.arrayElement(['fine_payment', 'membership_fee']),
      date: faker.date.recent(60),
    }));
    await db.collection('transactions').insertMany(transactions);
    console.log(`📦 Inserted ${transactions.length} transactions`);

    // ===== REVIEWS =====
    const reviews = Array.from({ length: NUM_REVIEWS }, () => ({
      userId: faker.helpers.arrayElement(Object.values(usersResult.insertedIds)),
      bookId: faker.helpers.arrayElement(Object.values(booksResult.insertedIds)),
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.sentence(),
      createdAt: faker.date.recent(100),
    }));
    await db.collection('reviews').insertMany(reviews);
    console.log(`📦 Inserted ${reviews.length} reviews`);

    console.log('🎉 Hoàn tất sinh dữ liệu mẫu!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await client.close();
  }
})();
