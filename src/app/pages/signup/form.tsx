'use client';

import { useState } from 'react';
import { signUp } from './actions';

export default function SignUpForm() {
  const [error, setError] = useState<string>('');
  
  async function handleSubmit(formData: FormData) {
    try {
      const result = await signUp(formData);
      if (result.error) {
        setError(result.error);
      } else {
        // Redirect to login or dashboard
        window.location.href = '/login';
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md mx-auto mt-8">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <label htmlFor="ic" className="block text-sm font-medium">
          IC Number
        </label>
        <input
          id="ic"
          name="ic"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter your IC number"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter your phone number"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Create a strong password"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
      >
        Sign Up
      </button>
    </form>
  );
}
