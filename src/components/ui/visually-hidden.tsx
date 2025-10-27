"use client"

import * as React from "react"
import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden"

import { cn } from "@/lib/utils"

function VisuallyHidden({
  className,
  ...props
}: React.ComponentProps<typeof VisuallyHiddenPrimitive.Root>) {
  return (
    <VisuallyHiddenPrimitive.Root
      className={cn(
        "absolute -m-px h-px w-px overflow-hidden whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

export { VisuallyHidden }
