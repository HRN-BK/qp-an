import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CEFRBadgeProps {
  level?: string;
  className?: string;
}

export function CEFRBadge({ level, className }: CEFRBadgeProps) {
  if (!level) return null;

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'A1':
        return {
          emoji: '🟢',
          variant: 'outline' as const,
          className: 'border-green-500 text-green-700 bg-green-50'
        };
      case 'A2':
        return {
          emoji: '🔵',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-700'
        };
      case 'B1':
        return {
          emoji: '🟡',
          variant: 'default' as const,
          className: 'bg-yellow-100 text-yellow-700'
        };
      case 'B2':
        return {
          emoji: '🟠',
          variant: 'default' as const,
          className: 'bg-orange-100 text-orange-700'
        };
      case 'C1':
        return {
          emoji: '🔴',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-700'
        };
      case 'C2':
        return {
          emoji: '🟣',
          variant: 'destructive' as const,
          className: 'bg-purple-100 text-purple-700'
        };
      default:
        return {
          emoji: '',
          variant: 'secondary' as const,
          className: ''
        };
    }
  };

  const { emoji, variant, className: levelClassName } = getLevelStyles(level);

  return (
    <Badge 
      variant={variant}
      className={cn(levelClassName, className)}
    >
      {emoji} {level}
    </Badge>
  );
}

export function getCEFRLevelName(level: string): string {
  switch (level) {
    case 'A1': return 'Beginner';
    case 'A2': return 'Elementary';
    case 'B1': return 'Intermediate';
    case 'B2': return 'Upper Intermediate';
    case 'C1': return 'Advanced';
    case 'C2': return 'Proficient';
    default: return level;
  }
}
