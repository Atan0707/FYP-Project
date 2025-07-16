interface NotificationBadgeProps {
  count: number | string;
  className?: string;
}

export const NotificationBadge = ({ count, className = "" }: NotificationBadgeProps) => {
  const displayCount = Number(count) > 99 ? '99+' : count;
  
  if (!count || Number(count) <= 0) {
    return null;
  }

  return (
    <span 
      className={`bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px] text-[10px] font-medium ${className}`}
    >
      {displayCount}
    </span>
  );
}; 