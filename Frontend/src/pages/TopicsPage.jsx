import React, { useState, useEffect, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { useNotification } from '../context/NotificationContext'; // Hook Import
import Header from '../components/layout/Header';
import { getCourse, getLesson, generateHomework, checkHomework, askAI } from '../services/api';
import { parseMarkdown } from '../utils/markdown';
import '../styles/topics.css';

// === CONSTANTS & HELPERS ===

const addCopyButtonsToCodeBlocks = (root = document) => {
    root.querySelectorAll('pre').forEach((pre) => {
        if (pre.querySelector('.code-header')) return;

        // Create Header
        const header = document.createElement('div');
        header.className = 'code-header';

        // Detect Language
        const codeElem = pre.querySelector('code');
        let lang = 'code';
        if (codeElem) {
            const langClass = Array.from(codeElem.classList).find(c => c.startsWith('language-'));
            if (langClass) {
                lang = langClass.replace('language-', '');
            }
        }

        const langSpan = document.createElement('span');
        langSpan.className = 'code-lang';
        langSpan.innerText = lang;

        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.innerHTML = '<i class="ph-bold ph-copy"></i> <span>Copy</span>';
        button.title = 'Copy code';

        button.onclick = () => {
            const code = codeElem ? codeElem.innerText : pre.innerText;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<i class="ph-bold ph-check"></i> <span>Copied!</span>';
                button.classList.add('copied');
                setTimeout(() => {
                    button.innerHTML = '<i class="ph-bold ph-copy"></i> <span>Copy</span>';
                    button.classList.remove('copied');
                }, 2000);
            });
        };

        header.appendChild(langSpan);
        header.appendChild(button);
        pre.insertBefore(header, pre.firstChild);
    });
};

// === MEMOIZED SUB-COMPONENTS ===

/**
 * ContentView - Renders markdown content
 * Memoized to prevent re-rendering (and losing hljs DOM mods) when parent state (like course progress) changes.
 */
const ContentView = memo(({ htmlContent, nextLabel, onNext }) => {
    const containerRef = useRef(null);

    // Apply Highlight.js and Copy buttons ONLY when content changes
    useEffect(() => {
        if (!containerRef.current) return;

        // Apply Highlight.js
        containerRef.current.querySelectorAll('pre code').forEach((block) => {
            // Remove 'highlighted' class if checking for re-run, or just let hljs do its thing
            // hljs.highlightElement checks if already highlighted usually, but we want to be sure
            hljs.highlightElement(block);
        });
        // Add Copy Buttons
        addCopyButtonsToCodeBlocks(containerRef.current);

    }, [htmlContent]);

    // Critical: Memoize the object passed to dangerouslySetInnerHTML.
    // If we pass a new object { __html: ... } every render, React tears down and rebuilds the DOM,
    // losing the classes added by Highlight.js above.
    const safeHtml = React.useMemo(() => ({ __html: htmlContent }), [htmlContent]);

    return (
        <div className="content-view-wrapper" ref={containerRef}>
            <div
                className="lesson-content-view"
                dangerouslySetInnerHTML={safeHtml}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', paddingBottom: '40px' }}>
                <button className="generate-btn" onClick={onNext} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {nextLabel} <i className="ph-bold ph-arrow-right"></i>
                </button>
            </div>
        </div>
    );
});

const MemoizedChatMessage = memo(({ text }) => {
    const containerRef = useRef(null);
    const htmlContent = React.useMemo(() => DOMPurify.sanitize(parseMarkdown(text)), [text]);

    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        addCopyButtonsToCodeBlocks(containerRef.current);
    }, [htmlContent]);

    return (
        <div
            ref={containerRef}
            className="ai-message-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
});

ContentView.displayName = 'ContentView';


// === MAIN COMPONENT ===

/**
 * TopicsPage - Course Viewer Page
 */
export default function TopicsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification(); // Hook
    const [course, setCourse] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [view, setView] = useState('welcome'); // 'welcome' | 'lessons' | 'lesson' | 'homework'
    const [lessonContent, setLessonContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState([]);
    const [activeLesson, setActiveLesson] = useState(null);

    // AI Chat state
    const [selectedText, setSelectedText] = useState('');
    const [selectedRange, setSelectedRange] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [showAICard, setShowAICard] = useState(false);
    const [aiCardPos, setAICardPos] = useState({ top: 0, left: 0 });
    const [chatMessages, setChatMessages] = useState([]);
    const [aiInput, setAIInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const chatBodyRef = useRef(null);

    // Homework submission state
    const [homeworkSubmission, setHomeworkSubmission] = useState('');
    const [homeworkResult, setHomeworkResult] = useState(null);
    const [checkingHomework, setCheckingHomework] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            navigate('/');
            return;
        }
        loadCourse();
    }, [id, navigate]);

    const getSavedProgress = (courseData = null) => {
        try {
            const saved = localStorage.getItem(`course_progress_${id}`);
            if (!saved) return { lessons: {}, homeworks: {}, created_at: courseData?.created_at };

            const progress = JSON.parse(saved);

            // Freshness check: if courseData is provided and created_at doesn't match
            // We clear progress if:
            // 1. courseData has created_at
            // 2. AND (saved progress has NO created_at OR it's different)
            if (courseData && courseData.created_at && (!progress.created_at || progress.created_at !== courseData.created_at)) {
                console.warn('[PROGRESS] Stale or missing timestamp. Clearing progress for course:', id);
                return { lessons: {}, homeworks: {}, created_at: courseData.created_at };
            }

            return progress;
        } catch (e) {
            return { lessons: {}, homeworks: {}, created_at: courseData?.created_at };
        }
    };

    const saveProgress = (type, itemId, value) => {
        // Here we don't have courseData handy easily, but we have course state
        const current = getSavedProgress(course);
        if (type === 'lesson') {
            current.lessons[itemId] = Math.max(current.lessons[itemId] || 0, value);
        } else if (type === 'homework') {
            current.homeworks[itemId] = value;
        }

        // Ensure created_at is preserved
        if (course?.created_at) {
            current.created_at = course.created_at;
        }

        localStorage.setItem(`course_progress_${id}`, JSON.stringify(current));
    };

    const processCourseWithProgress = (courseData) => {
        if (!courseData) return null;

        const progress = getSavedProgress(courseData);
        let isPrevItemCompleted = true;

        const newModules = courseData.modules.map(mod => {
            const newLessons = mod.lessons.map(lesson => {
                const savedProg = progress.lessons[lesson.id] || 0;
                const isCompleted = savedProg >= 100;
                const isLocked = !isPrevItemCompleted;

                if (!isCompleted) isPrevItemCompleted = false;

                return {
                    ...lesson,
                    progress: savedProg,
                    isCompleted,
                    isLocked
                };
            });

            let hwLocked = !isPrevItemCompleted;
            let hwCompleted = false;
            if (mod.homework) {
                hwCompleted = !!progress.homeworks[mod.id];
                if (!hwCompleted) isPrevItemCompleted = false;
            }

            return {
                ...mod,
                lessons: newLessons,
                homework_locked: hwLocked,
                homework_completed: hwCompleted
            };
        });

        return { ...courseData, modules: newModules };
    };

    const loadCourse = async () => {
        try {
            const data = await getCourse(id);
            const processed = processCourseWithProgress(data);
            setCourse(processed);
        } catch (error) {
            console.error(error);
            navigate('/profile');
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (moduleId) => {
        setExpandedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    // --- Navigation ---

    const handleLessonClick = async (lesson) => {
        const moduleOfLesson = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
        if (moduleOfLesson) {
            const modIndex = course.modules.findIndex(m => m.id === moduleOfLesson.id);
            setSelectedModule({ ...moduleOfLesson, index: modIndex });
        }

        setView('loading');
        setActiveLesson(lesson.id);
        try {
            const data = await getLesson(lesson.id);
            const cleaned = data.content ? data.content.replace(/\\n/g, '\n') : '';
            setLessonContent({ ...data, content: cleaned });
            setView('lesson');
        } catch (error) {
            console.error(error);
            setView('lessons');
        }
    };

    const handleGenerateHomework = async (moduleId) => {
        setView('loading');
        try {
            const hw = await generateHomework(moduleId);
            // Updating local course structure to include generated homework
            setCourse(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    modules: prev.modules.map(m =>
                        m.id === moduleId ? { ...m, homework: hw } : m
                    )
                }
            });
            // Update selectedModule as well
            setSelectedModule(prev => ({ ...prev, homework: hw }));

            return hw;
        } catch (error) {
            console.error(error);
            showNotification('Помилка генерації домашки', 'error');
            setView('welcome');
            return null;
        }
    };

    const handleHomeworkClick = async () => {
        // AUTO GENERATE logic
        let hwContent = selectedModule.homework;

        if (!hwContent) {
            // Immediately generate
            const generated = await handleGenerateHomework(selectedModule.id);
            if (!generated) return; // Error handled inside
            hwContent = generated;
        }

        const rawContent = typeof hwContent === 'object' ? hwContent.content : hwContent;
        const cleaned = rawContent.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/^\s*#\s+.+$/m, '');

        setLessonContent({ content: cleaned, title: 'Домашнє завдання' });
        setView('homework');
    };

    const handleNextClick = () => {
        if (!selectedModule) return;

        if (view === 'lesson' && activeLesson) {
            saveProgress('lesson', activeLesson, 100);
            setCourse(prev => {
                if (!prev) return prev;
                return processCourseWithProgress(prev);
            });
        }

        if (view === 'homework') {
            const currentModIndex = course.modules.findIndex(m => m.id === selectedModule.id);
            if (currentModIndex < course.modules.length - 1) {
                const nextMod = course.modules[currentModIndex + 1];
                if (!expandedModules.includes(nextMod.id)) {
                    toggleModule(nextMod.id);
                }
                if (nextMod.lessons.length > 0) {
                    handleLessonClick(nextMod.lessons[0]);
                }
            } else {
                alert('Курс завершено! Вітаємо!');
            }
            return;
        }

        const currentMod = course.modules.find(m => m.id === selectedModule.id);
        const lessonIndex = currentMod.lessons.findIndex(l => l.id === activeLesson);

        if (lessonIndex < currentMod.lessons.length - 1) {
            handleLessonClick(currentMod.lessons[lessonIndex + 1]);
        } else {
            handleHomeworkClick();
        }
    };

    const getNextLabel = () => {
        if (view === 'homework') {
            const currentModIndex = course.modules?.findIndex(m => m.id === selectedModule?.id);
            return currentModIndex < course?.modules?.length - 1 ? 'Наступний модуль' : 'Завершити курс';
        }
        if (!selectedModule) return '';
        const currentMod = course.modules.find(m => m.id === selectedModule.id);
        const lessonIndex = currentMod?.lessons?.findIndex(l => l.id === activeLesson);
        if (lessonIndex < currentMod?.lessons?.length - 1) {
            return 'Наступний розділ';
        }
        return 'До домашнього завдання';
    };

    const handleCheckHomework = async () => {
        if (!homeworkSubmission.trim()) {
            showNotification('Будь ласка, напишіть рішення', 'error');
            return;
        }

        setCheckingHomework(true);
        setHomeworkResult(null);

        try {
            const result = await checkHomework(selectedModule.id, homeworkSubmission);
            setHomeworkResult(result);

            if (result.grade >= 50) {
                saveProgress('homework', selectedModule.id, true);
                setCourse(prev => processCourseWithProgress(prev));
                showNotification('Домашнє завдання зараховано!', 'success');
            } else {
                showNotification(`Оцінка: ${result.grade}. Спробуйте ще раз!`, 'error');
            }
        } catch (error) {
            console.error('Homework check error:', error);
            showNotification('Помилка: ' + error.message, 'error');
        } finally {
            setCheckingHomework(false);
        }
    };

    // === SCROLL TRACKING ===
    // This is what likely causes re-renders during scrolling
    useEffect(() => {
        if (view !== 'lesson' || !activeLesson) return;

        const contentCard = document.querySelector('.topics-content-card');
        if (!contentCard) return;

        const handleContentScroll = () => {
            const scrollTop = contentCard.scrollTop;
            const scrollHeight = contentCard.scrollHeight - contentCard.clientHeight;
            const scrollProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            const roundedProgress = Math.min(98, Math.round(scrollProgress));

            setCourse(prev => {
                if (!prev) return prev;
                saveProgress('lesson', activeLesson, roundedProgress);
                return {
                    ...prev,
                    modules: prev.modules.map(mod => ({
                        ...mod,
                        lessons: mod.lessons.map(lesson =>
                            lesson.id === activeLesson
                                ? { ...lesson, progress: Math.max(lesson.progress || 0, roundedProgress) }
                                : lesson
                        )
                    }))
                };
            });
        };

        contentCard.addEventListener('scroll', handleContentScroll);
        return () => {
            contentCard.removeEventListener('scroll', handleContentScroll);
        };
    }, [view, activeLesson]);

    // === AI CHAT LOGIC ===

    const restoreSelection = (range) => {
        if (range) {
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                console.error('Error restoring selection:', e);
            }
        }
    };

    useEffect(() => {
        let tooltipTimeout = null;
        const handleMouseUp = (e) => {
            if (e.target.closest('#ai-selection-tooltip') || e.target.closest('.ai-card')) return;
            if (tooltipTimeout) clearTimeout(tooltipTimeout);

            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0) {
                setSelectedText(text);
                try {
                    const range = selection.getRangeAt(0).cloneRange();
                    setSelectedRange(range);
                    setTimeout(() => restoreSelection(range), 10);
                } catch (e) {
                    console.error('Error saving range:', e);
                }

                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                let top = rect.top - 45;
                let left = rect.left + rect.width / 2 - 50;
                if (left < 10) left = 10;
                if (top < 10) top = rect.bottom + 10;

                setTooltipPos({ top, left });
                tooltipTimeout = setTimeout(() => {
                    setShowTooltip(true);
                    restoreSelection(range);
                }, 500);
            } else {
                setShowTooltip(false);
            }
        };

        const handleScroll = () => {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            setShowTooltip(false);
        };

        const handleMouseDown = (e) => {
            if (e.target.closest('#ai-selection-tooltip') || e.target.closest('.ai-card')) return;
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            setShowTooltip(false);
            setSelectedRange(null);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    // Highlight for AI Chat (separate from lesson content)
    useEffect(() => {
        if (showAICard && chatMessages.length > 0) {
            setTimeout(() => {
                const chatBody = document.querySelector('.ai-card-body');
                if (chatBody) {
                    chatBody.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                    addCopyButtonsToCodeBlocks(chatBody);
                }
            }, 500);
        }
    }, [chatMessages, showAICard]);

    // Auto-scroll AI Chat
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [chatMessages, showAICard]);

    const handleOpenAIChat = () => {
        setShowTooltip(false);
        setChatMessages([]);

        const pos = { ...tooltipPos };
        if (pos.left + 360 > window.innerWidth) pos.left = window.innerWidth - 380;
        if (pos.top + 400 > window.innerHeight) pos.top = window.innerHeight - 420;

        setAICardPos(pos);
        setShowAICard(true);

        // Автоматично надсилаємо запит
        handleSendAIMessage('детально поясни');
    };

    const handleSendAIMessage = async (customMessage = null) => {
        const messageText = customMessage || aiInput;
        if (!messageText.trim()) return;

        const userMsg = { type: 'user', text: messageText };
        setChatMessages((prev) => [...prev, userMsg]);
        if (!customMessage) setAIInput('');

        const loaderMsg = { type: 'ai', text: 'Думаю...', loading: true };
        setChatMessages((prev) => [...prev, loaderMsg]);

        try {
            const isHomework = view === 'homework';
            const result = await askAI(
                selectedText,
                messageText,
                isHomework ? null : lessonContent?.id,
                isHomework ? lessonContent?.id : null
            );

            setChatMessages((prev) =>
                prev.filter((m) => !m.loading).concat({
                    type: 'ai',
                    text: result.response || result.answer,
                })
            );
        } catch (error) {
            console.error('AI Error:', error);
            setChatMessages((prev) =>
                prev.filter((m) => !m.loading).concat({
                    type: 'ai',
                    text: 'Вибачте, сталася помилка. Спробуйте ще раз.',
                })
            );
        }
    };

    // AI Card Dragging
    const handleDragStart = (e) => {
        if (!e.target.closest('.ai-card-header')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - aiCardPos.left,
            y: e.clientY - aiCardPos.top
        });
    };

    useEffect(() => {
        const handleDragMove = (e) => {
            if (!isDragging) return;
            setAICardPos({
                left: e.clientX - dragOffset.x,
                top: e.clientY - dragOffset.y
            });
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.body.classList.add('dragging-active');
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        } else {
            document.body.classList.remove('dragging-active');
        }

        return () => {
            document.body.classList.remove('dragging-active');
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, dragOffset]);


    if (loading) {
        return (
            <div className="bg-app min-h-screen flex flex-col items-center justify-center">
                <Header variant="app" user={{}} />
                <div className="loading-center mt-40">
                    <div className="loader loader-large" />
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
            <Header variant="app" user={{}} />

            {/* AI Tooltip */}
            {showTooltip && (
                <div
                    id="ai-selection-tooltip"
                    className="visible"
                    style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
                    onClick={handleOpenAIChat}
                >
                    <i className="ph-bold ph-sparkle"></i>
                    <span>Запитати AI</span>
                </div>
            )}

            {/* AI Card */}
            {showAICard && (
                <div
                    className="ai-card visible"
                    style={{
                        top: `${aiCardPos.top}px`,
                        left: `${aiCardPos.left}px`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div
                        className="ai-card-header"
                        onMouseDown={handleDragStart}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        <div className="ai-card-title">
                            <i className="ph-bold ph-robot"></i>
                            <span>AI Assistant</span>
                        </div>
                        <div className="ai-card-close-btn" onClick={() => setShowAICard(false)} title="Закрити">
                            <i className="ph-bold ph-x"></i>
                        </div>
                    </div>

                    <div className="ai-card-body" ref={chatBodyRef} style={{ flex: 1, minHeight: 0 }}>
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`chat-msg ${msg.type}`}>
                                {msg.loading ? (
                                    <div className="thinking-bubble">
                                        <div className="loader loader-small"></div>
                                        <span>Думаю...</span>
                                    </div>
                                ) : (
                                    <div className={msg.type === 'user' ? 'user-bubble' : 'ai-bubble'}>
                                        <MemoizedChatMessage text={msg.text} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {selectedText && (
                        <div className="ai-context-preview" title={selectedText}>
                            <i className="ph-bold ph-quotes"></i>
                            <span>{selectedText}</span>
                        </div>
                    )}

                    <div className="ai-card-footer">
                        <div className="ai-input-container">
                            <input
                                type="text"
                                className="ai-input"
                                placeholder="Запитати..."
                                value={aiInput}
                                onChange={(e) => setAIInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSendAIMessage();
                                    }
                                }}
                            />
                        </div>
                        <button className="ai-send-btn" onClick={() => handleSendAIMessage()}>
                            <i className="ph-bold ph-paper-plane-right"></i>
                        </button>
                    </div>
                </div>
            )}

            <main
                className="topics-main"
                style={{ padding: 0 }}
            >
                {/* Sidebar */}
                <aside className="topics-sidebar-card w-full lg:w-[300px] flex-shrink-0 bg-[rgba(22,22,22,0.95)] border border-[#2C2C2C] rounded-3xl p-6 flex flex-col shadow-[0_10px_30px_rgba(0,0,0,0.2)] max-h-[420px] lg:max-h-full">
                    <h3 className="sidebar-title">{course?.topic || 'Завантаження...'}</h3>
                    <div className="sidebar-items-list flex flex-col gap-2 overflow-y-auto flex-grow pr-1">
                        {course?.modules?.map((module, index) => {
                            const isExpanded = expandedModules.includes(module.id);
                            const isModuleActive = module.lessons?.some(lesson => lesson.id === activeLesson);
                            return (
                                <div key={module.id} className="module-accordion mb-2">
                                    <div
                                        className={`module-btn ${isModuleActive ? 'active' : ''} flex flex-col p-4 rounded-2xl cursor-pointer transition relative
                                            bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]
                                            hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.1)]
                                            ${isModuleActive ? 'bg-indigo-500 border-indigo-500 shadow-[0_4px_15px_rgba(99,102,241,0.3)]' : ''}
                                        `}
                                        onClick={() => toggleModule(module.id)}
                                    >
                                        <div className="module-btn-header font-pixel text-[12px] text-[#888] mb-1 uppercase tracking-[0.1em] text-center">
                                            Module {index + 1}
                                        </div>
                                        <div className="module-btn-title text-[13px] font-medium text-[#e0e0e0] text-center">
                                            {module.title}
                                        </div>
                                        <i className={`ph-bold ph-caret-${isExpanded ? 'up' : 'down'} module-toggle-icon absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#888]`}></i>
                                    </div>

                                    {isExpanded && (
                                        <div className="module-lessons-list mt-2 pl-2 flex flex-col gap-1 animate-[slideDown_0.3s_ease]">
                                            {module.lessons?.map((lesson, lessonIndex) => (
                                                <div
                                                    key={lesson.id}
                                                    className={`lesson-item ${lesson.id === activeLesson ? 'active' : ''} ${lesson.isLocked ? 'locked' : ''}
                                                        relative overflow-hidden flex flex-col gap-2
                                                        p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]
                                                        rounded-xl cursor-pointer transition
                                                        hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.08)]
                                                    `}
                                                    onClick={() => !lesson.isLocked && handleLessonClick(lesson)}
                                                >
                                                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                                                        <div className="lesson-item-info flex items-center gap-3">
                                                            <span className="lesson-item-number font-pixel text-[11px] text-[#666] min-w-[35px]">
                                                                {index + 1}.{lessonIndex + 1}
                                                            </span>
                                                            <span className="lesson-item-title text-[12px] font-medium text-[#ccc] flex-1">
                                                                {lesson.title}
                                                            </span>
                                                        </div>

                                                        <div className="lesson-status-icon ml-auto text-[16px] flex items-center justify-center">
                                                            {lesson.isLocked ? (
                                                                <i className="ph-bold ph-lock status-lock"></i>
                                                            ) : lesson.isCompleted ? (
                                                                <i className="ph-bold ph-check status-check"></i>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {!lesson.isLocked && !lesson.isCompleted && (lesson.progress || 0) > 0 && (
                                                        <div className="lesson-item-progress-track">
                                                            <div
                                                                className="lesson-item-progress-fill"
                                                                style={{ width: `${lesson.progress}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <div
                                                className={`lesson-item homework-item ${module.homework_locked ? 'locked' : ''}
                                                    border-[rgba(251,146,60,0.2)]
                                                `}
                                                onClick={() => {
                                                    if (!module.homework_locked) {
                                                        setSelectedModule({ ...module, index });
                                                        handleHomeworkClick();
                                                    }
                                                }}
                                            >
                                                <div className="lesson-item-info flex items-center gap-3">
                                                    <span className="lesson-item-number">📝</span>
                                                    <span className="lesson-item-title">Домашнє завдання</span>
                                                </div>
                                                <div className="lesson-status-icon ml-auto">
                                                    {module.homework_locked ? (
                                                        <i className="ph-bold ph-lock status-lock"></i>
                                                    ) : module.homework_completed ? (
                                                        <i className="ph-bold ph-check status-check"></i>
                                                    ) : (
                                                        <div className="lesson-progress-bar">
                                                            <div
                                                                className="lesson-progress-fill homework-progress"
                                                                style={{ width: `${module.homework_progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Content */}
                <section className="topics-content-card flex-1 bg-[rgba(22,22,22,0.95)] border border-[#2C2C2C] rounded-3xl p-8 relative overflow-y-auto block max-h-[600px] lg:max-h-full">
                    {view === 'welcome' && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                textAlign: 'center',
                                color: '#666',
                            }}
                        >
                            <img src="/src/assets/images/icons/Vector.svg" style={{ width: '48px', opacity: '0.2', marginBottom: '20px' }} alt="" />
                            <p style={{ fontSize: '16px', color: '#888' }}>Оберіть урок ліворуч,</p>
                            <p style={{ fontSize: '14px', color: '#555' }}>щоб побачити матеріали курсу</p>
                        </div>
                    )}



                    {view === 'lesson' && lessonContent && (
                        <ContentView
                            htmlContent={DOMPurify.sanitize(parseMarkdown(lessonContent.content))}
                            nextLabel={getNextLabel()}
                            onNext={handleNextClick}
                        />
                    )}

                    {view === 'homework' && lessonContent && (
                        <div className="content-view-wrapper">
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <h1>Домашнє завдання</h1>
                                <div
                                    className="lesson-content-view"
                                    style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(lessonContent.content)) }}
                                />

                                <div className="homework-submission-area">
                                    <h3 style={{ color: '#fff', marginBottom: '10px' }}>Ваше рішення</h3>
                                    <textarea
                                        value={homeworkSubmission}
                                        onChange={(e) => setHomeworkSubmission(e.target.value)}
                                        placeholder={`// Напишіть ваш код тут...\n\nconsole.log('Hello World');`}
                                        style={{
                                            width: '100%',
                                            height: '250px',
                                            background: '#1e1e2e',
                                            color: '#a5b4fc',
                                            border: '1px solid #444',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            fontFamily: "'Consolas', monospace",
                                            fontSize: '14px',
                                            resize: 'vertical',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            lineHeight: '1.5'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '20px' }}>
                                        <button
                                            onClick={handleCheckHomework}
                                            disabled={checkingHomework}
                                            className="generate-btn"
                                            style={{ marginTop: 0 }}
                                        >
                                            {checkingHomework ? (
                                                <>
                                                    Перевіряю... <div className="loader" style={{ width: '14px', height: '14px', borderWidth: '2px', marginLeft: '5px', display: 'inline-block' }}></div>
                                                </>
                                            ) : (
                                                'Відправити на перевірку'
                                            )}
                                        </button>
                                    </div>

                                    {homeworkResult && (
                                        <div style={{
                                            marginTop: '30px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '16px',
                                            padding: '25px',
                                            border: '1px solid #333'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                                                <div
                                                    style={{
                                                        width: '60px',
                                                        height: '60px',
                                                        borderRadius: '50%',
                                                        background: '#1e1e2e',
                                                        color: homeworkResult.grade >= 90 ? '#4ade80' : homeworkResult.grade >= 70 ? '#fbbf24' : homeworkResult.grade >= 50 ? '#facc15' : '#f87171',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        fontSize: '20px',
                                                        border: `4px solid ${homeworkResult.grade >= 90 ? '#4ade80' : homeworkResult.grade >= 70 ? '#fbbf24' : homeworkResult.grade >= 50 ? '#facc15' : '#f87171'}`
                                                    }}
                                                >
                                                    {homeworkResult.grade}
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '18px' }}>Результат AI Review</h4>
                                                    <span style={{ color: '#888', fontSize: '13px' }}>Teacher Module</span>
                                                </div>
                                            </div>
                                            <div style={{ background: '#1e1e2e', padding: '20px', borderRadius: '12px' }}>
                                                <div
                                                    className="ai-message-content"
                                                    style={{ fontSize: '15px' }}
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(homeworkResult.feedback)) }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', paddingBottom: '40px' }}>
                                    <button className="generate-btn" onClick={handleNextClick} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {getNextLabel()} <i className="ph-bold ph-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'loading' && (
                        <div className="loading-center">
                            <div className="loader loader-large" />
                            <p>Завантаження...</p>
                        </div>
                    )}
                </section>
            </main>
        </div >
    );
}
