import React, { useState } from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export function Image({ src, alt, className = '', fallbackSrc = '/assets/images/placeholder.png', ...props }: ImageProps) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const handleError = () => {
        setError(true);
    };

    const handleLoad = () => {
        setLoaded(true);
    };

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {!loaded && !error && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
            <img
                src={error ? fallbackSrc : src}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                {...props}
            />
        </div>
    );
}
