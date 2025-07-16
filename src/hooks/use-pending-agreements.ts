import { useQuery } from '@tanstack/react-query';

export const usePendingAgreements = () => {
  return useQuery({
    queryKey: ['pendingAgreementsCount'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/agreements/pending');
        if (!response.ok) {
          throw new Error('Failed to fetch pending agreements');
        }
        const agreements = await response.json();
        // Ensure we return a proper number
        const count = Array.isArray(agreements) ? agreements.length : 0;
        return Math.max(0, count); // Ensure non-negative number
      } catch (error) {
        console.error('Error fetching pending agreements:', error);
        return 0; // Return 0 on error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale for real-time updates
    retry: 1, // Only retry once on failure
  });
}; 