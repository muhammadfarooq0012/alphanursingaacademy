/* ═══════════════════════════════════════════════════════════════
   QUIZ.JS — Quiz Engine Module
   Manages quiz state, question rendering, and navigation
   ═══════════════════════════════════════════════════════════════ */

/**
 * QuizEngine — Manages quiz playback for a single chapter.
 * Loads questions, renders one at a time, handles prev/next navigation.
 */
const QuizEngine = (() => {
    // ─── Private State ───
    let _questions = [];       // Current quiz questions array
    let _currentIndex = 0;     // Current question index
    let _subjectName = '';     // Current subject display name
    let _chapterName = '';     // Current chapter display name
    let _container = null;     // DOM container for quiz rendering
    let _clipboardGuardBound = false;

    // Option letters for labeling
    const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

    // ─── Public API ───

    /**
     * Initialize and start a quiz.
     * @param {Object} params
     * @param {string} params.subjectFolder - Subject folder name
     * @param {string} params.chapterFile - Chapter file name (without .json)
     * @param {string} params.subjectName - Display name for the subject
     * @param {string} params.chapterName - Display name for the chapter
     * @param {HTMLElement} params.container - DOM element to render into
     */
    async function start({ subjectFolder, chapterFile, subjectName, chapterName, container }) {
        _container = container;
        _subjectName = subjectName;
        _chapterName = chapterName;
        _currentIndex = 0;
        _bindClipboardGuard();

        // Show loading state
        _container.innerHTML = `
            <div class="quiz-container">
                <div class="content-loader">
                    <div class="spinner"></div>
                    <p>Loading questions...</p>
                </div>
            </div>
        `;

        try {
            // Fetch quiz data
            _questions = await DataLoader.fetchQuizData(subjectFolder, chapterFile);

            if (_questions.length === 0) {
                _renderEmpty();
                return;
            }

            // Render first question
            _renderQuiz();

        } catch (error) {
            _renderError(error.message);
        }
    }

    /**
     * Navigate to the next question.
     */
    function next() {
        if (_currentIndex < _questions.length - 1) {
            _currentIndex++;
            _renderQuiz();
            _scrollToTop();
        }
    }

    /**
     * Navigate to the previous question.
     */
    function prev() {
        if (_currentIndex > 0) {
            _currentIndex--;
            _renderQuiz();
            _scrollToTop();
        }
    }

    /**
     * Get current quiz state.
     * @returns {Object} { currentIndex, totalQuestions, isFirst, isLast }
     */
    function getState() {
        return {
            currentIndex: _currentIndex,
            totalQuestions: _questions.length,
            isFirst: _currentIndex === 0,
            isLast: _currentIndex === _questions.length - 1
        };
    }

    /**
     * Check if a quiz is currently active.
     * @returns {boolean}
     */
    function isActive() {
        return _questions.length > 0;
    }

    // ─── Private Methods ───

    /**
     * Render the complete quiz UI with current question.
     */
    function _renderQuiz() {
        const q = _questions[_currentIndex];
        const total = _questions.length;
        const progress = (((_currentIndex + 1) / total) * 100).toFixed(1);
        const isFirst = _currentIndex === 0;
        const isLast = _currentIndex === total - 1;

        _container.innerHTML = `
            <div class="quiz-container page-transition quiz-protected">
                <!-- Back Button -->
                <button class="back-button" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Back to Chapters
                </button>

                <!-- Quiz Header -->
                <div class="quiz-header">
                    <div class="quiz-counter">
                        Question <span>${_currentIndex + 1}</span> of <span>${total}</span>
                    </div>
                    <div class="quiz-chapter-title">
                        <i class="fas fa-book-open"></i> ${_subjectName} — ${_chapterName}
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="quiz-progress">
                    <div class="quiz-progress-fill" style="width: ${progress}%"></div>
                </div>

                <!-- Question Card -->
                <div class="question-card">
                    <div class="question-number">
                        <i class="fas fa-question-circle"></i>
                        Question ${_currentIndex + 1}
                    </div>
                    <h2 class="question-text">${_formatBilingualText(q.question)}</h2>

                    <!-- Options -->
                    <div class="options-list">
                        ${q.options.map((opt, idx) => `
                            <div class="option-item ${idx === q.correctAnswer ? 'correct' : ''}">
                                <div class="option-letter">${idx === q.correctAnswer ? '<i class="fas fa-check"></i>' : OPTION_LETTERS[idx]}</div>
                                <span class="option-text">${_formatBilingualText(opt)}</span>
                                <span class="option-check"><i class="fas fa-check-circle"></i></span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Navigation Buttons -->
                <div class="quiz-nav">
                    <button class="btn btn-ghost" id="quiz-prev" ${isFirst ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                        Previous
                    </button>
                    <div class="quiz-nav-info">
                        ${_currentIndex + 1} / ${total}
                    </div>
                    <button class="btn btn-primary" id="quiz-next" ${isLast ? 'disabled' : ''}>
                        Next
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Bind navigation button events
        const prevBtn = document.getElementById('quiz-prev');
        const nextBtn = document.getElementById('quiz-next');

        if (prevBtn) prevBtn.addEventListener('click', prev);
        if (nextBtn) nextBtn.addEventListener('click', next);
    }

    /**
     * Render empty state when no questions found.
     */
    function _renderEmpty() {
        _container.innerHTML = `
            <div class="quiz-container page-transition">
                <button class="back-button" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Back to Chapters
                </button>
                <div class="empty-state">
                    <i class="fas fa-inbox empty-state-icon"></i>
                    <h3>No Questions Available</h3>
                    <p>This chapter doesn't have any questions yet. Please check back later.</p>
                    <a href="#subjects" class="btn btn-primary mt-2">
                        <i class="fas fa-book"></i>
                        Browse Subjects
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Render error state.
     * @param {string} message - Error message to display
     */
    function _renderError(message) {
        _container.innerHTML = `
            <div class="quiz-container page-transition">
                <button class="back-button" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Back to Chapters
                </button>
                <div class="error-state">
                    <div class="error-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Failed to Load Quiz</h3>
                    <p>${_escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Scroll main content to top smoothly.
     */
    function _scrollToTop() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Prevent copying, cutting, pasting, and text selection inside quizzes.
     */
    function _bindClipboardGuard() {
        if (_clipboardGuardBound || !_container) return;

        const blockClipboardAction = (event) => {
            event.preventDefault();
            return false;
        };

        _container.addEventListener('copy', blockClipboardAction);
        _container.addEventListener('cut', blockClipboardAction);
        _container.addEventListener('paste', blockClipboardAction);
        _container.addEventListener('contextmenu', blockClipboardAction);
        _container.addEventListener('dragstart', blockClipboardAction);
        _container.addEventListener('selectstart', blockClipboardAction);

        _clipboardGuardBound = true;
    }

    /**
     * Escape HTML entities to prevent XSS.
     * @param {string} str - Raw string
     * @returns {string} Escaped string
     */
    function _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Render mixed English/Urdu text with Urdu styling after the separator.
     * @param {string} str
     * @returns {string}
     */
    function _formatBilingualText(str) {
        if (!str) return '';

        const parts = String(str).split(' / ');
        if (parts.length < 2) {
            return _escapeHtml(str);
        }

        const englishText = _escapeHtml(parts.shift().trim());
        const urduText = _escapeHtml(parts.join(' / ').trim());

        return `${englishText} <span class="urdu-separator">/</span> <span class="urdu-text" lang="ur" dir="rtl">${urduText}</span>`;
    }

    // ─── Expose Public API ───
    return {
        start,
        next,
        prev,
        getState,
        isActive
    };
})();
