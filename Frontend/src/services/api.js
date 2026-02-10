/**
 * API сервіс для взаємодії з backend
 * 
 * Базовий URL: http://127.0.0.1:8000
 * 
 * Для роботи з CORS використовується proxy в vite.config.js:
 * - У режимі розробки (dev): використовується порожній baseURL (запити йдуть через Vite proxy)
 * - У production: можна встановити повний URL backend
 * 
 * Всі функції повертають Promise
 */

// Використовуємо порожній URL для proxy або повний URL для прямого підключення
const API_BASE_URL = '';

/**
 * Отримання токену з localStorage
 */
const getToken = () => localStorage.getItem('accessToken');

/**
 * Базова функція для запитів
 */
async function request(url, options = {}) {
    const token = getToken();

    console.log('[API] Request to:', url);
    console.log('[API] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token && !options.skipAuth) {
        headers.Authorization = `Bearer ${token}`;
        console.log('[API] Authorization header set:', headers.Authorization.substring(0, 30) + '...');
    } else {
        console.log('[API] No authorization header (skipAuth or no token)');
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    console.log('[API] Response status:', response.status);

    return response;
}

// === AUTH ===

/**
 * Реєстрація нового користувача
 * @param {string} username - Ім'я користувача
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @returns {Promise<{token: string}>}
 */
export async function register(username, email, password) {
    const response = await request('/auth/register/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ username, email, password }),
    });
    return response.json();
}

/**
 * Вхід користувача
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @returns {Promise<{token: string}>}
 */
export async function login(email, password) {
    const response = await request('/auth/login/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email, password }),
    });
    return response.json();
}

/**
 * Отримання профілю користувача
 * @returns {Promise<{username: string, email: string, streak_days: number}>}
 */
export async function getProfile() {
    // Використовуємо /api/profile/, який проксі перепише в /profile/
    const response = await request('/api/profile/');

    console.log('[API] getProfile response status:', response.status);

    if (response.status === 401) {
        console.error('[API] getProfile 401 - Token invalid or expired');
        throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] getProfile error:', errorText);
        throw new Error(`Profile request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Оновлення профілю користувача
 * @param {Object} data - Дані для оновлення (username, email, password)
 */
export async function updateProfile(data) {
    const response = await request('/api/profile/', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || JSON.stringify(error) || 'Помилка оновлення');
    }

    return response.json();
}

// === COURSES ===

/**
 * Отримання всіх курсів користувача
 * @returns {Promise<Array>}
 */
export async function getCourses() {
    const response = await request('/courses/');

    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
        throw new Error(`Courses request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Отримання конкретного курсу
 * @param {number} id - ID курсу
 * @returns {Promise<Object>}
 */
export async function getCourse(id) {
    const response = await request(`/courses/${id}/`);
    return response.json();
}

/**
 * Створення нового курсу
 * @param {string} prompt - Тема курсу
 * @returns {Promise<{id: number, topic: string, modules: Array}>}
 */
export async function createCourse(prompt) {
    const response = await request('/courses/', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    });

    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Помилка створення курсу');
    }

    return response.json();
}

/**
 * Видалення курсу
 * @param {number} id - ID курсу
 */
export async function deleteCourse(id) {
    const response = await request(`/courses/${id}/`, {
        method: 'DELETE',
    });
    return response.ok;
}

// === LESSONS ===

/**
 * Отримання уроку
 * @param {number} id - ID уроку
 * @returns {Promise<{id: number, title: string, content: string, type: string}>}
 */
export async function getLesson(id) {
    const response = await request(`/courses/lessons/${id}/`);
    return response.json();
}

// === HOMEWORK ===

/**
 * Генерація домашнього завдання для модуля
 * @param {number} moduleId - ID модуля
 * @returns {Promise<string>} - Markdown контент домашки
 */
export async function generateHomework(moduleId) {
    const response = await request(`/courses/modules/${moduleId}/generate_homework/`);
    return response.text();
}

/**
 * Перевірка домашнього завдання через AI Teacher
 * @param {number} moduleId - ID модуля
 * @param {string} submission - Код/текст рішення студента
 * @returns {Promise<{grade: number, feedback: string}>}
 */
export async function checkHomework(moduleId, submission) {
    console.log('[API] checkHomework called with:', { moduleId, submissionLength: submission?.length });

    const response = await request(`/teacher/homeworks/${moduleId}/check/`, {
        method: 'POST',
        body: JSON.stringify({ submission }),
    });

    console.log('[API] checkHomework response status:', response.status);

    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Помилка перевірки';

        try {
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } else {
                const text = await response.text();
                console.error('[API] checkHomework error response:', text);
                errorMessage = text || errorMessage;
            }
        } catch (e) {
            console.error('[API] checkHomework error parsing:', e);
        }

        throw new Error(errorMessage);
    }

    // Перевірка на порожню відповідь
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[API] checkHomework unexpected response:', text);
        throw new Error('Бекенд повернув некоректну відповідь');
    }

    return response.json();
}

// === AI ASSISTANT ===

/**
 * Запит до AI на основі виділеного тексту
 * @param {string} selectedText - Виділений текст
 * @param {string} userQuestion - Питання користувача
 * @param {number} lessonId - ID уроку (якщо урок)
 * @param {number} homeworkId - ID домашки (якщо домашка)
 * @returns {Promise<{response: string}>}
 */
export async function askAI(selectedText, userQuestion, lessonId = null, homeworkId = null) {
    const body = {
        selected_text: selectedText,
        user_question: userQuestion,
    };

    if (lessonId) {
        body.lesson_id = lessonId;
    } else if (homeworkId) {
        body.homework_id = homeworkId;
    }

    const response = await request('/teacher/ask_question/', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error('AI request failed');
    }

    return response.json();
}

// === BACKEND STATUS ===

/**
 * Перевірка статусу backend сервера
 * @returns {Promise<boolean>} - true якщо онлайн
 */
export async function checkBackendStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/auth/health/', {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        // Якщо статус 200-299 (ok) АБО 401/403 (сервер відповів, але немає доступу) -> Сервер Online
        if (response.ok || response.status === 401 || response.status === 403) {
            clearTimeout(timeoutId);
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}

export default {
    register,
    login,
    getProfile,
    updateProfile,
    getCourses,
    getCourse,
    createCourse,
    deleteCourse,
    getLesson,
    generateHomework,
    checkHomework,
    askAI,
    checkBackendStatus,
};
