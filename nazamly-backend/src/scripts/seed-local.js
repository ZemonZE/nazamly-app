/**
 * seed-local.js — Dynamic Native JSON Seeder
 * 
 * PURPOSE:
 *   Hydrates a fresh local MongoDB database using exported JSON files
 *   from the data-backup/ directory. Designed for the frontend team
 *   to bootstrap their local environments.
 * 
 * USAGE:
 *   npm run seed:local
 * 
 * WARNING:
 *   This script DROPS existing collections before inserting.
 *   Do NOT run against a production database.
 * 
 * HOW IT WORKS:
 *   1. Reads every .json file in the data-backup/ directory.
 *   2. Derives the collection name from the filename (e.g., users.json → users).
 *   3. Bypasses Mongoose schemas entirely — uses the native MongoDB driver
 *      via mongoose.connection.db.collection() for maximum compatibility.
 *   4. Drops the existing collection (if any), then inserts the parsed documents.
 *   5. MongoDB automatically creates the collection on insertMany.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────────
const BACKUP_DIR = path.resolve(__dirname, '../../data-backup');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in your .env file.');
  console.error('   Please set MONGO_URI to your local MongoDB connection string.');
  process.exit(1);
}

// ── Main Seeder ────────────────────────────────────────────────────────────────
async function seed() {
  console.log('═'.repeat(60));
  console.log('  🌱 Nazamly Local Database Seeder');
  console.log('═'.repeat(60));
  console.log(`📂 Backup directory: ${BACKUP_DIR}`);
  console.log(`🔗 Target database:  ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}\n`);

  // 1. Validate backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ Backup directory not found: ${BACKUP_DIR}`);
    console.error('   Please ensure the data-backup/ folder exists in the backend root.');
    process.exit(1);
  }

  // 2. Discover all .json files
  const allFiles = fs.readdirSync(BACKUP_DIR);
  const jsonFiles = allFiles.filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.error('❌ No .json files found in the backup directory.');
    process.exit(1);
  }

  console.log(`📋 Found ${jsonFiles.length} JSON file(s) to seed:\n`);

  // 3. Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.\n');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const db = mongoose.connection.db;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 4. Process each JSON file
  for (const file of jsonFiles) {
    const filePath = path.join(BACKUP_DIR, file);
    const collectionName = path.basename(file, '.json');

    try {
      // Read and parse the JSON file
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const documents = JSON.parse(rawContent);

      // Validate parsed content is an array
      if (!Array.isArray(documents)) {
        console.warn(`   ⚠️  ${file} — Skipped (content is not a JSON array)`);
        skipCount++;
        continue;
      }

      if (documents.length === 0) {
        console.warn(`   ⚠️  ${file} — Skipped (empty array, 0 documents)`);
        skipCount++;
        continue;
      }

      // Drop existing collection (safe — catches error if collection doesn't exist)
      try {
        await db.collection(collectionName).drop();
      } catch (dropError) {
        // Collection didn't exist — this is expected and safe to ignore
      }

      // Insert documents using the native driver (bypasses Mongoose schemas)
      const result = await db.collection(collectionName).insertMany(documents);

      console.log(`   ✅ ${collectionName.padEnd(30)} → ${result.insertedCount} documents inserted`);
      successCount++;

    } catch (err) {
      console.error(`   ❌ ${collectionName.padEnd(30)} → FAILED: ${err.message}`);
      errorCount++;
    }
  }

  // 5. Summary Report
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 Seeding Complete');
  console.log('═'.repeat(60));
  console.log(`   ✅ Successful: ${successCount}`);
  if (skipCount > 0) console.log(`   ⚠️  Skipped:    ${skipCount}`);
  if (errorCount > 0) console.log(`   ❌ Failed:     ${errorCount}`);
  console.log(`   📦 Total files: ${jsonFiles.length}`);
  console.log('═'.repeat(60));

  // 6. Clean exit
  await mongoose.disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

// ── Execute ────────────────────────────────────────────────────────────────────
seed().catch(err => {
  console.error('💥 Unexpected fatal error:', err);
  process.exit(1);
});
