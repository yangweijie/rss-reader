import { forwardRef } from 'react';

const ApplicationLogo = forwardRef(function ApplicationLogo({ className = '', ...props }, ref) {
    return (
        <svg ref={ref} {...props} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#861DD4"/>
            <path d="M2 7V17L12 22V12L2 7Z" fill="#6B17A8"/>
            <path d="M22 7V17L12 22V12L22 7Z" fill="#5B138A"/>
            <path d="M12 22L2 17L12 12L22 17L12 22Z" fill="#4A0F6C"/>
        </svg>
    );
});

export default ApplicationLogo;