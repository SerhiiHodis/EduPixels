import React, { useEffect, useState } from 'react';

const Notification = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setVisible(true));
    }, []);

    const handleClose = () => {
        setVisible(false);
        // Wait for exit animation
        setTimeout(onClose, 300);
    };

    return (
        <div
            className={`notification-toast ${type} ${visible ? 'visible' : ''} 
                        flex items-center justify-between min-w-[280px] max-w-[90vw]
                        px-5 py-3 rounded-xl border backdrop-blur-md shadow-lg
            `}
        >
            <div className="notification-content flex items-center gap-2">
                {type === 'success' && (
                    <i className="ph-bold ph-check-circle mr-2"></i>
                )}
                <span className="text-sm font-medium">{message}</span>
            </div>
            <button
                className="notification-close bg-transparent border-0 text-sm ml-4 rounded hover:bg-[rgba(124,252,0,0.2)] p-1.5 flex items-center justify-center"
                onClick={handleClose}
            >
                <i className="ph-bold ph-x"></i>
            </button>
        </div>
    );
};

export default Notification;
