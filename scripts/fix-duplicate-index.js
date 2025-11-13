// scripts/fix-duplicate-index.js
// Bu script Article koleksiyonundaki duplicate slug index'ini temizler

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB bağlandı');
    return true;
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err.message);
    return false;
  }
};

const fixDuplicateIndex = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('articles');
    
    // Mevcut index'leri listele
    console.log('\nMevcut index\'ler:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log('-', JSON.stringify(index));
    });
    
    // slug_1 index'ini kontrol et ve sil
    const slugIndex = indexes.find(idx => 
      idx.key && idx.key.slug === 1 && idx.name === 'slug_1'
    );
    
    if (slugIndex) {
      console.log('\nDuplicate slug_1 index bulundu, siliniyor...');
      await collection.dropIndex('slug_1');
      console.log('✓ slug_1 index başarıyla silindi');
    } else {
      console.log('\n✓ Duplicate slug_1 index bulunamadı (zaten temiz)');
    }
    
    // Güncel index'leri tekrar listele
    console.log('\nGüncel index\'ler:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log('-', JSON.stringify(index));
    });
    
    console.log('\n✓ İşlem tamamlandı!');
    process.exit(0);
  } catch (err) {
    if (err.code === 27) {
      // Index bulunamadı hatası (zaten silinmiş)
      console.log('✓ Index zaten mevcut değil');
      process.exit(0);
    } else {
      console.error('Hata:', err.message);
      process.exit(1);
    }
  }
};

const run = async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  await fixDuplicateIndex();
  await mongoose.connection.close();
};

run();

