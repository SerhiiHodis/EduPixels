/**
 * Валідація email формату
 * @param {string} email - Email для перевірки
 * @returns {boolean} - true якщо валідний
 */
export function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

/**
 * Показати помилку на input полі
 * @param {HTMLElement} input - Input елемент
 * @param {HTMLElement} errorElement - Елемент для відображення помилки
 * @param {string} message - Текст помилки
 */
export function showError(input, errorElement, message) {
    if (input) input.classList.add('error-input');
    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Очистити помилку з input поля
 * @param {HTMLElement} input - Input елемент
 * @param {HTMLElement} errorElement - Елемент помилки
 */
export function clearError(input, errorElement) {
    if (input) input.classList.remove('error-input');
    if (errorElement) errorElement.style.display = 'none';
}
