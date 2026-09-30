import {
    HTMLAttributes,
    KeyboardEvent,
    React,
    MouseEvent as ReactMouseEvent,
    TouchEvent as ReactTouchEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from '@jasper/elements';

export interface SeekBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** Current playback elapsed time in seconds */
    currentTime?: number;
    /** Total track duration in seconds (0 or negative represents indeterminate/live stream) */
    duration?: number;
    /** Whether the seek bar is interactive or disabled (e.g. when idle or no song playing) */
    disabled?: boolean;
    /** Whether playback is a live stream or radio with indeterminate length */
    isLive?: boolean;
    /** Whether to display the elapsed vs total duration timestamps */
    showTime?: boolean;
    /** Position/layout of the time indicator */
    timePosition?: 'sides' | 'stacked' | 'bottom';
    /** Sizing variant */
    size?: 'sm' | 'md' | 'lg';
    /** Callback fired when user commits a seek position (via click or drag release) */
    onSeek?: (targetSeconds: number) => void | Promise<void>;
    /** Callback fired continuously while user scrubs / drags the thumb */
    onChange?: (targetSeconds: number) => void;
    /** Custom time formatter */
    formatTime?: (seconds: number) => string;
    /** Accessible label */
    ariaLabel?: string;
}

export function formatDurationDefault(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SeekBar({
    currentTime = 0,
    duration = 0,
    disabled = false,
    isLive = false,
    showTime = true,
    timePosition = 'sides',
    size = 'md',
    onSeek,
    onChange,
    formatTime = formatDurationDefault,
    ariaLabel = 'Audio seek bar',
    className = '',
    ...props
}: SeekBarProps) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [scrubTime, setScrubTime] = useState<number | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    const effectiveDuration = Math.max(0, duration);
    const isStreamOrLive = isLive || effectiveDuration <= 0;
    const isInteractive = !disabled && !isStreamOrLive;

    // Displayed current time (optimistic during dragging)
    const activeTime =
        isDragging && scrubTime !== null
            ? scrubTime
            : Math.max(
                  0,
                  Math.min(currentTime, effectiveDuration > 0 ? effectiveDuration : currentTime),
              );

    const progressPercent =
        effectiveDuration > 0
            ? Math.min(100, Math.max(0, (activeTime / effectiveDuration) * 100))
            : 0;

    const calculateTimeFromClientX = useCallback(
        (clientX: number): number => {
            if (!trackRef.current || effectiveDuration <= 0) return 0;
            const rect = trackRef.current.getBoundingClientRect();
            if (rect.width <= 0) return 0;
            const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const ratio = offsetX / rect.width;
            return Math.round(ratio * effectiveDuration);
        },
        [effectiveDuration],
    );

    // Keep ref to latest scrub value for window event listener
    const scrubTimeRef = useRef<number>(0);
    scrubTimeRef.current = scrubTime ?? activeTime;

    const handlePointerDown = (clientX: number) => {
        if (!isInteractive) return;
        const targetSeconds = calculateTimeFromClientX(clientX);
        setIsDragging(true);
        setScrubTime(targetSeconds);
        scrubTimeRef.current = targetSeconds;
        onChange?.(targetSeconds);
    };

    // Attach global listeners during dragging so cursor leaves don't interrupt scrub
    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => {
            if (!isInteractive) return;
            const targetSeconds = calculateTimeFromClientX(e.clientX);
            setScrubTime(targetSeconds);
            scrubTimeRef.current = targetSeconds;
            onChange?.(targetSeconds);
        };

        const onMouseUp = () => {
            setIsDragging(false);
            const finalSeconds = scrubTimeRef.current;
            setScrubTime(null);
            onSeek?.(finalSeconds);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isInteractive || e.touches.length === 0) return;
            const targetSeconds = calculateTimeFromClientX(e.touches[0].clientX);
            setScrubTime(targetSeconds);
            scrubTimeRef.current = targetSeconds;
            onChange?.(targetSeconds);
        };

        const onTouchEnd = () => {
            setIsDragging(false);
            const finalSeconds = scrubTimeRef.current;
            setScrubTime(null);
            onSeek?.(finalSeconds);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isDragging, isInteractive, calculateTimeFromClientX, onChange, onSeek]);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // Primary click only
        handlePointerDown(e.clientX);
    };

    const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
        if (e.touches.length > 0) {
            handlePointerDown(e.touches[0].clientX);
        }
    };

    const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!isInteractive || isDragging || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const ratio = offsetX / rect.width;
        setHoverTime(Math.round(ratio * effectiveDuration));
        setHoverPos(offsetX);
    };

    const handleMouseEnter = () => {
        if (isInteractive && !isDragging) {
            setIsHovering(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setHoverTime(null);
        setHoverPos(null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive || effectiveDuration <= 0) return;
        let nextTime: number | null = null;
        const step = 5;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            nextTime = Math.max(0, activeTime - step);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextTime = Math.min(effectiveDuration, activeTime + step);
        } else if (e.key === 'Home') {
            e.preventDefault();
            nextTime = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            nextTime = effectiveDuration;
        }

        if (nextTime !== null) {
            onSeek?.(nextTime);
            onChange?.(nextTime);
        }
    };

    // Track sizing styles
    const trackHeight = {
        sm: 'h-1 group-hover:h-1.5',
        md: 'h-1.5 group-hover:h-2',
        lg: 'h-2 group-hover:h-2.5',
    }[size];

    const thumbSize = {
        sm: 'w-2.5 h-2.5 -top-[3px]',
        md: 'w-3.5 h-3.5 -top-1',
        lg: 'w-4 h-4 -top-1',
    }[size];

    const timeTextClasses = 'text-xs font-mono text-gray-500 dark:text-gray-400 select-none';

    return (
        <div
            className={`w-full flex items-center gap-3 select-none ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${className}`}
            {...props}
        >
            {/* Left Time (when timePosition is 'sides') */}
            {showTime && timePosition === 'sides' && (
                <span className={`${timeTextClasses} min-w-[42px] text-right`}>
                    {disabled ? '--:--' : formatTime(activeTime)}
                </span>
            )}

            {/* Scrubber Slider Container */}
            <div
                className={`relative flex-1 py-2 group ${
                    isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onKeyDown={handleKeyDown}
                role="slider"
                tabIndex={isInteractive ? 0 : -1}
                aria-label={ariaLabel}
                aria-valuenow={activeTime}
                aria-valuemin={0}
                aria-valuemax={effectiveDuration}
                aria-valuetext={
                    isStreamOrLive
                        ? 'Live Stream'
                        : `${formatTime(activeTime)} of ${formatTime(effectiveDuration)}`
                }
                aria-disabled={!isInteractive}
            >
                {/* Background Track */}
                <div
                    ref={trackRef}
                    className={`w-full rounded-full transition-all duration-150 relative overflow-visible ${
                        isStreamOrLive
                            ? 'h-1.5 bg-gradient-to-r from-red-500/20 via-brand-primary/20 to-purple-500/20'
                            : `bg-gray-200 dark:bg-gray-700 ${trackHeight}`
                    }`}
                >
                    {/* Live Stream / Indeterminate Progress Pulse */}
                    {isStreamOrLive && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-brand-primary to-purple-500 animate-pulse opacity-80" />
                    )}

                    {/* Filled Progress Bar */}
                    {!isStreamOrLive && (
                        <div
                            className={`h-full rounded-full bg-brand-primary ${
                                isDragging ? '' : 'transition-all duration-100'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    )}

                    {/* Interactive Scrubber Thumb */}
                    {isInteractive && (
                        <div
                            className={`absolute rounded-full bg-white dark:bg-gray-100 border-2 border-brand-primary shadow-md transform -translate-x-1/2 transition-transform duration-100 ${thumbSize} ${
                                isDragging || isHovering
                                    ? 'scale-125 opacity-100'
                                    : 'opacity-0 group-hover:opacity-100'
                            }`}
                            style={{ left: `${progressPercent}%` }}
                        />
                    )}

                    {/* Hover Time Tooltip */}
                    {isHovering && hoverTime !== null && hoverPos !== null && !isDragging && (
                        <div
                            className="absolute -top-7 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap"
                            style={{ left: `${hoverPos}px` }}
                        >
                            {formatTime(hoverTime)}
                        </div>
                    )}

                    {/* Dragging Time Tooltip */}
                    {isDragging && scrubTime !== null && (
                        <div
                            className="absolute -top-7 transform -translate-x-1/2 bg-brand-primary text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap"
                            style={{ left: `${progressPercent}%` }}
                        >
                            {formatTime(scrubTime)}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Time / Total Duration (when timePosition is 'sides') */}
            {showTime && timePosition === 'sides' && (
                <div className="flex items-center gap-1.5 min-w-[42px]">
                    {isStreamOrLive ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold text-[10px] tracking-wider uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                            Live
                        </span>
                    ) : (
                        <span className={timeTextClasses}>
                            {disabled ? '--:--' : formatTime(effectiveDuration)}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
