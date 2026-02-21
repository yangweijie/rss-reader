import { forwardRef } from 'react';

const InputLabel = forwardRef(function InputLabel({ value, className = '', children, ...props }, ref) {
    return (
        <label
            {...props}
            ref={ref}
            className={'block text-sm font-medium text-gray-700 dark:text-gray-300 ' + className}
        >
            {value ?? children}
        </label>
    );
});

export default InputLabel;