import { useQuery } from '@tanstack/react-query';

export const usePendingAgreements = () => {
  return useQuery({
    queryKey: ['pendingAgreementsCount'],
    queryFn: async () => {
      const response = await fetch('/api/agreements/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch pending agreements');
      }
      const agreements = await response.json();
      return agreements.length;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale for real-time updates
  });
}; 