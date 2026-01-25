import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to update:');
  console.log(`UPDATE users SET password = '${hash}';`);
  
  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('\nVerification:', isValid ? '✅ Valid' : '❌ Invalid');
}

generateHash();
