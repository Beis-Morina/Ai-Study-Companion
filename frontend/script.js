const API_BASE = 'http://127.0.0.1:8000';
const AUTH_TOKEN_KEY = 'authToken';
const CHAT_ID_KEY = 'currentChatId';

let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
let currentChatId = localStorage.getItem(CHAT_ID_KEY) || null;
let activeTool = null;
let isChatBusy = false;
let isModalBusy = false;

const els = {};

const toolConfig = {
    summarize: {
        title: 'Summarize',
        description: 'Paste the topic and context you want condensed into a clear study summary.',
        buildPrompt: (topic, context) => [
            'Summarize the following study material into clear, exam-ready notes.',
            `Topic: ${topic}`,
            `Context:\n${context || 'Use the topic title as the main focus.'}`
        ].join('\n\n'),
        preview: (topic, context) => [
            `Summarize request: ${topic}`,
            context || 'Use the topic title as the main focus.'
        ].join('\n\n')
    },
    quiz: {
        title: 'Quiz',
        description: 'Paste the topic and context you want turned into a practice quiz.',
        buildPrompt: (topic, context) => [
            'Create a practice quiz from the following study material.',
            `Topic: ${topic}`,
            `Context:\n${context || 'Use the topic title as the main focus.'}`
        ].join('\n\n'),
        preview: (topic, context) => [
            `Quiz request: ${topic}`,
            context || 'Use the topic title as the main focus.'
        ].join('\n\n')
    }
};

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    cacheElements();
    configureMarkdown();
    bindEvents();
    hydrateView();
}

function cacheElements() {
    els.authContainer = document.getElementById('auth-container');
    els.loginCard = document.getElementById('login-card');
    els.welcomeScreen = document.getElementById('welcome-screen');
    els.formContainer = document.getElementById('form-container');
    els.authForm = document.getElementById('auth-form');
    els.formKicker = document.getElementById('form-kicker');
    els.formTitle = document.getElementById('form-title');
    els.formSubtitle = document.getElementById('form-subtitle');
    els.errorBox = document.getElementById('error-box');
    els.username = document.getElementById('username');
    els.password = document.getElementById('password');
    els.authSubmitBtn = document.getElementById('auth-submit-btn');
    els.goBackBtn = document.getElementById('go-back-btn');
    els.dashboard = document.getElementById('dashboard');
    els.logoutBtn = document.getElementById('logout-btn');
    els.newSessionBtn = document.getElementById('new-session-btn');
    els.sessionStatus = document.getElementById('session-status');
    els.sessionTitle = document.getElementById('session-title');
    els.chatError = document.getElementById('chat-error');
    els.chatWindow = document.getElementById('chat-window');
    els.chatContent = document.getElementById('chat-content');
    els.loadingSpinner = document.getElementById('loading-spinner');
    els.chatForm = document.getElementById('chat-form');
    els.chatInput = document.getElementById('chat-input');
    els.chatSubmitBtn = document.getElementById('chat-submit-btn');
    els.modalOverlay = document.getElementById('modal-overlay');
    els.modalTitle = document.getElementById('modal-title');
    els.modalDescription = document.getElementById('modal-description');
    els.modalError = document.getElementById('modal-error');
    els.topicName = document.getElementById('topic-name');
    els.topicDesc = document.getElementById('topic-desc');
    els.modalSubmitBtn = document.getElementById('modal-submit-btn');
    els.modalCancelBtn = document.getElementById('modal-cancel-btn');
    els.modalCloseBtn = document.getElementById('modal-close-btn');
}

function configureMarkdown() {
    if (window.marked && typeof window.marked.setOptions === 'function') {
        window.marked.setOptions({
            breaks: true,
            gfm: true
        });
    }
}

function bindEvents() {
    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
        button.addEventListener('click', () => showForm(button.dataset.authMode));
    });

    document.querySelectorAll('[data-tool]').forEach((button) => {
        button.addEventListener('click', () => openModal(button.dataset.tool));
    });

    els.authForm.addEventListener('submit', handleAuthSubmit);
    els.goBackBtn.addEventListener('click', showWelcome);
    els.logoutBtn.addEventListener('click', handleLogout);
    els.newSessionBtn.addEventListener('click', startNewSession);
    els.chatForm.addEventListener('submit', handleChatSubmit);
    els.chatInput.addEventListener('input', autoResizeComposer);
    els.chatInput.addEventListener('keydown', handleComposerKeydown);
    els.modalSubmitBtn.addEventListener('click', handleGenerate);
    els.modalCancelBtn.addEventListener('click', closeModal);
    els.modalCloseBtn.addEventListener('click', closeModal);

    els.modalOverlay.addEventListener('click', (event) => {
        if (event.target === els.modalOverlay && !isModalBusy) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && els.modalOverlay.classList.contains('is-open') && !isModalBusy) {
            closeModal();
        }
    });
}

function hydrateView() {
    updateSessionUI();

    if (authToken) {
        showDashboard();
        if (currentChatId) {
            loadChatHistory(currentChatId);
        } else {
            resetChatView();
        }
    } else {
        showWelcome();
        setAppView('auth');
    }

    requestAnimationFrame(() => {
        document.body.classList.remove('app-loading');
    });
}

function setAppView(view) {
    document.body.dataset.appView = view;
    els.dashboard.setAttribute('aria-hidden', view !== 'dashboard');
}

function showForm(mode) {
    clearAuthError();
    els.authForm.reset();
    els.authForm.dataset.mode = mode;
    els.formKicker.textContent = mode === 'register' ? 'Create Account' : 'Secure Access';
    els.formTitle.textContent = mode === 'register' ? 'Create Account' : 'Welcome Back';
    els.formSubtitle.textContent = mode === 'register'
        ? 'Register to save your token and enter the dashboard instantly.'
        : 'Sign in to continue your study session.';
    els.password.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
    els.welcomeScreen.classList.add('hidden');
    els.formContainer.classList.remove('hidden');
    animateIn(els.formContainer);
    window.setTimeout(() => els.username.focus(), 0);
}

function showWelcome() {
    clearAuthError();
    els.authForm.reset();
    els.authForm.dataset.mode = '';
    els.password.setAttribute('autocomplete', 'current-password');
    els.formContainer.classList.add('hidden');
    els.welcomeScreen.classList.remove('hidden');
    animateIn(els.welcomeScreen);
}

function animateIn(element) {
    element.classList.remove('panel-enter');
    void element.offsetWidth;
    element.classList.add('panel-enter');
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const mode = event.currentTarget.dataset.mode;
    const username = els.username.value.trim();
    const password = els.password.value.trim();

    if (!mode) {
        showForm('login');
        return;
    }

    if (!username || !password) {
        setAuthError('Please enter both username and password.');
        return;
    }

    clearAuthError();
    setAuthLoading(true, mode === 'register' ? 'Creating account...' : 'Signing in...');

    try {
        const { response, data } = await apiRequest(`/api/auth/${mode}`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }, { requiresAuth: false });

        if (!response.ok) {
            setAuthError(extractErrorMessage(data, 'Unable to sign you in right now.'));
            return;
        }

        if (!data.token) {
            setAuthError('Authentication succeeded, but the server did not return a token.');
            return;
        }

        authToken = data.token;
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        persistCurrentChatId(null);
        resetChatView();
        clearChatError();
        closeModal();
        showDashboard();
        els.chatInput.focus();
    } catch (error) {
        setAuthError(error.message || 'Unable to reach the server.');
    } finally {
        setAuthLoading(false);
    }
}

function setAuthLoading(isLoading, label = 'Continue') {
    els.authSubmitBtn.disabled = isLoading;
    els.authSubmitBtn.textContent = isLoading ? label : 'Continue';
}

function showDashboard() {
    if (!ensureAuthenticated(false)) {
        return;
    }

    setAppView('dashboard');
    updateSessionUI();
}

function handleLogout() {
    resetBusyStates();
    clearSessionState();
    closeModal(true);
    resetChatView();
    clearChatError();
    showWelcome();
    setAppView('auth');
}

function clearSessionState() {
    authToken = '';
    persistCurrentChatId(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CHAT_ID_KEY);
}

function startNewSession() {
    if (!ensureAuthenticated()) {
        return;
    }

    persistCurrentChatId(null);
    clearChatError();
    resetChatView();
    updateSessionUI();
    els.chatInput.focus();
}

async function handleChatSubmit(event) {
    event.preventDefault();

    if (!ensureAuthenticated()) {
        return;
    }

    const message = els.chatInput.value.trim();
    if (!message || isChatBusy) {
        return;
    }

    appendMessage('user', message);
    els.chatInput.value = '';
    autoResizeComposer();
    clearChatError();

    await sendPrompt(message, {
        loadingLabel: 'AI is analyzing...',
        errorTarget: 'chat'
    });
}

function handleComposerKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        els.chatForm.requestSubmit();
    }
}

async function sendPrompt(prompt, options = {}) {
    const { loadingLabel = 'AI is analyzing...', errorTarget = 'chat' } = options;

    if (isChatBusy) {
        return false;
    }

    setChatLoading(true, loadingLabel);

    try {
        const result = await performChatRequest(prompt);

        if (Array.isArray(result.messages) && result.messages.length > 0) {
            renderMessages(result.messages);
        } else if (result.assistantMessage) {
            appendMessage('assistant', result.assistantMessage);
        } else {
            throw new Error('The AI response format was not recognized.');
        }

        updateSessionUI();
        return true;
    } catch (error) {
        if (!authToken) {
            return false;
        }

        const message = error.message || 'Unable to process your request.';
        if (errorTarget === 'modal') {
            setModalError(message);
        } else {
            setChatError(message);
        }
        return false;
    } finally {
        setChatLoading(false);
    }
}

async function performChatRequest(message) {
    const payload = { message };

    if (currentChatId) {
        payload.chat_id = currentChatId;
    }

    const { response, data } = await apiRequest('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Unable to reach the AI right now.'));
    }

    const returnedChatId = normalizeChatId(data.chat_id ?? data.chatId ?? currentChatId);
    if (returnedChatId) {
        persistCurrentChatId(returnedChatId);
    }

    const assistantMessage = extractAssistantMessage(data);
    if (assistantMessage) {
        return { assistantMessage };
    }

    if (currentChatId) {
        const messages = await fetchChatHistory(currentChatId);
        return { messages };
    }

    throw new Error('The AI response format was not recognized.');
}

async function loadChatHistory(chatId) {
    if (!chatId || !ensureAuthenticated()) {
        return;
    }

    clearChatError();
    setChatLoading(true, 'Loading session...');

    try {
        const messages = await fetchChatHistory(chatId);
        persistCurrentChatId(chatId);
        renderMessages(messages);
        updateSessionUI();
    } catch (error) {
        if (!authToken) {
            return;
        }

        setChatError(error.message || 'Unable to load the previous chat history.');
        persistCurrentChatId(null);
        resetChatView();
        updateSessionUI();
    } finally {
        setChatLoading(false);
    }
}

async function fetchChatHistory(chatId) {
    const { response, data } = await apiRequest(`/api/chat/history?chat_id=${encodeURIComponent(chatId)}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Unable to load the previous chat history.'));
    }

    const rawMessages = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(data.history)
            ? data.history
            : Array.isArray(data)
                ? data
                : [];

    return rawMessages
        .map(normalizeMessage)
        .filter(Boolean);
}

function normalizeMessage(message) {
    if (!message || typeof message !== 'object') {
        return null;
    }

    const role = message.role === 'assistant' || message.role === 'ai' ? 'assistant' : 'user';
    const content = message.content ?? message.message ?? message.text ?? '';

    if (typeof content !== 'string' || !content.trim()) {
        return null;
    }

    return { role, content: content.trim() };
}

function renderMessages(messages) {
    els.chatContent.innerHTML = '';

    if (!messages.length) {
        resetChatView();
        return;
    }

    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
        fragment.appendChild(createMessageElement(message.role, message.content));
    });
    els.chatContent.appendChild(fragment);
    scrollChatToBottom();
}

function appendMessage(role, content) {
    removeEmptyState();
    els.chatContent.appendChild(createMessageElement(role, content));
    scrollChatToBottom();
}

function createMessageElement(role, content) {
    const message = document.createElement('article');
    message.className = `message ${role === 'assistant' ? 'message-ai' : 'message-user'}`;

    if (role === 'assistant') {
        message.innerHTML = window.marked ? window.marked.parse(content) : content;
    } else {
        message.textContent = content;
    }

    return message;
}

function resetChatView() {
    els.chatContent.innerHTML = `
        <div id="chat-empty-state" class="empty-state">
            <h3>Ready when you are</h3>
            <p>Send a message, summarize your notes, or build a quick quiz from your study material.</p>
        </div>
    `;
    scrollChatToBottom();
}

function removeEmptyState() {
    const emptyState = document.getElementById('chat-empty-state');
    if (emptyState) {
        emptyState.remove();
    }
}

function scrollChatToBottom() {
    els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
}

function updateSessionUI() {
    if (currentChatId) {
        els.sessionTitle.textContent = `Working in session ${currentChatId}`;
        els.sessionStatus.textContent = `Active chat ID: ${currentChatId}. History can be restored from the backend.`;
    } else {
        els.sessionTitle.textContent = 'Start a fresh study conversation';
        els.sessionStatus.textContent = 'No active session yet.';
    }
}

function persistCurrentChatId(chatId) {
    currentChatId = chatId ? String(chatId) : null;

    if (currentChatId) {
        localStorage.setItem(CHAT_ID_KEY, currentChatId);
    } else {
        localStorage.removeItem(CHAT_ID_KEY);
    }
}

function openModal(tool) {
    if (!ensureAuthenticated()) {
        return;
    }

    const config = toolConfig[tool];
    if (!config) {
        return;
    }

    activeTool = tool;
    clearModalError();
    els.topicName.value = '';
    els.topicDesc.value = '';
    els.modalTitle.textContent = config.title;
    els.modalDescription.textContent = config.description;
    els.modalSubmitBtn.textContent = 'Generate';
    els.modalSubmitBtn.disabled = false;
    els.modalCancelBtn.disabled = false;
    els.topicName.disabled = false;
    els.topicDesc.disabled = false;
    els.modalOverlay.classList.add('is-open');
    els.modalOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => els.topicName.focus(), 0);
}

function closeModal(forceClose = false) {
    if (isModalBusy && !forceClose) {
        return;
    }

    activeTool = null;
    setModalLoading(false);
    clearModalError();
    els.modalOverlay.classList.remove('is-open');
    els.modalOverlay.setAttribute('aria-hidden', 'true');
}

async function handleGenerate() {
    if (!ensureAuthenticated() || !activeTool || isModalBusy) {
        return;
    }

    const config = toolConfig[activeTool];
    const topic = els.topicName.value.trim();
    const context = els.topicDesc.value.trim();

    if (!topic) {
        setModalError('Please enter a topic before generating.');
        return;
    }

    clearModalError();
    setModalLoading(true);
    appendMessage('user', config.preview(topic, context));

    const wasSuccessful = await sendPrompt(config.buildPrompt(topic, context), {
        loadingLabel: 'AI is analyzing...',
        errorTarget: 'modal'
    });

    setModalLoading(false);

    if (wasSuccessful) {
        closeModal();
    }
}

function setModalLoading(isLoading) {
    isModalBusy = isLoading;
    els.modalSubmitBtn.disabled = isLoading;
    els.modalCancelBtn.disabled = isLoading;
    els.modalCloseBtn.disabled = isLoading;
    els.topicName.disabled = isLoading;
    els.topicDesc.disabled = isLoading;
    els.modalSubmitBtn.textContent = isLoading ? 'AI is analyzing...' : 'Generate';
}

function setChatLoading(isLoading, label = 'AI is analyzing...') {
    isChatBusy = isLoading;
    els.chatInput.disabled = isLoading;
    els.chatSubmitBtn.disabled = isLoading;
    els.newSessionBtn.disabled = isLoading;
    els.loadingSpinner.textContent = label;
    els.loadingSpinner.classList.toggle('hidden', !isLoading);
}

function autoResizeComposer() {
    els.chatInput.style.height = 'auto';
    els.chatInput.style.height = `${Math.min(els.chatInput.scrollHeight, 180)}px`;
}

function ensureAuthenticated(showExpiredMessage = true) {
    authToken = localStorage.getItem(AUTH_TOKEN_KEY) || authToken;

    if (authToken) {
        return true;
    }

    if (showExpiredMessage) {
        forceLogout('Your session expired. Please sign in again.');
    } else {
        clearSessionState();
        showWelcome();
        setAppView('auth');
    }

    return false;
}

function forceLogout(message = 'Your session expired. Please sign in again.') {
    resetBusyStates();
    clearSessionState();
    closeModal(true);
    resetChatView();
    clearChatError();
    setAppView('auth');
    showForm('login');
    setAuthError(message);
}

function resetBusyStates() {
    setChatLoading(false);
    setModalLoading(false);
}

async function apiRequest(path, options = {}, config = {}) {
    const { requiresAuth = true } = config;
    const headers = new Headers(options.headers || {});

    if (requiresAuth) {
        if (!ensureAuthenticated()) {
            throw new Error('Missing auth token.');
        }
        headers.set('Authorization', `Bearer ${authToken}`);
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error('Unable to reach the server. Please check that the backend is running.');
    }

    if (response.status === 401 && requiresAuth) {
        forceLogout('Your session expired. Please sign in again.');
        throw new Error('Your session expired. Please sign in again.');
    }

    let data = {};
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        data = await response.json().catch(() => ({}));
    } else {
        const text = await response.text().catch(() => '');
        if (text) {
            data = { message: text };
        }
    }

    return { response, data };
}

function extractAssistantMessage(data) {
    const candidates = [
        data.response,
        data.reply,
        data.answer,
        data.ai_response,
        data.aiResponse,
        data.content,
        data.message
    ];

    const match = candidates.find((value) => typeof value === 'string' && value.trim());
    return match ? match.trim() : '';
}

function extractErrorMessage(data, fallbackMessage) {
    const candidates = [
        data.detail,
        data.error,
        data.message,
        data.errors
    ];

    const match = candidates.find((value) => typeof value === 'string' && value.trim());
    return match ? match.trim() : fallbackMessage;
}

function normalizeChatId(chatId) {
    if (chatId === null || chatId === undefined || chatId === '') {
        return null;
    }

    return String(chatId);
}

function setAuthError(message) {
    els.errorBox.textContent = message;
    els.errorBox.classList.remove('hidden');
}

function clearAuthError() {
    els.errorBox.textContent = '';
    els.errorBox.classList.add('hidden');
}

function setChatError(message) {
    els.chatError.textContent = message;
    els.chatError.classList.remove('hidden');
}

function clearChatError() {
    els.chatError.textContent = '';
    els.chatError.classList.add('hidden');
}

function setModalError(message) {
    els.modalError.textContent = message;
    els.modalError.classList.remove('hidden');
}

function clearModalError() {
    els.modalError.textContent = '';
    els.modalError.classList.add('hidden');
}
