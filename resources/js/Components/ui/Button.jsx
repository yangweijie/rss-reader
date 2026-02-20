import * as React from 'react';
import { cn } from '@/lib/utils';

const Button = React.forwardRef(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-[#861DD4] text-white hover:bg-[#6B17A8]',
            outline: 'border border-[#E8E8E8] bg-white hover:bg-gray-50',
            ghost: 'hover:bg-gray-100',
            danger: 'bg-red-500 text-white hover:bg-red-600',
        };

        const sizes = {
            default: 'h-9 px-4 text-sm',
            sm: 'h-8 px-3 text-xs',
            lg: 'h-10 px-6 text-base',
            icon: 'h-9 w-9',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#861DD4] disabled:pointer-events-none disabled:opacity-50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
