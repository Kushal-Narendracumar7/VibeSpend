 const firebaseConfig = {
            apiKey: "AIzaSyAsc5oI9fiLD3xfOS7fh7V_NvGJ-VCsans",
            authDomain: "vibespend-603c6.firebaseapp.com",
            projectId: "vibespend-603c6",
            storageBucket: "vibespend-603c6.firebasestorage.app",
            messagingSenderId: "175106283508",
            appId: "1:175106283508:web:799f6ebd8c1c06f0314ba1"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Global Variables
        let currentUser = null;
        let upiExpenses = [];
        let cashExpenses = [];
        let currentSection = 'dashboard';

        // Theme Management
        const savedTheme = localStorage.getItem('vs_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('vs_theme', newTheme);
            
            const icon = document.querySelector('#theme-toggle i');
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // Auth State Observer
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                document.getElementById('auth-container').classList.remove('active');
                document.getElementById('app-container').classList.add('active');
                document.getElementById('user-email').textContent = user.email;
                
                const icon = document.querySelector('#theme-toggle i');
                const theme = document.documentElement.getAttribute('data-theme');
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                
                await loadExpenses();
                renderAll();
                showNotification('Welcome back! 💫', 'success');
            } else {
                currentUser = null;
                document.getElementById('auth-container').classList.add('active');
                document.getElementById('app-container').classList.remove('active');
            }
        });

        // Auth Functions
        function showAuthTab(tab) {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(`${tab}-form`).classList.add('active');
        }

        async function signUp() {
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            
            if (!email || !password) {
                showNotification('Please fill in all fields!', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('Password must be at least 6 characters!', 'error');
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(email, password);
                showNotification('Account created successfully! 🎉', 'success');
            } catch (error) {
                console.error('Signup error:', error);
                showNotification(error.message, 'error');
            }
        }

        async function logIn() {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showNotification('Please fill in all fields!', 'error');
                return;
            }

            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error('Login error:', error);
                showNotification(error.message, 'error');
            }
        }

        async function logOut() {
            try {
                await auth.signOut();
                showNotification('Logged out successfully! 👋', 'success');
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Logout failed!', 'error');
            }
        }

        // Navigation
        function showSection(section) {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            
            event.target.closest('.nav-btn').classList.add('active');
            document.getElementById(`${section}-section`).classList.add('active');
            currentSection = section;
        }

        // Form Handling
        async function handleFormSubmit(event, type) {
            event.preventDefault();

            const submitBtn = document.getElementById(`${type}-submit`);
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner"></div> Adding...';

            const desc = document.getElementById(`${type}-desc`).value.trim();
            const amount = parseFloat(document.getElementById(`${type}-amount`).value);
            const category = document.getElementById(`${type}-category`).value;

            if (!desc || !amount || amount <= 0 || !category) {
                showNotification('Please fill in all fields correctly!', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
                return;
            }

            const expense = {
                id: Date.now() + Math.random(),
                description: desc,
                amount: Math.round(amount * 100) / 100,
                category: category,
                date: new Date().toISOString(),
                type: type
            };

            if (type === 'upi') {
                upiExpenses.push(expense);
            } else {
                cashExpenses.push(expense);
            }

            try {
                await saveExpenses();
                renderAll();
                document.getElementById(`${type}-form`).reset();
                
                const messages = [
                    'Expense added successfully! ✨',
                    'Another one tracked! 📝',
                    'Added to your expense log! 📊',
                    'Financial tracking on point! 💫'
                ];
                showNotification(messages[Math.floor(Math.random() * messages.length)], 'success');
            } catch (error) {
                console.error('Error saving expense:', error);
                showNotification('Failed to save expense!', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }

        async function deleteExpense(type, id) {
            if (!confirm('Delete this expense? This cannot be undone.')) return;

            if (type === 'upi') {
                upiExpenses = upiExpenses.filter(exp => exp.id !== id);
            } else {
                cashExpenses = cashExpenses.filter(exp => exp.id !== id);
            }

            try {
                await saveExpenses();
                renderAll();
                showNotification('Expense deleted! 🗑️', 'success');
            } catch (error) {
                console.error('Error deleting expense:', error);
                showNotification('Failed to delete expense!', 'error');
            }
        }

        // Firestore Functions
        async function loadExpenses() {
            if (!currentUser) return;
            
            try {
                const doc = await db.collection('users').doc(currentUser.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    upiExpenses = data.upiExpenses || [];
                    cashExpenses = data.cashExpenses || [];
                }
            } catch (error) {
                console.error('Error loading expenses:', error);
                showNotification('Failed to load expenses!', 'warning');
            }
        }

        async function saveExpenses() {
            if (!currentUser) return;
            
            try {
                await db.collection('users').doc(currentUser.uid).set({
                    upiExpenses: upiExpenses,
                    cashExpenses: cashExpenses,
                    updatedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error saving expenses:', error);
                throw error;
            }
        }

        // Rendering Functions
        function renderAll() {
            updateStats();
            renderExpenseList('upi', upiExpenses);
            renderExpenseList('cash', cashExpenses);
            renderDashboard();
        }

        function updateStats() {
            const total = [...upiExpenses, ...cashExpenses].reduce((sum, exp) => sum + exp.amount, 0);
            const upi = upiExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const cash = cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            const today = new Date().toISOString().slice(0, 10);
            const todayTotal = [...upiExpenses, ...cashExpenses]
                .filter(exp => exp.date.slice(0, 10) === today)
                .reduce((sum, exp) => sum + exp.amount, 0);

            document.getElementById('total-expenses').textContent = `₹${total.toFixed(2)}`;
            document.getElementById('upi-total').textContent = `₹${upi.toFixed(2)}`;
            document.getElementById('cash-total').textContent = `₹${cash.toFixed(2)}`;
            document.getElementById('today-expenses').textContent = `₹${todayTotal.toFixed(2)}`;
        }

        function renderExpenseList(type, expenses) {
            const container = document.getElementById(`${type}-list`);
            if (!container) return;

            if (expenses.length === 0) {
                const emptyMessages = {
                    upi: {
                        icon: 'fas fa-mobile-alt',
                        title: 'No digital payments yet',
                        subtitle: 'Add your first digital payment above to start tracking!'
                    },
                    cash: {
                        icon: 'fas fa-money-bill-wave',
                        title: 'No cash expenses yet',
                        subtitle: 'Add your first cash expense above to start tracking!'
                    }
                };

                const msg = emptyMessages[type];
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="${msg.icon}"></i>
                        <h3>${msg.title}</h3>
                        <p>${msg.subtitle}</p>
                    </div>
                `;
                return;
            }

            const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            container.innerHTML = sorted.map(exp => createExpenseHTML(exp, type)).join('');
        }

        function renderDashboard() {
            const container = document.getElementById('recent-expenses');
            if (!container) return;

            const all = [...upiExpenses, ...cashExpenses]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 15);

            if (all.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <h3>No expenses yet!</h3>
                        <p>Start tracking your expenses to see them here. Your financial journey begins now!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = all.map(exp => createExpenseHTML(exp, exp.type, false)).join('');
        }

        function createExpenseHTML(exp, type, showDelete = true) {
            return `
                <div class="expense-item">
                    <div class="expense-details">
                        <div class="expense-desc">${escapeHtml(exp.description)}</div>
                        <div class="expense-meta">
                            <span class="expense-tag">
                                ${getCategoryEmoji(exp.category)} ${getCategoryName(exp.category)}
                            </span>
                            <span class="expense-tag">
                                <i class="fas fa-clock"></i> ${formatDate(exp.date)}
                            </span>
                            <span class="expense-tag">
                                <i class="fas ${exp.type === 'upi' ? 'fa-mobile-alt' : 'fa-money-bill-wave'}"></i> ${exp.type.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="expense-actions">
                        <div class="expense-amount">₹${exp.amount.toFixed(2)}</div>
                        ${showDelete ? `
                        <button class="delete-btn" onclick="deleteExpense('${type}', ${exp.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Utility Functions
        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;

            return date.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        function getCategoryEmoji(category) {
            const emojis = {
                food: '🍽️',
                transport: '🚗',
                shopping: '🛍️',
                entertainment: '🎬',
                utilities: '⚡',
                healthcare: '🏥',
                education: '📚',
                other: '📋'
            };
            return emojis[category] || '📦';
        }

        function getCategoryName(category) {
            const names = {
                food: 'Food & Dining',
                transport: 'Transportation',
                shopping: 'Shopping',
                entertainment: 'Entertainment',
                utilities: 'Bills & Utilities',
                healthcare: 'Healthcare',
                education: 'Education',
                other: 'Other'
            };
            return names[category] || 'Unknown';
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notification-text');
            const icon = notification.querySelector('.notification-icon');

            text.textContent = message;
            notification.className = `notification show ${type}`;

            icon.className = `fas notification-icon ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-times-circle' :
                'fa-exclamation-circle'
            }`;

            setTimeout(() => {
                notification.classList.remove('show');
            }, 4000);
        }

        // Export Functions
        function exportData(format) {
            const all = [...upiExpenses, ...cashExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (all.length === 0) {
                showNotification('No data to export!', 'warning');
                return;
            }

            const today = new Date().toISOString().slice(0, 10);
            let blob, filename;

            if (format === 'json') {
                blob = new Blob([JSON.stringify({ expenses: all }, null, 2)], { 
                    type: 'application/json' 
                });
                filename = `vibespend-${today}.json`;
            } else if (format === 'csv') {
                const header = 'ID,Type,Description,Amount,Category,Date\n';
                const rows = all.map(e => 
                    `${e.id},${e.type},"${e.description}",${e.amount},${e.category},${e.date}`
                ).join('\n');
                blob = new Blob([header + rows], { type: 'text/csv' });
                filename = `vibespend-${today}.csv`;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            showNotification(`Exported ${format.toUpperCase()} successfully! 📥`, 'success');
        }

        async function clearAllData() {
            if (!confirm('This will permanently delete all your expenses. Are you sure?')) return;

            upiExpenses = [];
            cashExpenses = [];

            try {
                await saveExpenses();
                renderAll();
                showNotification('All data cleared! 🗑️', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                showNotification('Failed to clear data!', 'error');
            }
        }

        function quickAdd() {
            const next = currentSection === 'upi' ? 'cash' : 'upi';
            showSection(next);
            setTimeout(() => {
                document.getElementById(`${next}-desc`)?.focus();
            }, 300);
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        document.querySelector('[onclick="showSection(\'dashboard\')"]')?.click();
                        break;
                    case '2':
                        e.preventDefault();
                        document.querySelector('[onclick="showSection(\'upi\')"]')?.click();
                        break;
                    case '3':
                        e.preventDefault();
                        document.querySelector('[onclick="showSection(\'cash\')"]')?.click();
                        break;
                }
            }
        });
