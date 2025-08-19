const firebaseConfig = {
            apiKey: "AIzaSyAsc5oI 9fiLD3xfOS7fh7V_NvGJ-VCsans",
            authDomain: "vibespend-603c6.firebaseapp.com",
            projectId: "vibespend-603c6",
            storageBucket: "vibespend-603c6.firebasestorage.app",
            messagingSenderId: "175106283508",
            appId: "1:175106283508:web:799f6ebd8c1c06f0314ba1"
        };
		
		

        // Initialize Firebase
        if (!firebase.apps?.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const auth = firebase.auth();
        const db = firebase.firestore();
        let currentUser = null;
        let theme = localStorage.getItem('vs_theme') || 'dark';
        // Apply saved theme ASAP (affects auth screen too)
        (function ensureTheme() { try { document.documentElement.setAttribute('data-theme', theme); } catch (e) {} })();

        // Auth State Management
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                showApp();
                if (window.app) {
                    window.app.init();
                    try { app = window.app; } catch (_) {}
                } else {
                    setTimeout(() => {
                        window.app = new VibeSpendTracker();
                        try { app = window.app; } catch (_) {}
                    }, 100);
                }
            } else {
                currentUser = null;
                showAuth();
            }
        });

        // Show/Hide Auth and App
        function showAuth() {
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }

        function showApp() {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('user-email').textContent = currentUser?.email || '';
            applyTheme(theme);
            setupThemeToggle();
        }

        // Auth Tab Switching
        function showAuthTab(tab) {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            document.querySelector(`[onclick="showAuthTab('${tab}')"]`).classList.add('active');
            document.getElementById(`${tab}-form`).classList.add('active');
        }

        function setupThemeToggle() {
            const btn = document.getElementById('theme-toggle');
            if (!btn) return;
            updateThemeIcon(btn);
            btn.onclick = () => {
                theme = theme === 'light' ? 'dark' : 'light';
                localStorage.setItem('vs_theme', theme);
                applyTheme(theme);
                updateThemeIcon(btn);
            };
        }

        function applyTheme(value) {
            const html = document.documentElement;
            html.setAttribute('data-theme', value);
        }

        function updateThemeIcon(btn) {
            btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }

        // Parallax effect based on cursor and scroll
        (function setupParallax() {
            let lastX = 0, lastY = 0;
            let rafId = null;
            const layers = Array.from(document.querySelectorAll('.parallax'));
            if (!layers.length) return;
            function animate() {
                layers.forEach(layer => {
                    const speed = parseFloat(layer.dataset.speed || '0.05');
                    const tx = (lastX - window.innerWidth / 2) * speed;
                    const ty = (lastY - window.innerHeight / 2) * speed;
                    layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                });
                rafId = null;
            }
            function onMove(e) {
                lastX = e.clientX ?? lastX;
                lastY = e.clientY ?? lastY;
                if (!rafId) rafId = requestAnimationFrame(animate);
            }
            function onScroll() {
                const y = window.scrollY || 0;
                layers.forEach(layer => {
                    const speed = parseFloat(layer.dataset.speed || '0.05');
                    layer.style.transform = `translate3d(0, ${y * speed * 0.3}px, 0)`;
                });
            }
            window.addEventListener('mousemove', onMove, { passive: true });
            window.addEventListener('scroll', onScroll, { passive: true });
        })();

        // Auth Functions
        async function signUp() {
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;
            
            if (!email || !password) {
                showNotification("Please fill in all fields!", "error");
                return;
            }

            if (password.length < 6) {
                showNotification("Password must be at least 6 characters!", "error");
                return;
            }

            showAuthLoading(true);
            
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                showNotification("Account created successfully! Welcome to VibeSpend!", "success");
            } catch (error) {
                console.error("Signup error:", error);
                showNotification(`Signup failed: ${error.message}`, "error");
            } finally {
                showAuthLoading(false);
            }
        }

        async function logIn() {
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;
            
            if (!email || !password) {
                showNotification("Please fill in all fields!", "error");
                return;
            }

            showAuthLoading(true);
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                showNotification("Welcome back! Ready to track your expenses?", "success");
            } catch (error) {
                console.error("Login error:", error);
                showNotification(`Login failed: ${error.message}`, "error");
            } finally {
                showAuthLoading(false);
            }
        }

        async function logOut() {
            try {
                await auth.signOut();
                showNotification("Logged out successfully!", "success");
            } catch (error) {
                console.error("Logout error:", error);
                showNotification("Logout failed! Please try again.", "error");
            }
        }

        function showAuthLoading(show) {
            const loading = document.getElementById('auth-loading');
            const forms = document.querySelectorAll('.auth-form');
            
            if (show) {
                loading.style.display = 'block';
                forms.forEach(form => form.style.display = 'none');
            } else {
                loading.style.display = 'none';
                forms.forEach(form => form.style.display = 'block');
            }
        }

        // Main App Class
        class VibeSpendTracker {
            constructor() {
                this.upiExpenses = [];
                this.cashExpenses = [];
                this.currentSection = "dashboard";
                this.successMessages = [
                    "Expense added successfully! ✨",
                    "Another one tracked! 📝",
                    "Your spending is now recorded! 🎯",
                    "Added to your expense log! 📊",
                    "Financial tracking on point! 💫"
                ];
                this.init();
            }

            async init() {
                if (!currentUser) return;
                
                this.setupEventListeners();
                this.setupNavigation();
                await this.fetchFromFirestore();
                this.render();
                this.updateStats();
                this.showWelcomeMessage();
            }

            setupEventListeners() {
                document.getElementById("upi-form").addEventListener("submit", (e) => {
                    this.handleFormSubmit(e, "upi");
                });
                
                document.getElementById("cash-form").addEventListener("submit", (e) => {
                    this.handleFormSubmit(e, "cash");
                });

                document.addEventListener("keydown", (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        switch (e.key) {
                            case "1":
                                e.preventDefault();
                                this.showSection("dashboard");
                                break;
                            case "2":
                                e.preventDefault();
                                this.showSection("upi");
                                break;
                            case "3":
                                e.preventDefault();
                                this.showSection("cash");
                                break;
                        }
                    }
                });
            }

            setupNavigation() {
                const navBtns = document.querySelectorAll(".nav-btn");
                
                navBtns.forEach((btn) => {
                    btn.addEventListener("click", () => {
                        const section = btn.dataset.section;
                        this.showSection(section);
                    });
                });
            }

            showSection(section) {
                document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
                document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
                
                const navBtn = document.querySelector(`[data-section="${section}"]`);
                const sectionEl = document.getElementById(`${section}-section`);
                
                if (navBtn) navBtn.classList.add("active");
                if (sectionEl) sectionEl.classList.add("active");
                
                this.currentSection = section;
            }

            async handleFormSubmit(e, type) {
                e.preventDefault();

                const submitBtn = document.getElementById(`${type}-submit`);
                const originalText = submitBtn.innerHTML;

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; margin-right: 8px; display: inline-block;"></div> Adding...';

                const desc = document.getElementById(`${type}-desc`).value.trim();
                const amount = parseFloat(document.getElementById(`${type}-amount`).value);
                const category = document.getElementById(`${type}-category`).value;

                if (!desc || !amount || amount <= 0 || !category) {
                    showNotification("Please fill in all fields!", "error");
                    this.resetSubmitButton(submitBtn, originalText);
                    return;
                }

                if (amount > 100000) {
                    showNotification("That's a lot of money! Are you sure?", "warning");
                    this.resetSubmitButton(submitBtn, originalText);
                    return;
                }

                if (desc.length < 3) {
                    showNotification("Please provide a more detailed description!", "error");
                    this.resetSubmitButton(submitBtn, originalText);
                    return;
                }

                const expense = {
                    id: Date.now() + Math.random(),
                    description: desc,
                    amount: Math.round(amount * 100) / 100,
                    category: category,
                    date: new Date().toISOString(),
                    type: type,
                    vibeScore: this.calculateVibeScore(amount, category)
                };

                if (type === "upi") {
                    this.upiExpenses.push(expense);
                } else {
                    this.cashExpenses.push(expense);
                }

                try {
                    await this.saveData();
                    this.render();
                    this.updateStats();

                    document.getElementById(`${type}-form`).reset();

                    const randomMessage = this.successMessages[Math.floor(Math.random() * this.successMessages.length)];
                    showNotification(randomMessage, "success");

                } catch (error) {
                    console.error("Error saving expense:", error);
                    showNotification("Failed to save expense! Please try again.", "error");
                }

                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }, 800);
            }

            resetSubmitButton(btn, originalText) {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }, 500);
            }

            calculateVibeScore(amount, category) {
                let score = 0;
                if (category === "entertainment") score += 3;
                if (category === "shopping") score += 2;
                if (category === "food") score += 1;
                if (amount > 1000) score += 2;
                if (amount > 5000) score += 3;
                return Math.min(score, 5);
            }

            async deleteExpense(type, id) {
                const confirmation = confirm("Are you sure you want to delete this expense? This action cannot be undone.");
                if (!confirmation) return;

                if (type === "upi") {
                    this.upiExpenses = this.upiExpenses.filter(exp => exp.id !== id);
                } else {
                    this.cashExpenses = this.cashExpenses.filter(exp => exp.id !== id);
                }

                try {
                    await this.saveData();
                    this.render();
                    this.updateStats();
                    showNotification("Expense deleted successfully!", "success");
                } catch (error) {
                    console.error("Error deleting expense:", error);
                    showNotification("Failed to delete expense! Please try again.", "error");
                }
            }

            async fetchFromFirestore() {
                if (!currentUser) return;
                
                try {
                    const doc = await db.collection("users").doc(currentUser.uid).get();
                    if (doc.exists) {
                        const data = doc.data();
                        this.upiExpenses = data.upiExpenses || [];
                        this.cashExpenses = data.cashExpenses || [];
                    }
                } catch (error) {
                    console.error("Error loading data:", error);
                    showNotification("Failed to load your expenses!", "warning");
                }
            }

            async saveData() {
                if (!currentUser) return;
                
                try {
                    await db.collection("users").doc(currentUser.uid).set({
                        upiExpenses: this.upiExpenses,
                        cashExpenses: this.cashExpenses,
                        updatedAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.error("Error saving to Firebase:", error);
                    throw error;
                }
            }

            render() {
                this.renderExpenseList("upi", this.upiExpenses);
                this.renderExpenseList("cash", this.cashExpenses);
                this.renderDashboard();
            }

            renderExpenseList(type, expenses) {
                const container = document.getElementById(`${type}-list`);
                if (!container) return;

                if (expenses.length === 0) {
                    const emptyMessages = {
                        upi: {
                            icon: "fas fa-mobile-alt",
                            title: "No digital payments yet",
                            subtitle: "Add your first digital payment above to start tracking your UPI expenses!"
                        },
                        cash: {
                            icon: "fas fa-money-bill-wave",
                            title: "No cash expenses yet", 
                            subtitle: "Add your first cash expense above to start tracking your offline spending!"
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

                const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

                container.innerHTML = sortedExpenses.map(expense => `
                    <div class="expense-item">
                        <div class="expense-details">
                            <div class="expense-desc">${this.escapeHtml(expense.description)} ${this.getVibeEmoji(expense.vibeScore)}</div>
                            <div class="expense-meta">
                                <span class="expense-tag">
                                    ${this.getCategoryEmoji(expense.category)} ${this.getCategoryName(expense.category)}
                                </span>
                                <span class="expense-tag">
                                    <i class="fas fa-clock"></i> ${this.formatDate(expense.date)}
                                </span>
                                <span class="expense-tag">
                                    <i class="fas fa-fire"></i> Vibe: ${expense.vibeScore}/5
                                </span>
                            </div>
                        </div>
                        <div class="expense-actions">
                            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                            <button class="delete-btn" onclick="app.deleteExpense('${type}', ${expense.id})" title="Delete expense">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join("");
            }

            renderDashboard() {
                const container = document.getElementById("recent-expenses");
                if (!container) return;

                const allExpenses = [...this.upiExpenses, ...this.cashExpenses]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 15);

                if (allExpenses.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <h3>No expenses yet!</h3>
                            <p>Start tracking your expenses to see them here. Your financial journey begins now!</p>
                        </div>
                    `;
                                        return;
                }

                container.innerHTML = allExpenses.map(exp => `
                    <div class="expense-item">
                        <div class="expense-details">
                            <div class="expense-desc">${this.escapeHtml(exp.description)} ${this.getVibeEmoji(exp.vibeScore)}</div>
                            <div class="expense-meta">
                                <span class="expense-tag">
                                    ${this.getCategoryEmoji(exp.category)} ${this.getCategoryName(exp.category)}
                                </span>
                                <span class="expense-tag">
                                    <i class="fas fa-clock"></i> ${this.formatDate(exp.date)}
                                </span>
                                <span class="expense-tag">
                                    <i class="fas fa-fire"></i> Vibe: ${exp.vibeScore}/5
                                </span>
                            </div>
                        </div>
                        <div class="expense-actions">
                            <div class="expense-amount">₹${exp.amount.toFixed(2)}</div>
                        </div>
                    </div>
                `).join('');
            }

            updateStats() {
                const total = [...this.upiExpenses, ...this.cashExpenses].reduce((sum, exp) => sum + exp.amount, 0);
                const upi = this.upiExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const cash = this.cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                const today = new Date().toISOString().slice(0, 10);
                const todayTotal = [...this.upiExpenses, ...this.cashExpenses]
                    .filter(exp => exp.date.slice(0, 10) === today)
                    .reduce((sum, exp) => sum + exp.amount, 0);

                document.getElementById("total-expenses").textContent = `₹${total.toFixed(2)}`;
                document.getElementById("upi-total").textContent = `₹${upi.toFixed(2)}`;
                document.getElementById("cash-total").textContent = `₹${cash.toFixed(2)}`;
                document.getElementById("today-expenses").textContent = `₹${todayTotal.toFixed(2)}`;
            }

            showWelcomeMessage() {
                const welcomeMessages = [
                    "Welcome back, spender! 💸",
                    "Let's vibe and spend smart! ✨",
                    "Ready to track some money? 💰",
                    "Your financial journey continues! 🚀",
                    "Stay stylish and budget-wise! 👛"
                ];
                const msg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
                showNotification(msg, "success");
            }

            // Utility methods
            formatDate(dateString) {
                const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                return new Date(dateString).toLocaleString(undefined, options);
            }

            getCategoryEmoji(category) {
                const emojis = {
                    food: "🍽️",
                    transport: "🚗",
                    shopping: "🛍️",
                    entertainment: "🎬",
                    utilities: "⚡",
                    healthcare: "🏥",
                    education: "📚",
                    other: "📋"
                };
                return emojis[category] || "📦";
            }

            getCategoryName(category) {
                const names = {
                    food: "Food & Dining",
                    transport: "Transportation",
                    shopping: "Shopping",
                    entertainment: "Entertainment",
                    utilities: "Bills & Utilities",
                    healthcare: "Healthcare",
                    education: "Education",
                    other: "Other"
                };
                return names[category] || "Unknown";
            }

            getVibeEmoji(score) {
                if (score >= 5) return "🔥";
                if (score >= 4) return "😎";
                if (score >= 3) return "😊";
                if (score >= 2) return "🙂";
                return "💤";
            }

            escapeHtml(str) {
                return str.replace(/[&<>'"]/g, tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag]));
            }
        }

        // Global Notification Function
        function showNotification(message, type = "success") {
            const notification = document.getElementById("notification");
            const text = document.getElementById("notification-text");
            const icon = notification.querySelector(".notification-icon");

            text.textContent = message;
            notification.className = `notification show ${type}`;

            icon.className = `fas notification-icon ${
                type === "success" ? "fa-check-circle" :
                type === "error" ? "fa-times-circle" :
                "fa-exclamation-circle"
            }`;

            setTimeout(() => {
                notification.classList.remove("show");
            }, 4000);
        }

        // Data Export
        function exportData(format) {
            try {
                if (!window.app) {
                    showNotification("App is not ready yet.", "warning");
                    return;
                }
                const allExpenses = [...window.app.upiExpenses, ...window.app.cashExpenses]
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                if (allExpenses.length === 0) {
                    showNotification("No data to export.", "warning");
                    return;
                }
                let blob; let filename;
                const today = new Date().toISOString().slice(0,10);
                if (format === 'json') {
                    blob = new Blob([JSON.stringify({ expenses: allExpenses }, null, 2)], { type: 'application/json;charset=utf-8' });
                    filename = `vibespend-${today}.json`;
                } else if (format === 'csv') {
                    const header = ['id','type','description','amount','category','date','vibeScore'];
                    const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                    const rows = allExpenses.map(e => [e.id, e.type, e.description, e.amount, e.category, e.date, e.vibeScore].map(escapeCsv).join(','));
                    const csv = [header.join(','), ...rows].join('\n');
                    blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    filename = `vibespend-${today}.csv`;
                } else {
                    showNotification("Unsupported export format.", "error");
                    return;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showNotification(`Exported ${format.toUpperCase()} successfully.`, 'success');
            } catch (err) {
                console.error('Export error:', err);
                showNotification('Failed to export data.', 'error');
            }
        }

        // Clear All Data
        async function clearAllData() {
            if (!window.app) return;
            const ok = confirm('This will permanently clear all your expenses. Continue?');
            if (!ok) return;
            try {
                window.app.upiExpenses = [];
                window.app.cashExpenses = [];
                await window.app.saveData();
                window.app.render();
                window.app.updateStats();
                showNotification('All data cleared.', 'success');
            } catch (err) {
                console.error('Clear error:', err);
                showNotification('Failed to clear data.', 'error');
            }
        }

        // Quick Add (FAB)
        function quickAdd() {
            if (!window.app) return;
            const next = window.app.currentSection === "upi" ? "cash" : "upi";
            window.app.showSection(next);
            setTimeout(() => {
                try { document.getElementById(`${next}-desc`)?.focus(); } catch (_) {}
            }, 0);
        }

        // Expose to window
        let app = null;