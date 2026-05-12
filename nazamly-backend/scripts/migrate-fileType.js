require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const db = mongoose.connection.db;
  const collection = db.collection('transcriptuploads');

  const imageResult = await collection.updateMany(
    { fileType: { $in: ['image/jpeg', 'image/png', 'image/webp'] } },
    { $set: { fileType: 'image' } }
  );
  console.log(`Updated ${imageResult.modifiedCount} image documents.`);

  const pdfResult = await collection.updateMany(
    { fileType: 'application/pdf' },
    { $set: { fileType: 'pdf' } }
  );
  console.log(`Updated ${pdfResult.modifiedCount} PDF documents.`);

  console.log('Migration complete.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
