import CryptoJS from 'crypto-js';

/**
 * Encryption service for securing sensitive data
 * Uses AES encryption from CryptoJS
 */

// The secret key should be stored in an environment variable
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-here';

// Add kill switch to disable encryption
const isEncryptionEnabled = true;

/**
 * Encrypts a string using AES encryption
 * @param text - The plain text to encrypt
 * @returns The encrypted cipher text
 */
export const encrypt = (text: string): string => {
  if (!isEncryptionEnabled) return text;
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypts an encrypted string
 * @param ciphertext - The encrypted text to decrypt
 * @returns The decrypted plain text
 */
export const decrypt = (ciphertext: string): string => {
  if (!isEncryptionEnabled) return ciphertext;
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Encrypts an object by converting it to JSON and encrypting the result
 * @param data - The object to encrypt
 * @returns The encrypted cipher text
 */
export const encryptObject = <T>(data: T): string => {
  if (!isEncryptionEnabled) return JSON.stringify(data);
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString);
};

/**
 * Decrypts an encrypted string and parses it as JSON
 * @param ciphertext - The encrypted text to decrypt
 * @returns The decrypted object
 */
export const decryptObject = <T>(ciphertext: string): T => {
  if (!isEncryptionEnabled) {
    try {
      return JSON.parse(ciphertext) as T;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw new Error('Invalid JSON string');
    }
  }
  const decryptedString = decrypt(ciphertext);
  return JSON.parse(decryptedString) as T;
};

/**
 * Generates a hash of the input string using SHA256
 * @param input - The string to hash
 * @returns The hash as a hex string
 */
export const generateHash = (input: string): string => {
  if (!isEncryptionEnabled) return input;
  return CryptoJS.SHA256(input).toString();
};

/**
 * Compares a plain text input with a stored hash
 * @param input - The plain text to verify
 * @param hash - The hash to compare against
 * @returns True if the input matches the hash
 */
export const verifyHash = (input: string, hash: string): boolean => {
  if (!isEncryptionEnabled) return input === hash;
  const inputHash = generateHash(input);
  return inputHash === hash;
};
