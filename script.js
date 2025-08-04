 // Firebase Configuration
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

        // Auth State Management
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                showApp();
                if (window.app) {
                    window.app.init();
                } else {
                    setTimeout(() => {
                        window.app = new VibeSpendTracker();
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
        }

        // Auth Tab Switching
        function showAuthTab(tab) {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            document.querySelector(`[onclick="showAuthTab('${tab}')"]`).classList.add('active');
            document.getElementById(`${tab}-form`).classList.add('active');
        }

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
                    "Expense added successfully! 💸",
                    "Another one tracked! 📝",
                    "Your spending is now recorded! ✨",
                    "Added to your expense log! 📊",
                    "Financial tracking on point! 🎯"
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
                
                navBtns.forEach((btn, index) => {
                    btn.addEventListener("click", () => {
                        const section = btn.dataset.section;
                        this.showSection(section);
                        this.updateNavIndicator(index);
                    });
                });
                
                this.updateNavIndicator(0);
            }

            updateNavIndicator(index) {
                const indicator = document.querySelector(".nav-indicator");
                if (indicator) {
                    const btnWidth = document.querySelector(".nav-btn").offsetWidth;
                    const gap = 8;
                    indicator.style.left = `${(btnWidth + gap) * index + 8}px`;
                    indicator.style.width = `${btnWidth}px`;
                }
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
                submitBtn.innerHTML = '<div class="loading"></div> Adding...';

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
                            title: "No UPI payments yet",
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
                                <span>
                                    ${this.getCategoryEmoji(expense.category)} ${this.getCategoryName(expense.category)}
                                </span>
                                <span><i class="fas fa-clock"></i> ${this.formatDate(expense.date)}</span>
                                <span><i class="fas fa-fire"></i> Vibe: ${expense.vibeScore}/5</span>
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
                            <i class="fas fa-ghost"></i>
                            <h3>No expenses yet!</h3>
                            <p>Start tracking your expenses to see them here. Add your first expense using the navigation above!</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = allExpenses.map(expense => `
                    <div class="expense-item">
                        <div class="expense-details">
                            <div class="expense-desc">${this.escapeHtml(expense.description)} ${this.getVibeEmoji(expense.vibeScore)}</div>
                            <div class="expense-meta">
                                <span>
                                    ${this.getCategoryEmoji(expense.category)} ${this.getCategoryName(expense.category)}
                                </span>
                                <span><i class="fas fa-clock"></i> ${this.formatDate(expense.date)}</span>
                                <span><i class="fas fa-${expense.type === "upi" ? "mobile-alt" : "money-bill-wave"}"></i> ${expense.type.toUpperCase()}</span>
                                <span><i class="fas fa-fire"></i> ${expense.vibeScore}/5</span>
                            </div>
                        </div>
                        <div class="expense-actions">
                            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                        </div>
                    </div>
                `).join("");
            }

            updateStats() {
                const upiTotal = this.upiExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const cashTotal = this.cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalExpenses = upiTotal + cashTotal;

                const today = new Date().toDateString();
                const todayExpenses = [...this.upiExpenses, ...this.cashExpenses]
                    .filter(exp => new Date(exp.date).toDateString() === today)
                    .reduce((sum, exp) => sum + exp.amount, 0);

                this.animateValue("total-expenses", totalExpenses);
                this.animateValue("upi-total", upiTotal);
                this.animateValue("cash-total", cashTotal);  
                this.animateValue("today-expenses", todayExpenses);
            }

            animateValue(elementId, targetValue) {
                const element = document.getElementById(elementId);
                if (!element) return;

                const startValue = 0;
                const duration = 1000;
                const startTime = performance.now();

                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const currentValue = startValue + (targetValue - startValue) * progress;

                    element.textContent = `₹${currentValue.toFixed(2)}`;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };

                requestAnimationFrame(animate);
            }

            getCategoryName(category) {
                const categories = {
                    food: "Food & Dining",
                    transport: "Transportation", 
                    shopping: "Shopping",
                    entertainment: "Entertainment",
                    utilities: "Bills & Utilities",
                    healthcare: "Healthcare",
                    education: "Education",                   
                    other: "Other"
                };
                return categories[category] || category;
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
                return emojis[category] || "💸";
            }

            getVibeEmoji(score) {
                const vibes = ["😐", "🙂", "😎", "🔥", "💥", "🚀"];
                return vibes[score] || "💸";
            }

            formatDate(dateStr) {
                const date = new Date(dateStr);
                return date.toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            }

            escapeHtml(text) {
                const map = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };
                return text.replace(/[&<>"']/g, m => map[m]);
            }

            showWelcomeMessage() {
                const hours = new Date().getHours();
                let message = "Welcome!";
                if (hours < 12) message = "Good morning!";
                else if (hours < 18) message = "Good afternoon!";
                else message = "Good evening!";
                showNotification(`${message} Let's track some expenses!`, "success");
            }
        }

        // Global Helper
        function showNotification(message, type = "success") {
            const notification = document.getElementById("notification");
            const text = document.getElementById("notification-text");

            notification.className = `notification show ${type}`;
            text.textContent = message;

            setTimeout(() => {
                notification.classList.remove("show");
            }, 3500);
        }

        function toggleVibes() {
            document.body.classList.toggle("dark-theme");
            showNotification("Theme toggled! ✨", "success");
        }

        function quickAdd() {
            const current = app?.currentSection || "dashboard";
            const next = current === "dashboard" ? "upi" : current === "upi" ? "cash" : "dashboard";
            app?.showSection(next);
            showNotification("Switched section for quick entry!", "success");
        }

        function exportData(format) {
            const data = {
                upiExpenses: app?.upiExpenses || [],
                cashExpenses: app?.cashExpenses || []
            };

            const blob = new Blob([
                format === "csv" ? toCSV(data) : JSON.stringify(data, null, 2)
            ], {
                type: format === "csv" ? "text/csv" : "application/json"
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vibespend_data.${format}`;
            a.click();
            URL.revokeObjectURL(url);

            showNotification(`Data exported as ${format.toUpperCase()}! 📦`, "success");
        }

        function toCSV({ upiExpenses, cashExpenses }) {
            const all = [...upiExpenses, ...cashExpenses];
            const headers = ["type", "description", "amount", "category", "date", "vibeScore"];
            const rows = all.map(e => [
                e.type, `"${e.description.replace(/"/g, '""')}"`, e.amount, e.category, e.date, e.vibeScore
            ]);
            return [headers, ...rows].map(row => row.join(",")).join("\n");
        }

        async function clearAllData() {
            const confirmClear = confirm("This will delete all your expenses. Are you sure?");
            if (!confirmClear) return;

            try {
                await db.collection("users").doc(currentUser.uid).set({
                    upiExpenses: [],
                    cashExpenses: [],
                    updatedAt: new Date().toISOString()
                });

                app.upiExpenses = [];
                app.cashExpenses = [];
                app.render();
                app.updateStats();
                showNotification("All data cleared!", "success");
            } catch (error) {
                console.error("Failed to clear data:", error);
                showNotification("Failed to clear data!", "error");
            }
        }
