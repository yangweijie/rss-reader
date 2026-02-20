import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-body': theme('colors.gray.700'),
                        '--tw-prose-headings': theme('colors.gray.900'),
                        '--tw-prose-lead': theme('colors.gray.600'),
                        '--tw-prose-links': theme('colors.violet.600'),
                        '--tw-prose-bold': theme('colors.gray.900'),
                        '--tw-prose-counters': theme('colors.gray.500'),
                        '--tw-prose-bullets': theme('colors.gray.300'),
                        '--tw-prose-hr': theme('colors.gray.200'),
                        '--tw-prose-quotes': theme('colors.gray.900'),
                        '--tw-prose-quote-borders': theme('colors.gray.200'),
                        '--tw-prose-captions': theme('colors.gray.500'),
                        '--tw-prose-code': theme('colors.violet.600'),
                        '--tw-prose-pre-code': theme('colors.gray.200'),
                        '--tw-prose-pre-bg': theme('colors.gray.800'),
                        '--tw-prose-th-borders': theme('colors.gray.200'),
                        '--tw-prose-td-borders': theme('colors.gray.200'),
                    },
                },
            }),
        },
    },

    plugins: [forms, typography],
};
