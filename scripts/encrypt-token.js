import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("🔒 GitHub Token Encryptor for Static Site\n");

rl.question('1. Enter your GitHub Fine-grained Personal Access Token: ', (token) => {
  rl.question('2. Enter a shared password for your team to use: ', (password) => {
    
    // 1. Generate salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12); // GCM standard
    
    // 2. Derive key from password using PBKDF2
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) throw err;
      
      // 3. Encrypt the token using AES-256-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      const result = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag,
        ciphertext: encrypted
      };
      
      console.log("\n✅ Encryption Successful!\n");
      console.log("Copy the following JSON object into your app.js file:\n");
      console.log(JSON.stringify(result, null, 2));
      console.log("\n⚠️ IMPORTANT: Only share the password with your team. DO NOT put the password or raw token in your code.");
      
      rl.close();
    });
  });
});
