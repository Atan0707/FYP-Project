'use client';

import { useState } from 'react';
import { generateSecurePDFUrl, generateSecurePDFToken, verifySecurePDFToken } from '@/lib/secureTokens';

export default function SecurePDFTestPage() {
  const [distributionId, setDistributionId] = useState('');
  const [email, setEmail] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [token, setToken] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ distributionId?: string; email?: string; expiresAt?: number; error?: string } | null>(null);

  const generateToken = () => {
    if (!distributionId || !email) {
      alert('Please enter both distribution ID and email');
      return;
    }
    
    try {
      const url = generateSecurePDFUrl(distributionId, email);
      const tokenOnly = generateSecurePDFToken(distributionId, email);
      setGeneratedUrl(url);
      setToken(tokenOnly);
    } catch (error) {
      console.error('Error generating token:', error);
      alert('Error generating token: ' + (error as Error).message);
    }
  };

  const verifyToken = () => {
    if (!token) {
      alert('Please generate a token first');
      return;
    }
    
    try {
      const result = verifySecurePDFToken(token);
      setVerificationResult(result);
    } catch (error) {
      console.error('Error verifying token:', error);
      setVerificationResult({ error: (error as Error).message });
    }
  };

  const testPDFAccess = async () => {
    if (!generatedUrl) {
      alert('Please generate a URL first');
      return;
    }
    
    try {
      const response = await fetch(generatedUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-agreement-${distributionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('PDF downloaded successfully!');
      } else {
        const errorText = await response.text();
        alert(`Error accessing PDF: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error testing PDF access:', error);
      alert('Error testing PDF access: ' + (error as Error).message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Secure PDF Token Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Generate Secure Token</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Distribution ID:
            <input
              type="text"
              value={distributionId}
              onChange={(e) => setDistributionId(e.target.value)}
              placeholder="Enter distribution ID"
              style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
            />
          </label>
        </div>
        <button onClick={generateToken} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Generate Token
        </button>
      </div>

      {generatedUrl && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Generated Secure URL:</h4>
          <p style={{ wordBreak: 'break-all', fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
            {generatedUrl}
          </p>
          <button onClick={testPDFAccess} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
            Test PDF Access
          </button>
        </div>
      )}

      {token && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Generated Token:</h4>
          <p style={{ wordBreak: 'break-all', fontSize: '10px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
            {token}
          </p>
          <button onClick={verifyToken} style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}>
            Verify Token
          </button>
        </div>
      )}

      {verificationResult && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: verificationResult.error ? '#f8d7da' : '#d4edda', borderRadius: '4px' }}>
          <h4>Verification Result:</h4>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(verificationResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
        <h4>How to use:</h4>
        <ol>
          <li>Enter a valid distribution ID from your database</li>
          <li>Enter the email address of a participant in that agreement</li>
          <li>Click "Generate Token" to create a secure URL</li>
          <li>Click "Test PDF Access" to verify the URL works</li>
          <li>Use "Verify Token" to check token validity and expiration</li>
        </ol>
        <p><strong>Note:</strong> The PDF will only be accessible if:</p>
        <ul>
          <li>The agreement has been completed (admin signed)</li>
          <li>The email address has access to that specific agreement</li>
          <li>The token hasn't expired (72 hours)</li>
        </ul>
      </div>
    </div>
  );
} 