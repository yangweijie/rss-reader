import { forwardRef } from 'react';

const DangerButton = forwardRef(function DangerButton({ className = '', disabled, children, ...props }, ref) {
    return (
        <button
            {...props}
            ref={ref}
            disabled={disabled}
            className={
                'inline-flex items-center justify-center px-4 py-2 bg-red-600 dark:bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 dark:hover:bg-red-500 focus:bg-red-500 dark:focus:bg-red-500 active:bg-red-700 dark:active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 ' +
                (disabled ? 'opacity-25 cursor-not-allowed ' : '') +
                className
            }
        >
            {children}
        </button>
    );
});

export default DangerButton;