/**
 * Format a date string to a localized date format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a currency value to Malaysian Ringgit format
 */
export const formatCurrency = (value: number): string => {
  return `RM ${value.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format a status string to a more readable format
 * Converts snake_case to Title Case and replaces underscores with spaces
 */
export const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get a color for a status
 */
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '#f59e0b', // Amber
    pending_admin: '#ef4444', // Red
    signed: '#3b82f6', // Blue
    rejected: '#dc2626', // Red
    completed: '#10b981', // Green
  }
  
  return statusMap[status] || '#6b7280' // Default gray
}

/**
 * Get a badge variant based on status
 */
export const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'pending_admin':
    case 'rejected':
      return 'destructive'
    case 'signed':
    case 'completed':
      return 'default'
    case 'pending':
      return 'secondary'
    default:
      return 'outline'
  }
} 