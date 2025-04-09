import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary shadow-md"></div>
      </div>
    </div>
  );
} 