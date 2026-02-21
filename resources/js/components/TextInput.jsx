import { forwardRef } from 'react';

const TextInput = forwardRef(function TextInput({ type = 'text', className = '', isFocused = false, ...props }, ref) {
    return (
        <input
            {...props}
            type={type}
            ref={ref}
            className={
                'rounded-md shadow-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 ' +
                className
            }
        />
    );
});

export default TextInput;