import { useEffect, useRef } from 'react';

/**
 * BackgroundVideo - Максимально плавний і безшовний цикл за допомогою кросфейду.
 * Використовує два плеєри, які перекриваються у часі.
 */
const BackgroundVideo = ({ src, duration: manualDuration = 15 }) => {
    const videoRef1 = useRef(null);
    const videoRef2 = useRef(null);

    useEffect(() => {
        const v1 = videoRef1.current;
        const v2 = videoRef2.current;
        if (!v1 || !v2) return;

        let videoDuration = manualDuration;

        // Спробуємо отримати реальну тривалість відео
        const onMetadata = () => {
            if (v1.duration && v1.duration > 0) {
                videoDuration = v1.duration;
            }
        };
        v1.addEventListener('loadedmetadata', onMetadata);

        // Початкові налаштування
        v1.style.opacity = '1';
        v2.style.opacity = '0';
        v1.play().catch(() => { });

        let currentActive = v1;
        let currentBuffer = v2;
        let isCrossfading = false;
        const fadeTime = 2; // Час кросфейду в секундах

        const checkTime = () => {
            if (!currentActive) return;

            // Починаємо кросфейд за fadeTime секунд до кінця
            // Використовуємо -0.1 для страховки від кінця файлу
            const triggerTime = Math.max(0, videoDuration - fadeTime - 0.1);

            if (currentActive.currentTime >= triggerTime && !isCrossfading) {
                isCrossfading = true;

                // 1. Готуємо і запускаємо буферний плеєр
                currentBuffer.currentTime = 0;
                currentBuffer.play().catch(() => { });

                // 2. Кросфейд через CSS переходи
                currentBuffer.style.opacity = '1';
                currentActive.style.opacity = '0';

                // 3. Після завершення переходу міняємо ролі
                setTimeout(() => {
                    const oldActive = currentActive;
                    currentActive = currentBuffer;
                    currentBuffer = oldActive;

                    currentBuffer.pause();
                    currentBuffer.currentTime = 0;
                    isCrossfading = false;
                }, fadeTime * 1000);
            }

            requestAnimationFrame(checkTime);
        };

        const rid = requestAnimationFrame(checkTime);
        return () => {
            cancelAnimationFrame(rid);
            v1.removeEventListener('loadedmetadata', onMetadata);
            v1.pause();
            v2.pause();
        };
    }, [src, manualDuration]);

    const videoStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        willChange: 'opacity',
        transition: 'opacity 2000ms ease-in-out', // Плавний перехід
        zIndex: -1,
        pointerEvents: 'none',
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                zIndex: -1,
                overflow: 'hidden'
            }}
        >
            <video
                ref={videoRef1}
                muted
                playsInline
                preload="auto"
                style={videoStyle}
            >
                <source src={src} type="video/mp4" />
            </video>
            <video
                ref={videoRef2}
                muted
                playsInline
                preload="auto"
                style={videoStyle}
            >
                <source src={src} type="video/mp4" />
            </video>
        </div>
    );
};

export default BackgroundVideo;
