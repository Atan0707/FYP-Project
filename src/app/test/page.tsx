import React from 'react'
import CryptoJS from 'crypto-js';

const TestPage = () => {

    // Encrypt
    const ciphertext = CryptoJS.AES.encrypt('test', 'secret key 123').toString();
    
    // Decrypt
    const bytes = CryptoJS.AES.decrypt("U2FsdGVkX18nXwbmkLf46rIfqlue26AAL1ZaPqkFbKY=", 'secret key 123');
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    // console.log(ciphertext);
    console.log(originalText);


  return (
    
    <div>
      <p>Original Text: {originalText}</p>
      <p>Ciphertext: {ciphertext}</p>
    </div>
  )
}

export default TestPage
