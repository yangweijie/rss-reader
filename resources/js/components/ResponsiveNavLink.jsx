import { forwardRef, useState } from 'react';

const ResponsiveNavLink = forwardRef(function ResponsiveNavLink({ active = false, className = '', children, ...props }, ref) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={
                    'flex items-center w-full px-3 py-2 text-left text-base font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:text-gray-900 dark:focus:text-gray-100 focus:bg-gray-50 dark:focus:bg-gray-800 transition duration-150 ease-in-out ' +
                    (active
                        ? 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                        : '')
                }
            >
                {children}
            </button>
        </div>
    );
});

export default ResponsiveNavLink;