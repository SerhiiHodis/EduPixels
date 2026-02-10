import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { getProfile, getCourses, deleteCourse, updateProfile } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import '../styles/profile.css';

/**
 * ProfilePage - Сторінка профілю користувача
 * 
 * Функціонал:
 * - Відображення даних користувача
 * - Список курсів з можливістю видалення
 * - Редагування профілю
 * - Streak counter
 */
export default function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const { showNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedCourseId, setDraggedCourseId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOverTrash, setIsDragOverTrash] = useState(false);

    // DRAG HANDLERS
    const onDragStart = (e, courseId) => {
        setDraggedCourseId(courseId);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: set custom drag image if needed
    };

    const onDragEnd = (e) => {
        setIsDragging(false);
        setDraggedCourseId(null);
        setIsDragOverTrash(false);
    };

    const onDragOverTrash = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOverTrash(true);
    };

    const onDragLeaveTrash = (e) => {
        e.preventDefault();
        setIsDragOverTrash(false);
    };

    const onDropTrash = (e) => {
        e.preventDefault();
        setIsDragOverTrash(false);
        if (draggedCourseId) {
            setCourseToDelete(draggedCourseId);
            setShowDeleteModal(true);
        }
    };

    // Завантаження даних
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            navigate('/');
            return;
        }

        loadData();
    }, [navigate]);

    const loadData = async () => {
        try {
            const [profileData, coursesData] = await Promise.all([
                getProfile(),
                getCourses(),
            ]);

            setUser(profileData);
            setCourses(coursesData);
            setEditName(profileData.username);
            setEditEmail(profileData.email);
        } catch (error) {
            console.error(error);
            if (error.message === 'UNAUTHORIZED') {
                localStorage.removeItem('accessToken');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        navigate('/');
    };

    const handleEditProfile = async (e) => {
        e.preventDefault();
        try {
            const updateData = {
                username: editName,
                email: editEmail
            };
            if (editPassword.trim()) {
                updateData.password = editPassword;
                updateData.old_password = oldPassword;
            }

            const updatedUser = await updateProfile(updateData);
            setUser(updatedUser);
            setShowEditModal(false);
            setEditPassword('');
            setOldPassword('');
            showNotification('Профіль успішно оновлено', 'success');
        } catch (error) {
            console.error('[PROFILE_UPDATE_ERROR]', error);

            let errorMessage = 'Помилка при оновленні профілю';

            try {
                // Спроба розпарсити об'єкт помилки, якщо він прийшов як JSON рядок
                const errorObj = JSON.parse(error.message);

                // DRF часто повертає об'єкт { field: [ "message" ] }
                const firstKey = Object.keys(errorObj)[0];
                if (firstKey) {
                    const firstError = errorObj[firstKey];
                    errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                }
            } catch (e) {
                // Якщо не JSON, використовуємо звичайний message
                errorMessage = error.message || errorMessage;

                // Якщо помилка містить технічні назви полів, замінюємо їх
                if (errorMessage.includes('old_password')) errorMessage = 'Невірний старий пароль';
            }

            showNotification(errorMessage, 'error');
        }
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            await deleteCourse(courseToDelete);

            // Очищення прогресу з localStorage
            localStorage.removeItem(`course_progress_${courseToDelete}`);

            setCourses((prev) => prev.filter((c) => c.id !== courseToDelete));
            setShowDeleteModal(false);
            setCourseToDelete(null);
            showNotification('Курс видалено', 'success');
        } catch (error) {
            alert('Помилка видалення');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCourseStats = (course) => {
        const savedRaw = localStorage.getItem(`course_progress_${course.id}`);
        if (!savedRaw) return { completed: 0, percent: 0 };

        try {
            const saved = JSON.parse(savedRaw);

            // Freshness check: if we have created_at in course, we compare it with saved
            if (course.created_at && (!saved.created_at || saved.created_at !== course.created_at)) {
                return { completed: 0, percent: 0 };
            }

            const savedLessons = saved.lessons || {};
            const savedHomeworks = saved.homeworks || {};

            let completed = 0;
            const total = course.modules?.length || 0;

            if (total === 0) return { completed: 0, percent: 0 };

            course.modules.forEach(mod => {
                const lessons = mod.lessons || [];
                const isLessonsDone = lessons.every(l => (savedLessons[l.id] || 0) >= 100);

                let isHomeworkDone = true;
                if (mod.homework) {
                    isHomeworkDone = !!savedHomeworks[mod.id];
                }

                if (isLessonsDone && isHomeworkDone) {
                    completed++;
                }
            });

            return {
                completed,
                percent: Math.round((completed / total) * 100)
            };
        } catch (e) {
            return { completed: 0, percent: 0 };
        }
    };

    if (loading) {
        return (
            <div className="bg-app min-h-screen flex flex-col items-center justify-center">
                <Header variant="profile" showSearch user={user} onLogout={handleLogout} />
                <div className="loading-center mt-40">
                    <div className="loader loader-large" />
                    <p>Завантаження...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-app text-white"
            style={{
                minHeight: '100vh',
                backgroundImage: 'url("/src/assets/images/pictuers/background_topics.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <Header
                variant="profile"
                showSearch
                user={user}
                onLogout={handleLogout}
                onSearch={setSearchQuery}
            />

            <main
                className="profile-main w-[90%] max-w-[1720px] mx-auto mt-36 mb-24
                           flex flex-col lg:flex-row gap-6 items-start
                           animate-[fadeUp_0.8s_ease-out_0.2s_forwards]
                "
            >
                {/* Sidebar */}
                <div className="profile-sidebar w-full lg:w-[400px] flex-shrink-0 flex flex-col mb-6 lg:mb-0">
                    <div className="profile-card profile-info-card bg-[#1B1B1B] border border-[#40403F] rounded-3xl p-8 flex flex-col items-center justify-center">
                        <div className="profile-avatar-container w-64 h-64 rounded-full border-2 border-[#333] mb-8 overflow-hidden relative flex-shrink-0">
                            <img
                                src="/src/assets/images/pictuers/user_photo.png"
                                alt="Profile Avatar"
                                className="profile-avatar-image w-full h-full object-cover"
                            />
                        </div>

                        <h3 className="profile-name font-pixel text-2xl text-white text-center mb-0">
                            {user?.username || 'Завантаження...'}
                        </h3>
                        <p className="profile-email font-pixel text-base text-[#888] text-center break-all">
                            {user?.email || '...'}
                        </p>

                        <button
                            className="edit-profile-btn w-full max-w-xs min-h-9 mt-auto
                                       bg-[#272725] text-[#888] border border-[#40403F] rounded-xl
                                       text-sm font-medium cursor-pointer transition
                                       hover:bg-[#333] hover:text-white hover:border-[#666]
                            "
                            onClick={() => setShowEditModal(true)}
                        >
                            Редагувати профіль
                        </button>
                    </div>
                </div>

                {/* Курси */}
                <div
                    className="profile-content-grid flex-1 grid
                               grid-cols-1 md:grid-cols-2
                               auto-rows-[300px] gap-6
                    "
                    id="courses-container"
                >
                    {filteredCourses.length === 0 ? (
                        <div
                            className="content-card flex flex-col items-start text-left p-12 pb-6 col-span-full h-full"
                            style={{
                                backgroundColor: 'rgba(27, 27, 27, 0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px dashed #40403F',
                                minHeight: '400px',
                                borderRadius: '24px'
                            }}
                        >
                            <div className="empty-state-text flex-1">
                                <h3 className="font-pixel text-2xl text-white mb-4">
                                    {courses.length === 0 ? 'Ваша бібліотека порожня' : 'Нічого не знайдено'}
                                </h3>

                                <p className="text-[#888] max-w-md">
                                    {courses.length === 0
                                        ? 'Створюйте власні курси за допомогою ШІ та починайте навчання прямо зараз!'
                                        : 'Спробуйте змінити запит для пошуку.'}
                                </p>
                            </div>

                            {courses.length === 0 && (
                                <div className="w-full">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="login-btn !w-full !max-w-md !bg-[#fff] !text-black hover:!scale-[1.02] transition-transform"
                                        style={{ height: '60px' }}
                                    >
                                        Створити перший курс
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredCourses.map((course) => {
                            const stats = getCourseStats(course);
                            return (
                                <div
                                    key={course.id}
                                    className="content-card course-progress-card bg-[#1B1B1B] border border-[#40403F]
                                               rounded-3xl p-8 flex flex-col justify-between cursor-grab
                                               transition-transform duration-200 hover:border-[#666]
                                    "
                                    onClick={() => navigate(`/topics/${course.id}`)}
                                    // DRAGGABLE PROPS
                                    draggable="true"
                                    onDragStart={(e) => onDragStart(e, course.id)}
                                    onDragEnd={onDragEnd}
                                    style={{
                                        opacity: isDragging && draggedCourseId === course.id ? 0.5 : 1,
                                        transform: isDragging && draggedCourseId === course.id ? 'scale(0.95)' : 'scale(1)',
                                    }}
                                >
                                    {/* Top: Modules count */}
                                    <div className="course-card-top mb-auto">
                                        <p className="modules-count font-pixel text-sm text-[#B0B0B0] flex items-center gap-2">
                                            {course.modules?.length || 0} модулів
                                        </p>
                                    </div>

                                    {/* Bottom: Name + Progress */}
                                    <div className="course-card-bottom-wrapper mt-4">
                                        <h4 className="course-name-big font-pixel text-lg text-white mt-0 mb-4">
                                            {course.topic}
                                        </h4>

                                        <div className="progress-bar-container w-full h-[6px] bg-[#333] rounded-[3px] mb-3 overflow-hidden">
                                            <div
                                                className="progress-bar h-full bg-[#7CFC00] rounded-[3px]"
                                                style={{ width: `${stats.percent}%` }}
                                            ></div>
                                        </div>

                                        <div className="progress-info flex justify-between font-pixel text-base text-[#7CFC00]">
                                            <span>{stats.completed > 0 ? `${stats.completed} пройдено` : 'Start'}</span>
                                            <span>{course.modules?.length || 0}</span>
                                        </div>
                                    </div>

                                    {/* Delete Button Removed */}
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* TRASH ZONE (Visible only when dragging) */}
            <div
                className={`trash-zone ${isDragging ? 'visible' : ''} ${isDragOverTrash ? 'drag-over' : ''}`}
                onDragOver={onDragOverTrash}
                onDragLeave={onDragLeaveTrash}
                onDrop={onDropTrash}
            >
                <div className="trash-icon-wrapper">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Lid */}
                        <g className="trash-lid" style={{ transformOrigin: 'top right', transition: 'transform 0.3s ease' }}>
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" style={{ display: 'none' }} /> {/* Hide original full path */}
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </g>

                        {/* Can */}
                        <g className="trash-can">
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </g>
                    </svg>
                    <span>Перетягніть сюди</span>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div
                    className="log_in_container modal-open"
                    onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
                >
                    <form
                        className="login_form"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '50px',
                            maxWidth: '550px',
                            width: '100%',
                            gap: '0' // We'll use margins for precision
                        }}
                        onSubmit={handleEditProfile}
                    >
                        <h2 className="login-title" style={{ fontSize: '32px', marginBottom: '40px', textAlign: 'center', width: '100%' }}>
                            Редагувати профіль
                        </h2>

                        {/* Name Section */}
                        <div style={{ marginBottom: '25px', width: '100%' }}>
                            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: '12px', fontSize: '14px' }}>Ім'я</label>
                            <input
                                type="text"
                                className="input-field"
                                style={{ width: '100%', height: '50px' }}
                                placeholder="Ваше ім'я"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>

                        {/* Email Section */}
                        <div style={{ marginBottom: '35px', width: '100%' }}>
                            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: '12px', fontSize: '14px' }}>Email</label>
                            <input
                                type="email"
                                className="input-field"
                                style={{ width: '100%', height: '50px' }}
                                placeholder="Email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                            />
                        </div>

                        {/* Password Group */}
                        <div style={{
                            width: '100%',
                            padding: '25px',
                            backgroundColor: '#252525',
                            borderRadius: '24px',
                            border: '1px solid #333',
                            marginBottom: '40px'
                        }}>
                            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Зміна пароля
                            </p>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', color: '#B0B0B0', marginBottom: '12px', fontSize: '14px' }}>Старий пароль</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    style={{ width: '100%', height: '50px' }}
                                    placeholder="Введіть поточний пароль"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#B0B0B0', marginBottom: '12px', fontSize: '14px' }}>Новий пароль</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    style={{ width: '100%', height: '50px' }}
                                    placeholder="Мінімум 8 символів"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                />
                            </div>

                            <p style={{ color: '#666', fontSize: '12px', lineHeight: '1.5', marginTop: '15px' }}>
                                Залиште ці поля порожніми, щоб не змінювати пароль. Для зміни пароля обов'язково вкажіть старий.
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                            <button
                                type="button"
                                className="login-btn btn-secondary"
                                style={{ flex: 1, height: '55px' }}
                                onClick={() => setShowEditModal(false)}
                            >
                                Скасувати
                            </button>
                            <button
                                type="submit"
                                className="login-btn"
                                style={{ flex: 1, height: '55px', backgroundColor: '#fff', color: '#000' }}
                            >
                                Зберегти
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div
                    className="log_in_container modal-open"
                    onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
                >
                    <div className="login_form" style={{ alignItems: 'center', textAlign: 'center' }}>
                        <h2 className="login-title" style={{ color: '#cf3434' }}>
                            Видалити курс?
                        </h2>
                        <p style={{ color: '#b0b0b0', marginBottom: '30px' }}>
                            Ви впевнені, що хочете видалити цей курс? Цю дію неможливо скасувати.
                        </p>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="login-btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Ні, залишити
                            </button>
                            <button type="button" className="login-btn btn-danger" onClick={handleDeleteCourse}>
                                Так, видалити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
