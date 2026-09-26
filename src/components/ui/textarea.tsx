import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[80px] w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 py-2 text-sm text-[#284a3d] outline-none focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";