import { forwardRef } from 'react';

const InputError = forwardRef(function InputError({ message, className = '', ...props }, ref) {
    return message ? (
        <p
            {...props}
            ref={ref}
            className={'text-sm text-red-600 dark:text-red-400 ' + className}
        >
            {message}
        </p>
    ) : null;
});

export default InputError;
