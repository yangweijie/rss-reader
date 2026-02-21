import { forwardRef } from 'react';

const SecondaryButton = forwardRef(function SecondaryButton({ className = '', disabled, children, ...props }, ref) {
    return (
        <button
            {...props}
            ref={ref}
            disabled={disabled}
            className={
                'inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 ' +
                (disabled ? 'opacity-25 cursor-not-allowed ' : '') +
                className
            }
        >
            {children}
        </button>
    );
});

export default SecondaryButton;