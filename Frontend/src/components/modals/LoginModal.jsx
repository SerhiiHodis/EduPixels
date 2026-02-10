import { useState } from 'react';
import { login } from '../../services/api';
import { isValidEmail } from '../../utils/validation';

/**
 * LoginModal - Модальне вікно входу
 * 
 * Props:
 * @param {boolean} isOpen - Чи відкрите модальне вікно
 * @param {function} onClose - Callback для закриття
 * @param {function} onSuccess - Callback при успішному вході (token)
 */
export default function LoginModal({ isOpen, onClose, onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Закриття по кліку ззовні
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Очищення помилок при вводі
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
    };

    // Відправка форми
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Валідація
        const newErrors = {};
        if (!email.trim()) newErrors.email = 'Введіть email';
        if (!password.trim()) newErrors.password = 'Введіть пароль';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const data = await login(email, password);

            // Debug: виводимо відповідь від backend
            console.log('[LOGIN] Response data:', data);

            if (data.token) {
                localStorage.setItem('accessToken', data.token);
                console.log('[LOGIN] Token saved successfully');
                onSuccess(data.token);
                onClose();
            } else {
                console.warn('[LOGIN] No token in response:', data);
                setErrors({ password: 'Невірний email або пароль' });
            }
        } catch (error) {
            console.error('[LOGIN] Error:', error);
            setErrors({ password: 'Невірний email або пароль. Перевірте з\'єднання з сервером.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="log_in_container modal-open fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-md px-4"
            onClick={handleBackdropClick}
        >
            <form
                className="login_form bg-[#1C1C1C] w-full max-w-[480px] rounded-3xl p-8 flex flex-col items-start shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-[modalPop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]"
                onSubmit={handleSubmit}
            >
                <h1 className="login-logo font-pixel text-2xl mb-2 font-normal tracking-[0.06em]">
                    EduPixels
                </h1>
                <h2 className="login-title text-2xl sm:text-[30px] mb-6 font-medium">
                    Увійди у свій акаунт
                </h2>

                <label htmlFor="username" className="text-[14px] text-[#B0B0B0] mb-3 font-medium">
                    Ім'я або email
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Ім'я"
                    className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.email ? 'error-input border-[#CF3434]' : ''}`}
                    value={email}
                    onChange={handleEmailChange}
                />
                {errors.email && (
                    <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                        {errors.email}
                    </p>
                )}

                <label htmlFor="password" className="text-[14px] text-[#B0B0B0] mb-3 font-medium mt-2">
                    Пароль
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Пароль"
                    className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.password ? 'error-input border-[#CF3434] mb-0' : 'mb-8'}`}
                    value={password}
                    onChange={handlePasswordChange}
                />
                {errors.password && (
                    <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                        {errors.password}
                    </p>
                )}

                <button
                    type="submit"
                    className="login-btn w-full h-12 rounded-xl bg-white text-black text-[14px] font-semibold flex items-center justify-center transition hover:bg-[#e0e0e0] hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? <div className="loader loader-white"></div> : 'Продовжити'}
                </button>
            </form>
        </div>
    );
}
