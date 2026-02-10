import { Link } from 'react-router-dom';

/**
 * Header компонент - універсальний хедер для всіх сторінок
 * 
 * Props:
 * @param {string} variant - 'landing' | 'app' | 'profile'
 * @param {boolean} showSearch - Показувати пошук (для profile)
 * @param {function} onLoginClick - Callback для кнопки Login
 * @param {function} onSignupClick - Callback для кнопки Signup
 * @param {object} user - Дані користувача {username, streak_days}
 * @param {function} onLogout - Callback для кнопки виходу
 */
export default function Header({
    variant = 'landing',
    showSearch = false,
    onLoginClick,
    onSignupClick,
    user = null,
    onLogout,
    onSearch
}) {
    const isAuthenticated = !!user;

    return (
        <header className="header">
            {/* Ліва частина - Logo */}
            <div className="left">
                <Link to="/" className="logo">
                    <img src="/src/assets/images/icons/EduPixels_logo.svg" alt="EduPixels Logo" style={{ height: '24px' }} />
                </Link>
            </div>

            {/* Центр - Search (тільки для profile) */}
            {showSearch && (
                <div className="header-search-container">
                    <input
                        type="text"
                        placeholder="Пошук курсів..."
                        className="profile-header-input"
                        onChange={(e) => onSearch && onSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Права частина */}
            <div className="right">
                {!isAuthenticated ? (
                    // Кнопки для незалогінених
                    <>
                        <button onClick={onLoginClick}>Log in</button>
                        <button onClick={onSignupClick}>Get started</button>
                    </>
                ) : (
                    // Контент для залогінених
                    <>
                        {/* Streak для profile */}
                        {variant === 'profile' && (
                            <>
                                <div className="streak-info">
                                    <img src="/src/assets/images/icons/flame.png" alt="Fire" className="fire-icon-placeholder" />
                                    <span id="streak-counter">{user.streak_days || 0} ДНІВ</span>
                                </div>
                                <button
                                    onClick={onLogout}
                                    style={{
                                        marginLeft: '15px',
                                        padding: '5px 15px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Вийти
                                </button>
                            </>
                        )}

                        {/* Avatar (сховати на сторінці профілю, бо там і так є велика фотка) */}
                        {variant !== 'profile' && (
                            <div className="header-avatar-small">
                                <Link to="/profile">
                                    <img src="/src/assets/images/pictuers/user_photo.png" alt="User" />
                                </Link>
                            </div>
                        )}

                    </>
                )}
            </div>
        </header>
    );
}
