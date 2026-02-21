import { forwardRef } from 'react';

const Modal = forwardRef(function Modal({ children, show = false, maxWidth = '2xl', closeable = true, onClose = '' }, ref) {
    return (
        <div ref={ref} className={`fixed inset-0 z-50 overflow-y-auto ${show ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"></div>

            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className={`relative mx-auto w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-all sm:my-8 sm:w-full ${{
                        sm: 'sm:max-w-sm',
                        md: 'sm:max-w-md',
                        lg: 'sm:max-w-lg',
                        xl: 'sm:max-w-xl',
                        '2xl': 'sm:max-w-2xl',
                    }[maxWidth]}`}
                >
                    {closeable && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
});

export default Modal;