"use client";

import React from 'react'
import CryptoJS from 'crypto-js';
import { Button } from "@/components/ui/button";
import { useState } from 'react';

const TestPage = () => {
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Encrypt
    const ciphertext = CryptoJS.AES.encrypt('test', 'secret key 123').toString();
    
    // Decrypt
    const bytes = CryptoJS.AES.decrypt("U2FsdGVkX19bjd7wwC4HAk/he1JFE5DYJj+H4ulqEi4==", 'atan');
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    // console.log(ciphertext);
    console.log(originalText);

    const sendEmail = async () => {
        try {
            setSending(true);
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: 'harizhakim84@gmail.com',
                    subject: 'Test Email',
                    text: 'This is a test email sent from your Next.js application.'
                }),
            });

            if (response.ok) {
                setSent(true);
            } else {
                console.error('Failed to send email');
            }
        } catch (error) {
            console.error('Error sending email:', error);
        } finally {
            setSending(false);
        }
    };

  return (
    
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <div className="mb-6">
        <p>Original Text: {originalText}</p>
        <p>Ciphertext: {ciphertext}</p>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Email Sender</h2>
        <Button 
          onClick={sendEmail}
          disabled={sending || sent}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {sending ? 'Sending...' : sent ? 'Email Sent!' : 'Send Email to harizhakim84@gmail.com'}
        </Button>
        {sent && <p className="mt-2 text-green-600">Email sent successfully!</p>}
      </div>
    </div>
  )
}

export default TestPage
