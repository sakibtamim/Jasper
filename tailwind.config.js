/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./web/**/*.{js,ts,jsx,tsx}",
        "./public/**/*.html",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#ff6ad5',
                    secondary: '#00e5ff',
                },
            },
        },
    },
    plugins: [],
}
