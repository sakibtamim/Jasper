import { useState, ImgHTMLAttributes } from "@jasper/elements";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  imgClassName?: string;
}

export function Image({
  src,
  alt,
  className = "",
  imgClassName = "",
  fallbackSrc = "/assets/images/placeholder.png",
  ...props
}: ImageProps) {
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
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        {...props}
      />
    </div>
  );
}
