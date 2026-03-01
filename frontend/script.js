const API_BASE = 'http://10.10.1.157:8000'; 
let authToken = null;
let currentChatId = null; 

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
        } else {
            alert(data.message || "Gabim në autorizim!");
        }
    } catch (err) {
        alert("Serveri nuk po përgjigjet te porti 8000.");
    }
});

async function handleGenerate() {
    const topic = document.getElementById('topic-name').value;
    const desc = document.getElementById('topic-desc').value;
    if (!topic) return alert("Ju lutem shkruani një temë!");

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
            if (data.chat_id) currentChatId = data.chat_id;
            chatWindow.innerHTML = `
                <div class="fade-in">
                    <h2 style="color: #2563eb;">${topic}</h2>
                    <p style="margin-top: 15px; color: #444;">${data.reply}</p>
                </div>
            `;
            closeModal();
        }
    } catch (err) {
        alert("Gabim gjatë lidhjes me AI.");
    }
}

async function loadHistory() {
    if (!currentChatId) return;
    try {
        const response = await fetch(`${API_BASE}/api/chat/history?chat_id=${currentChatId}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await response.json();
        if (response.ok) {
            console.log(data.messages);
        }
    } catch (err) {
        console.error(err);
    }
}

function openModal(type) {
    document.getElementById('modal-title').innerText = type + " Request";
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}