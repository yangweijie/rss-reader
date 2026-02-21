import { forwardRef } from 'react';

const Checkbox = forwardRef(function Checkbox({ className = '', ...props }, ref) {
    return (
        <input
            {...props}
            ref={ref}
            type="checkbox"
            className={'rounded border-gray-300 dark:border-gray-700 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800 ' + className}
        />
    );
});

export default Checkbox;