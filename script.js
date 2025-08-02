// Firebase SDK (Include in HTML head before this script)
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"></script>

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAsc5oI9fiLD3xfOS7fh7V_NvGJ-VCsans",
  authDomain: "vibespend-603c6.firebaseapp.com",
  projectId: "vibespend-603c6",
  storageBucket: "vibespend-603c6.firebasestorage.app",
  messagingSenderId: "175106283508",
  appId: "1:175106283508:web:799f6ebd8c1c06f0314ba1"
};

// Initialize Firebase only once
if (!firebase.apps?.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const USER_ID = "kushal123";

class VibeSpendTracker {
  constructor() {
    this.upiExpenses = [];
    this.cashExpenses = [];
    this.currentSection = "dashboard";
    this.vibeMessages = [
      "That's some expensive taste! 💅",
      "Money well spent bestie! ✨",
      "Receipt added to the collection! 📝",
      "Your bank account felt that one! 💸",
      "Another one bites the dust! 🎵",
      "That's what we call financial transparency! 👑",
      "Keeping track like a boss! 🔥",
      "Added to your spending saga! 📚"
    ];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupNavigation();
    await this.fetchFromFirestore();
    this.render();
    this.updateStats();
    this.showWelcomeMessage();
  }

  setupEventListeners() {
    // Forms
    document.getElementById("upi-form").addEventListener("submit", (e) => {
      this.handleFormSubmit(e, "upi");
    });
    
    document.getElementById("cash-form").addEventListener("submit", (e) => {
      this.handleFormSubmit(e, "cash");
    });

    // Prevent double submission
    document.querySelectorAll(".submit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (btn.disabled) {
          e.preventDefault();
        }
      });
    });

    // Keyboard shortcuts
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
    const indicator = document.querySelector(".nav-indicator");
    
    navBtns.forEach((btn, index) => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.section;
        this.showSection(section);
        this.updateNavIndicator(index);
      });
    });
    
    // Set initial indicator position
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
    // Remove active from all buttons and sections
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    
    // Add active to current button and section
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

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div> Adding the tea...';

    const desc = document.getElementById(`${type}-desc`).value.trim();
    const amount = parseFloat(document.getElementById(`${type}-amount`).value);
    const category = document.getElementById(`${type}-category`).value;

    // Validation with Gen Z vibes
    if (!desc || !amount || amount <= 0 || !category) {
      this.showNotification("Bestie, fill all the fields! No skipping! 💅", "error");
      this.resetSubmitButton(submitBtn, originalText);
      return;
    }

    if (amount > 100000) {
      this.showNotification("Whoa! That's a lot of money! Are you sure? 🤯", "warning");
      this.resetSubmitButton(submitBtn, originalText);
      return;
    }

    if (desc.length < 3) {
      this.showNotification("Give us more deets bestie! At least 3 characters! 📝", "error");
      this.resetSubmitButton(submitBtn, originalText);
      return;
    }

    // Create expense object
    const expense = {
      id: Date.now() + Math.random(),
      description: desc,
      amount: Math.round(amount * 100) / 100,
      category: category,
      date: new Date().toISOString(),
      type: type,
      vibeScore: this.calculateVibeScore(amount, category)
    };

    // Add to appropriate array
    if (type === "upi") {
      this.upiExpenses.push(expense);
    } else {
      this.cashExpenses.push(expense);
    }

    // Save to Firebase and update UI
    try {
      await this.saveData();
      this.render();
      this.updateStats();

      // Reset form
      document.getElementById(`${type}-form`).reset();

      // Show random success message
      const randomMessage = this.vibeMessages[Math.floor(Math.random() * this.vibeMessages.length)];
      this.showNotification(randomMessage, "success");

    } catch (error) {
      console.error("Error saving expense:", error);
      this.showNotification("Oops! Couldn't save your data bestie! 😰", "error");
    }

    // Re-enable button with delay for UX
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
    const confirmation = confirm("Are you sure you want to delete this receipt? It'll be gone forever bestie! 💔");
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
      this.showNotification("Receipt deleted! It never happened! 🫥", "success");
    } catch (error) {
      console.error("Error deleting expense:", error);
      this.showNotification("Couldn't delete that receipt bestie! Try again! 😰", "error");
    }
  }

  async fetchFromFirestore() {
    try {
      const doc = await db.collection("users").doc(USER_ID).get();
      if (doc.exists) {
        const data = doc.data();
        this.upiExpenses = data.upiExpenses || [];
        this.cashExpenses = data.cashExpenses || [];
      }
    } catch (error) {
      console.error("Error loading data:", error);
      this.showNotification("Couldn't load your receipts bestie! Using local storage! 📶", "warning");
      // Fallback to local storage if Firebase fails
      this.loadFromLocalStorage();
    }
  }

  loadFromLocalStorage() {
    try {
      this.upiExpenses = JSON.parse(localStorage.getItem("vibe_upi_expenses") || "[]");
      this.cashExpenses = JSON.parse(localStorage.getItem("vibe_cash_expenses") || "[]");
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      this.upiExpenses = [];
      this.cashExpenses = [];
    }
  }

  async saveData() {
    try {
      await db.collection("users").doc(USER_ID).set({
        upiExpenses: this.upiExpenses,
        cashExpenses: this.cashExpenses,
        updatedAt: new Date().toISOString()
      });
      
      // Also save to localStorage as backup
      localStorage.setItem("vibe_upi_expenses", JSON.stringify(this.upiExpenses));
      localStorage.setItem("vibe_cash_expenses", JSON.stringify(this.cashExpenses));
      
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      // Fallback to localStorage
      localStorage.setItem("vibe_upi_expenses", JSON.stringify(this.upiExpenses));
      localStorage.setItem("vibe_cash_expenses", JSON.stringify(this.cashExpenses));
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
          title: "No UPI spends yet",
          subtitle: "Time to add some digital receipts! Your phone is waiting 📱"
        },
        cash: {
          icon: "fas fa-money-bill-wave",
          title: "No cash spends yet", 
          subtitle: "Old school money tracking! Add your cash receipts here 💵"
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
            <span class="category-pill">
              ${this.getCategoryEmoji(expense.category)} ${this.getCategoryName(expense.category)}
            </span>
            <span><i class="fas fa-clock"></i> ${this.formatDate(expense.date)}</span>
            <span><i class="fas fa-fire"></i> Vibe: ${expense.vibeScore}/5</span>
          </div>
        </div>
        <div class="expense-actions">
          <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
          <button class="delete-btn" onclick="app.deleteExpense('${type}', ${expense.id})" title="Delete this receipt">
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
          <h3>It's giving empty vibes</h3>
          <p>No expenses yet bestie! Start tracking your bag to see the receipts here 💅</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allExpenses.map(expense => `
      <div class="expense-item">
        <div class="expense-details">
          <div class="expense-desc">${this.escapeHtml(expense.description)} ${this.getVibeEmoji(expense.vibeScore)}</div>
          <div class="expense-meta">
            <span class="category-pill">
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

    // Animate the numbers
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

  // Utility functions
  getCategoryName(category) {
    const categories = {
      food: "Food Vibes",
      transport: "Getting Around", 
      shopping: "Retail Therapy",
      entertainment: "Fun Times",
      utilities: "Adult Stuff",
      healthcare: "Self Care",
      education: "Brain Food",
      other: "Random Stuff"
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
    return emojis[category] || "📋";
  }

  getVibeEmoji(score) {
    const emojis = ["😴", "😊", "😍", "🔥", "💎"];
    return emojis[Math.min(score, 4)] || "😴";
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;

    if (diffInHours < 1) {
      return "Just now bestie! ⏰";
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    const textElement = document.getElementById("notification-text");

    if (notification && textElement) {
      textElement.textContent = message;
      notification.className = `notification ${type} show`;

      setTimeout(() => {
        notification.classList.remove("show");
      }, 4000);
    } else {
      // Fallback to alert if notification elements don't exist
      alert(message);
    }
  }

  showWelcomeMessage() {
    if (this.upiExpenses.length === 0 && this.cashExpenses.length === 0) {
      setTimeout(() => {
        this.showNotification("Welcome to VibeSpend! Ready to track your bag? 💸✨", "success");
      }, 1000);
    }
  }

  // Export functions
  exportData(format) {
    try {
      const allExpenses = [...this.upiExpenses, ...this.cashExpenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (allExpenses.length === 0) {
        this.showNotification("No data to export bestie! Add some receipts first! 📝", "error");
        return;
      }

      if (format === "csv") {
        this.exportCSV(allExpenses);
      } else if (format === "json") {
        this.exportJSON({
          upiExpenses: this.upiExpenses,
          cashExpenses: this.cashExpenses,
          exportDate: new Date().toISOString(),
          totalExpenses: allExpenses.length,
          appVersion: "VibeSpend v2.0"
        });
      }

      this.showNotification("Data exported! Your financial tea is served! ☕", "success");
    } catch (error) {
      console.error("Export error:", error);
      this.showNotification("Export failed bestie! Try again! 😰", "error");
    }
  }

  exportCSV(expenses) {
    const headers = ["Date", "Type", "Description", "Category", "Amount", "Vibe Score"];
    const csvContent = [
      headers.join(","),
      ...expenses.map(exp => [
        new Date(exp.date).toLocaleDateString("en-IN"),
        exp.type.toUpperCase(),
        `"${exp.description.replace(/"/g, '""')}"`,
        this.getCategoryName(exp.category),
        exp.amount.toFixed(2),
        exp.vibeScore || 0
      ].join(","))
    ].join("\n");

    this.downloadFile(csvContent, "vibesend-expenses.csv", "text/csv");
  }

  exportJSON(data) {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, "vibesend-expenses.json", "application/json");
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async clearAllData() {
    const confirmation = prompt('Type "DELETE MY VIBES" to confirm clearing all data (this is permanent bestie!):');
    if (confirmation !== "DELETE MY VIBES") {
      this.showNotification("Data clear cancelled! Your receipts are safe! 🛡️", "warning");
      return;
    }

    this.upiExpenses = [];
    this.cashExpenses = [];
    
    try {
      await this.saveData();
      this.render();
      this.updateStats();
      this.showNotification("All data cleared! Fresh start bestie! ✨", "success");
    } catch (error) {
      console.error("Error clearing data:", error);
      this.showNotification("Couldn't clear all data bestie! Try again! 😰", "error");
    }
  }
}

// Global functions
function exportData(format) {
  if (window.app) {
    window.app.exportData(format);
  }
}

function clearAllData() {
  if (window.app) {
    window.app.clearAllData();
  }
}

function toggleVibes() {
  document.body.style.filter = "hue-rotate(60deg)";
  setTimeout(() => {
    document.body.style.filter = "hue-rotate(0deg)";
  }, 300);

  if (window.app) {
    window.app.showNotification("Vibes switched! ✨", "success");
  }
}

function quickAdd() {
  if (!window.app) return;
  
  const currentSection = window.app.currentSection;
  if (currentSection === "upi") {
    document.getElementById("upi-desc")?.focus();
  } else if (currentSection === "cash") {
    document.getElementById("cash-desc")?.focus();
  } else {
    window.app.showSection("upi");
    setTimeout(() => {
      document.getElementById("upi-desc")?.focus();
    }, 300);
  }

  window.app.showNotification("Ready to add some receipts! 📝", "success");
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  window.app = new VibeSpendTracker();

  // Add some fun loading effects
  document.querySelectorAll(".stat-card").forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });
});

// Easter eggs and fun interactions
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("submit-btn") || e.target.classList.contains("nav-btn")) {
    const ripple = document.createElement("div");
    ripple.style.position = "absolute";
    ripple.style.borderRadius = "50%";
    ripple.style.background = "rgba(255,255,255,0.6)";
    ripple.style.transform = "scale(0)";
    ripple.style.animation = "ripple 0.6s linear";
    ripple.style.left = e.offsetX - 10 + "px";
    ripple.style.top = e.offsetY - 10 + "px";
    ripple.style.width = "20px";
    ripple.style.height = "20px";

    e.target.style.position = "relative";
    e.target.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
});

// Add ripple animation CSS
const style = document.createElement("style");
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);