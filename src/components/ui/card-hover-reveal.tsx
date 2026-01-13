"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardHoverRevealProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: React.ReactNode;
}

const CardHoverReveal = React.forwardRef<HTMLDivElement, CardHoverRevealProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="initial"
        whileHover="hover"
        className={cn(
          "group relative overflow-hidden cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
CardHoverReveal.displayName = "CardHoverReveal";

interface CardHoverRevealMainProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: React.ReactNode;
}

const CardHoverRevealMain = React.forwardRef<HTMLDivElement, CardHoverRevealMainProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={{
          initial: { scale: 1 },
          hover: { scale: 1.1 },
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn("absolute inset-0 size-full", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
CardHoverRevealMain.displayName = "CardHoverRevealMain";

interface CardHoverRevealContentProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: React.ReactNode;
}

const CardHoverRevealContent = React.forwardRef<HTMLDivElement, CardHoverRevealContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={{
          initial: { y: "100%", opacity: 0 },
          hover: { y: 0, opacity: 1 },
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 p-6",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
CardHoverRevealContent.displayName = "CardHoverRevealContent";

export { CardHoverReveal, CardHoverRevealMain, CardHoverRevealContent };
