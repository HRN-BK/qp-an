"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  current: number
  total: number
  className?: string
  showLabel?: boolean
  showPercentage?: boolean
  variant?: "default" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
}

const variantClasses = {
  default: "text-foreground",
  success: "text-green-600",
  warning: "text-yellow-600", 
  danger: "text-red-600"
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2", 
  lg: "h-3"
}

export function ProgressBar({
  current,
  total,
  className,
  showLabel = true,
  showPercentage = false,
  variant = "default",
  size = "md"
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  return (
    <div className={cn("w-full space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn("text-sm font-medium", variantClasses[variant])}>
            {current}/{total}
          </span>
          {showPercentage && (
            <span className={cn("text-sm", variantClasses[variant])}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <Progress 
        value={percentage} 
        className={cn(sizeClasses[size], {
          "[&>*]:bg-green-500": variant === "success",
          "[&>*]:bg-yellow-500": variant === "warning", 
          "[&>*]:bg-red-500": variant === "danger"
        })}
      />
    </div>
  )
}
