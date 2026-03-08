const API_BASE = 'http://127.0.0.1:8000'; 
let authToken = null;
let currentChatId = null; 

// US1: Menaxhimi i formave
function showForm(type) {
    const welcome = document.getElementById('welcome-screen');
    const form = document.getElementById('auth-form');
    welcome.classList.add('hidden');
    form.classList.remove('hidden');
    form.dataset.mode = type; 
    document.getElementById('register-fields').classList.toggle('hidden', type !== 'register');
    document.getElementById('form-title').innerText = type === 'register' ? "Create Account" : "Login";
}

function showWelcome() {
    document.getElementById('auth-form').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
}

// US1: Autentikimi dhe marrja e Token-it
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = e.target.dataset.mode;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/${mode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token; 
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            fetchConversations();
        } else {
            alert(data.message || "Gabim ne autorizim!");
        }
    } catch (err) {
        alert("Serveri nuk po pergjigjet. Sigurohu qe backend-i eshte ndezur.");
    }
});

// US2: Ngarkimi i bisedave ne Sidebar
async function fetchConversations() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/api/conversations`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await response.json();
        const list = document.getElementById('conversation-list');
        
        list.innerHTML = `<div class="nav-item active" onclick="startNewChat()">+ New Study Session</div>`;
        
        data.conversations.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.innerText = chat.title || `Session ${chat.id}`;
            item.onclick = () => loadChatHistory(chat.id);
            list.appendChild(item);
        });
    } catch (err) {
        console.error("Gabim ne histori:", err);
    }
}

// US3: Dergimi i kërkesës te AI (Summarize/Quiz)
async function handleGenerate() {
    // Kontrolli i sigurise
    if (!authToken) {
        alert("Session expired. Please login again.");
        location.reload();
        return;
    }
    
    const topic = document.getElementById('topic-name').value;
    const desc = document.getElementById('topic-desc').value;
    if (!topic) return alert("Ju lutem shkruani nje teme!");

    const chatWindow = document.getElementById('chat-window');

    try {
        const response = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken 
            },
            body: JSON.stringify({ 
                message: `Tema: ${topic}. Detaje: ${desc}`,
                chat_id: currentChatId 
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.chat_id) {
                currentChatId = data.chat_id;
                fetchConversations();
            }
            // Formatimi me marked.js
            chatWindow.innerHTML = `
                <div class="fade-in">
                    <h2 style="color: #2563eb; margin-bottom: 10px;">${topic}</h2>
                    <div class="ai-reply">${marked.parse(data.reply)}</div>
                </div>
            `;
            closeModal();
        }
    } catch (err) {
        alert("Gabim gjate lidhjes me AI.");
    }
}

// US2: Hapja e nje bisede ekzistuese
async function loadChatHistory(id) {
    if (!authToken) {
        location.reload();
        return;
    }
    currentChatId = id;
    try {
        const response = await fetch(`${API_BASE}/api/conversations/${id}/messages`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await response.json();
        const chatWindow = document.getElementById('chat-window');
        chatWindow.innerHTML = "";
        
        data.messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = msg.role === 'user' ? 'user-msg' : 'ai-msg';
            div.innerHTML = marked.parse(msg.content);
            chatWindow.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

function startNewChat() {
    currentChatId = null;
    document.getElementById('chat-window').innerHTML = `<div class="empty-state"><h3>New Session Ready</h3></div>`;
}

function openModal(type) {
    document.getElementById('modal-title').innerText = type + " Request";
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}
