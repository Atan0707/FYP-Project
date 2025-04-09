import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-center items-center h-64 text-red-500">
        <div className="bg-red-50 p-6 rounded-lg shadow-md flex items-center">
          <AlertCircle className="mr-3 h-6 w-6" />
          <div>
            <h3 className="font-semibold">Error</h3>
            <p>{error.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 