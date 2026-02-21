import { forwardRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Dropdown = forwardRef(function Dropdown({ align = 'right', width = '48', contentClasses = '', renderTrigger, children }, ref) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative" ref={ref}>
            {renderTrigger && (
                <button
                    onClick={() => setOpen(!open)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 active:bg-gray-50 dark:active:bg-gray-700 transition"
                >
                    {renderTrigger()}
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            )}
            
            {open && (
                <div className={`fixed inset-0 z-40`} onClick={() => setOpen(false)}></div>
            )}

            {open && (
                <div
                    className={`absolute z-50 mt-2 rounded-md shadow-lg ${
                        align === 'right' ? 'right-0' : 'left-0'
                    } ${{
                        '48': 'w-48',
                        '56': 'w-56',
                        '64': 'w-64',
                    }[width]} bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10`}
                    onClick={() => setOpen(false)}
                >
                    <div className={`py-1 ${contentClasses}`}>{children}</div>
                </div>
            )}
        </div>
    );
});

export default Dropdown;