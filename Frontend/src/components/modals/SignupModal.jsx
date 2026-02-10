import { useState } from 'react';
import { register } from '../../services/api';
import { isValidEmail } from '../../utils/validation';

/**
 * SignupModal - Модальне вікно реєстрації
 * 
 * Props:
 * @param {boolean} isOpen - Чи відкрите модальне вікно
 * @param {function} onClose - Callback для закриття
 * @param {function} onSuccess - Callback при успішній реєстрації (token)
 */
export default function SignupModal({ isOpen, onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Закриття по кліку ззовні
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
            // Скидання стану при закритті
            setShowConfirm(false);
            setConfirmPassword('');
        }
    };

    // Очищення помилок
    const clearFieldError = (field) => {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
    };

    // Відправка форми
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Етап 1: Основні поля
        if (!showConfirm) {
            const newErrors = {};

            if (!name.trim()) newErrors.name = "Введіть ім'я";
            if (!email.trim()) newErrors.email = 'Введіть email';
            else if (!isValidEmail(email)) newErrors.email = 'Некоректний формат email';
            if (!password.trim()) newErrors.password = 'Введіть пароль';
            else if (password.length < 6) newErrors.password = 'Пароль має бути мінімум 6 символів';

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }

            // Перехід до підтвердження пароля
            setShowConfirm(true);
            return;
        }

        // Етап 2: Підтвердження пароля
        if (password !== confirmPassword) {
            setErrors({ confirm: 'Паролі не співпадають' });
            return;
        }

        setIsLoading(true);

        try {
            const data = await register(name, email, password);

            // Debug: виводимо відповідь від backend
            console.log('[SIGNUP] Response data:', data);

            if (data.token) {
                localStorage.setItem('accessToken', data.token);
                console.log('[SIGNUP] Token saved successfully');
                onSuccess(data.token);
                onClose();
            } else {
                console.warn('[SIGNUP] No token in response:', data);
                // Обробка помилок від сервера
                const newErrors = {};
                if (data.username) newErrors.name = "Користувач з таким ім'ям існує";
                if (data.email) newErrors.email = 'Email вже використовується';
                if (data.password) newErrors.password = data.password[0];

                if (Object.keys(newErrors).length === 0) {
                    newErrors.confirm = 'Помилка реєстрації. Перевірте дані.';
                }

                setErrors(newErrors);
                setShowConfirm(false); // Повертаємось до першого кроку
            }
        } catch (error) {
            console.error('[SIGNUP] Error:', error);
            setErrors({ confirm: "Помилка з'єднання з сервером" });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="sign_up_container modal-open fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(0,0,0,0.7)] backdrop-blur-md px-4"
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
                    Створи свій акаунт
                </h2>

                <label htmlFor="reg-name" className="text-[14px] text-[#B0B0B0] mb-3 font-medium">
                    Ім'я
                </label>
                <input
                    id="reg-name"
                    type="text"
                    placeholder="Ім'я"
                    className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.name ? 'error-input border-[#CF3434] mb-0' : 'mb-6'}`}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError('name');
                    }}
                />
                {errors.name && (
                    <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                        {errors.name}
                    </p>
                )}

                <label htmlFor="reg-email" className="text-[14px] text-[#B0B0B0] mb-3 font-medium">
                    Email
                </label>
                <input
                    id="reg-email"
                    type="email"
                    placeholder="Email"
                    className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.email ? 'error-input border-[#CF3434] mb-0' : 'mb-6'}`}
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError('email');
                    }}
                />
                {errors.email && (
                    <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                        {errors.email}
                    </p>
                )}

                <label htmlFor="reg-password" className="text-[14px] text-[#B0B0B0] mb-3 font-medium">
                    Пароль
                </label>
                <input
                    id="reg-password"
                    type="password"
                    placeholder="Пароль"
                    className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.password ? 'error-input border-[#CF3434] mb-0' : 'mb-6'}`}
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError('password');
                    }}
                />
                {errors.password && (
                    <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                        {errors.password}
                    </p>
                )}

                {/* Блок підтвердження пароля */}
                {showConfirm && (
                    <div id="confirm-password-block" className="w-full">
                        <label
                            htmlFor="reg-confirm-password"
                            className="text-[14px] text-[#B0B0B0] mb-3 font-medium"
                        >
                            Підтвердити пароль
                        </label>
                        <input
                            id="reg-confirm-password"
                            type="password"
                            placeholder="Підтвердити пароль"
                            className={`input-field w-full h-12 rounded-xl px-4 text-[14px] bg-[#1F1F1F] border border-[#2E2E2E] text-white outline-none transition-all ${errors.confirm ? 'error-input border-[#CF3434]' : ''}`}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                clearFieldError('confirm');
                            }}
                        />
                        {errors.confirm && (
                            <p className="error-message text-[#CF3434] text-[13px] mt-1 mb-4 leading-tight">
                                {errors.confirm}
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    className="login-btn w-full h-12 mt-4 rounded-xl bg-white text-black text-[14px] font-semibold flex items-center justify-center transition hover:bg-[#e0e0e0] hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="loader loader-white"></div>
                    ) : showConfirm ? (
                        'Зареєструватися'
                    ) : (
                        'Продовжити'
                    )}
                </button>

                <p className="privacy-text text-[14px] text-[#666] mt-6 leading-snug">
                    Продовжуючи, ти погоджуєшся з нашими{' '}
                    <a href="#" className="text-[#B0B0B0] underline hover:text-white">
                        політиками конфіденційності
                    </a>
                </p>
            </form>
        </div>
    );
}
