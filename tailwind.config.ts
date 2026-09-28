import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        }
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        '2xl': 'calc(var(--radius) + 8px)',
                        '3xl': 'calc(var(--radius) + 16px)',
                },
                fontFamily: {
                        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
                        serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
                        mono: ['var(--font-geist-mono)', 'monospace'],
                },
                boxShadow: {
                        'festive': '0 4px 12px rgba(15, 76, 58, 0.08), 0 12px 32px rgba(15, 76, 58, 0.06)',
                        'gold': '0 4px 12px rgba(212, 164, 55, 0.15)',
                },
                backgroundImage: {
                        'gradient-evergreen': 'linear-gradient(135deg, var(--evergreen) 0%, var(--evergreen-dark) 100%)',
                        'gradient-gold': 'linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, var(--gold-dark) 100%)',
                        'gradient-festive': 'linear-gradient(135deg, var(--evergreen-dark) 0%, var(--evergreen) 50%, var(--berry) 100%)',
                },
                animation: {
                        'fade-in-up': 'fade-in-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                        'shimmer': 'shimmer 2.5s infinite',
                },
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
