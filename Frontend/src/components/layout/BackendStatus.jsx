import { useEffect } from 'react';
import { checkBackendStatus } from '../../services/api';

/**
 * BackendStatus - Logic to check backend connection
 * 
 * Functionality:
 * - Checks connection every 5 seconds (to match previous behavior but in console)
 * - Logs Online/Offline status to console
 * - Does NOT render UI
 */
export default function BackendStatus() {
    useEffect(() => {
        // Check function
        const check = async () => {
            const status = await checkBackendStatus();
            // Using logic style for console to make it visible but not annoying
            if (status) {
                console.log('%c Backend Status: Online ', 'background: #4ade80; color: #000; padding: 2px; border-radius: 2px;');
            } else {
                console.log('%c Backend Status: Offline ', 'background: #f87171; color: #fff; padding: 2px; border-radius: 2px;');
            }
        };

        // First check immediately
        check();

        // Check every 5 seconds
        const interval = setInterval(check, 5000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
