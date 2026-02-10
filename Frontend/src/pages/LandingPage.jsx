import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BackendStatus from '../components/layout/BackendStatus';
import LoginModal from '../components/modals/LoginModal';
import SignupModal from '../components/modals/SignupModal';
import BackgroundVideo from '../components/layout/BackgroundVideo';
import { createCourse } from '../services/api';

/**
 * LandingPage - Головна сторінка додатку
 * 
 * Функціонал:
 * - Hero секція з textarea для генерації курсу
 * - Слайдер demo курсів
 * - Модалки login/signup
 */
import { useNotification } from '../context/NotificationContext'; // Add Import

export default function LandingPage() {
    const navigate = useNavigate();
    const { showNotification } = useNotification(); // Hook
    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [user, setUser] = useState(null);
    const textareaRef = useRef(null);
    const videoRef = useRef(null);

    // Перевірка авторизації
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            setUser({ token });
        }
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleInput = () => {
            const lineHeight = 27; // 18px * 1.5
            const maxLines = 3;
            const maxHeight = maxLines * lineHeight + 18; // +padding

            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;

            if (scrollHeight > maxHeight) {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            }
        };

        textarea.addEventListener('input', handleInput);
        return () => textarea.removeEventListener('input', handleInput);
    }, []);

    // Enter для відправки
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (prompt.trim()) {
                handleGenerate();
            }
        }
    };

    // Генерація курсу
    const handleGenerate = async (selectedPrompt = null) => {
        const textToUse = typeof selectedPrompt === 'string' ? selectedPrompt : prompt;

        if (!textToUse.trim()) return;

        const token = localStorage.getItem('accessToken');
        if (!token) {
            setShowLogin(true);
            return;
        }

        setIsGenerating(true);

        try {
            const course = await createCourse(textToUse.trim());

            if (course.message && course.message.toLowerCase().includes('already exists')) {
                showNotification('Цей курс вже існує. Відкриваємо його...', 'info');
            } else {
                showNotification('Курс успішно створено!', 'success');
            }

            // Редірект на сторінку курсу
            navigate(`/topics/${course.id}`);
        } catch (error) {
            if (error.message === 'UNAUTHORIZED') {
                localStorage.removeItem('accessToken');
                showNotification('Сесія закінчилась. Увійдіть знову', 'error'); // Notification
                setUser(null);
                setShowLogin(true);
            } else {
                showNotification('Помилка: ' + error.message, 'error'); // Notification
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // Успішний login/signup
    const handleAuthSuccess = (token) => {
        setUser({ token });
        showNotification('Ви успішно увійшли!', 'success'); // Notification
    };

    // Закриття модалок по Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowLogin(false);
                setShowSignup(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);



    return (
        <div className="bg-landing relative flex flex-col items-center text-white" style={{ minHeight: '100vh' }}>
            {/* Відео фон */}
            <BackgroundVideo src="dist/videos/background1.mp4" duration={15} />

            <Header
                variant="landing"
                onLoginClick={() => setShowLogin(true)}
                onSignupClick={() => setShowSignup(true)}
                user={user}
            />

            {/* Hero секція */}
            <main className="content flex flex-col items-center text-center w-full px-4 sm:px-6">
                <h1 className="font-pixel text-[48px] sm:text-[52px] mb-[10px]">Навчайся з ШІ</h1>
                <p className="subtitle text-[18px] text-[#E3D8EF] font-light -mt-3">
                    ШІ збере твій курс по пікселях — швидко, розумно, красиво.
                </p>

                <div className="input-container flex items-center w-full max-w-[960px]">
                    <textarea
                        ref={textareaRef}
                        id="course-prompt"
                        placeholder="Напишіть, що ви хочете вивчити"
                        rows="1"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-0 outline-none resize-none overflow-hidden text-white text-[18px] font-medium leading-[1.5]"
                    />
                    <button
                        id="generate-course-btn"
                        className={`${prompt.trim() ? 'active' : ''}`}
                        disabled={!prompt.trim() || isGenerating}
                        onClick={handleGenerate}
                    >
                        {isGenerating ? (
                            <div className="loader loader-white" />
                        ) : (
                            <img src="/src/assets/images/icons/Vector.svg" alt="" className="w-5 h-5" />
                        )}
                    </button>
                </div>

                <p className="postscript text-[14px] text-[#E3D8EF] mt-5">
                    *Безкоштовно можна згенерувати лише один курс.
                </p>
            </main>

            {/* Обрані курси */}
            <FeaturedCourses onCourseSelect={(courseName) => {
                setPrompt(courseName);
                // Використовуємо setTimeout, щоб state встиг оновитися, або передаємо аргумент напряму
                handleGenerate(courseName);
            }} />

            {/* Модалки */}
            <LoginModal
                isOpen={showLogin}
                onClose={() => setShowLogin(false)}
                onSuccess={handleAuthSuccess}
            />

            <SignupModal
                isOpen={showSignup}
                onClose={() => setShowSignup(false)}
                onSuccess={handleAuthSuccess}
            />

            {/* Backend статус */}
            <BackendStatus />
        </div>
    );
}

/**
 * FeaturedCourses - Статичний блок обраних курсів
 */
function FeaturedCourses({ onCourseSelect }) {
    const courses = [
        { name: 'JavaScript', modules: 5, image: '/src/assets/images/pictuers/JS_COURSES.png' },
        { name: 'React', modules: 5, image: '/src/assets/images/pictuers/REACT_COURSE.png' },
        { name: 'Next.js', modules: 5, image: '/src/assets/images/pictuers/NEXT_JS_COURSE.png' },
        { name: 'Python', modules: 5, image: '/src/assets/images/pictuers/PYTHON_COURSE.png' },
    ];

    return (
        <section className="courses-section">
            <h2 className="courses-title">Популярні курси:</h2>

            <div className="courses-grid" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {courses.map((course, index) => (
                    <div
                        key={index}
                        className="course-card"
                        onClick={() => onCourseSelect(course.name)}
                    >
                        <img src={course.image} alt={`${course.name} Course`} className="card-content-image" />
                        <div className="card-info">
                            <span className="course-name">{course.name}</span>
                            <span className="course-modules">{course.modules} модулів</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
