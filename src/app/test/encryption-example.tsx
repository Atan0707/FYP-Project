"use client";

import React, { useState } from 'react';
import { encrypt, decrypt, encryptObject, decryptObject } from '@/services/encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TestData {
  name: string;
  email: string;
  age: number;
}

const EncryptionExample = () => {
  const [text, setText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  
  // Example object
  const testObject: TestData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  };
  
  const [encryptedObject, setEncryptedObject] = useState('');
  const [decryptedObject, setDecryptedObject] = useState<TestData | null>(null);

  const handleEncrypt = () => {
    if (!text) return;
    const encrypted = encrypt(text);
    setEncryptedText(encrypted);
  };

  const handleDecrypt = () => {
    if (!encryptedText) return;
    try {
      const decrypted = decrypt(encryptedText);
      setDecryptedText(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      setDecryptedText('Error decrypting text. Invalid cipher or key.');
    }
  };

  const handleEncryptObject = () => {
    const encrypted = encryptObject(testObject);
    setEncryptedObject(encrypted);
  };

  const handleDecryptObject = () => {
    if (!encryptedObject) return;
    try {
      const decrypted = decryptObject<TestData>(encryptedObject);
      setDecryptedObject(decrypted);
    } catch (error) {
      console.error('Object decryption error:', error);
      setDecryptedObject(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Encryption Service Example</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* String encryption */}
        <Card>
          <CardHeader>
            <CardTitle>String Encryption</CardTitle>
            <CardDescription>Encrypt and decrypt text strings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Text to Encrypt</label>
              <Input 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to encrypt"
              />
            </div>
            
            <Button onClick={handleEncrypt} className="w-full">Encrypt</Button>
            
            {encryptedText && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Encrypted Text</label>
                <div className="p-2 bg-gray-100 rounded-md break-all">
                  {encryptedText}
                </div>
                <Button onClick={handleDecrypt} className="w-full mt-2">Decrypt</Button>
              </div>
            )}
            
            {decryptedText && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Decrypted Text</label>
                <div className="p-2 bg-gray-100 rounded-md break-all">
                  {decryptedText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Object encryption */}
        <Card>
          <CardHeader>
            <CardTitle>Object Encryption</CardTitle>
            <CardDescription>Encrypt and decrypt JavaScript objects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Object to Encrypt</label>
              <div className="p-2 bg-gray-100 rounded-md">
                <pre>{JSON.stringify(testObject, null, 2)}</pre>
              </div>
            </div>
            
            <Button onClick={handleEncryptObject} className="w-full">Encrypt Object</Button>
            
            {encryptedObject && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Encrypted Object</label>
                <div className="p-2 bg-gray-100 rounded-md break-all">
                  {encryptedObject}
                </div>
                <Button onClick={handleDecryptObject} className="w-full mt-2">Decrypt Object</Button>
              </div>
            )}
            
            {decryptedObject && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Decrypted Object</label>
                <div className="p-2 bg-gray-100 rounded-md">
                  <pre>{JSON.stringify(decryptedObject, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Import the encryption service</h3>
            <pre className="bg-gray-100 p-2 rounded-md">
              {`import { encrypt, decrypt, encryptObject, decryptObject } from '@/services/encryption';`}
            </pre>
            
            <Separator className="my-4" />
            
            <h3 className="font-medium mb-2">Encrypt and decrypt a string</h3>
            <pre className="bg-gray-100 p-2 rounded-md">
              {`// Encrypt
const encryptedText = encrypt('Sensitive information');

// Decrypt
const decryptedText = decrypt(encryptedText);`}
            </pre>
            
            <Separator className="my-4" />
            
            <h3 className="font-medium mb-2">Encrypt and decrypt an object</h3>
            <pre className="bg-gray-100 p-2 rounded-md">
              {`// Encrypt an object
const user = { id: 123, name: 'John', email: 'john@example.com' };
const encryptedUser = encryptObject(user);

// Decrypt an object
const decryptedUser = decryptObject(encryptedUser);`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EncryptionExample; 