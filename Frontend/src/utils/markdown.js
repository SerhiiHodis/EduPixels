import { marked } from 'marked';
import hljs from 'highlight.js';

/**
 * Налаштування marked для рендерингу Markdown
 * з підсвічуванням коду через highlight.js
 */
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
});

/**
 * Конвертація Markdown тексту в HTML
 * @param {string} markdown - Markdown текст  
 * @returns {string} - HTML
 */
export function parseMarkdown(markdown) {
    if (!markdown) return '';

    // Очищення від escape символів
    const cleaned = markdown.replace(/\\n/g, '\n');

    return marked.parse(cleaned);
}

export default { parseMarkdown };
