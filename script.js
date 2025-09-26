class VibeTracker {
    constructor() {
        this.moodHistory = JSON.parse(localStorage.getItem('vibeTrackerHistory')) || [];
        this.currentSelection = null;
        this.selectedTags = new Set();
        this.streakCount = 0;

        this.initializeElements();
        this.setupEventListeners();
        this.createMoodGrid();
        this.updateDashboard();
        this.updateStreak();
        this.setTodayDate();
    }

    initializeElements() {
        // Navigation elements
        this.streakCountEl = document.getElementById('streakCount');
        this.avgMoodScoreEl = document.getElementById('avgMoodScore');

        // Hero elements
        this.quickLogBtn = document.getElementById('quickLog');
        this.viewInsightsBtn = document.getElementById('viewInsights');

        // Grid elements
        this.moodGrid = document.getElementById('moodGrid');
        this.energyValue = document.getElementById('energyValue');
        this.moodValue = document.getElementById('moodValue');
        this.moodDescription = document.getElementById('moodDescription');
        this.logMoodBtn = document.getElementById('logMoodBtn');

        // Dashboard elements
        this.todayDate = document.getElementById('todayDate');
        this.todayMood = document.getElementById('todayMood');
        this.todayEnergy = document.getElementById('todayEnergy');
        this.todayEntries = document.getElementById('todayEntries');
        this.todayTrend = document.getElementById('todayTrend');

        // Modal elements
        this.moodLogModal = document.getElementById('moodLogModal');
        this.modalEnergy = document.getElementById('modalEnergy');
        this.modalMood = document.getElementById('modalMood');
        this.moodNotes = document.getElementById('moodNotes');
        this.cancelLogBtn = document.getElementById('cancelLog');
        this.confirmLogBtn = document.getElementById('confirmLog');

        // Toast
        this.successToast = document.getElementById('successToast');

        // Goals and insights
        this.goalsList = document.getElementById('goalsList');
        this.insightsList = document.getElementById('insightsList');
    }

    setupEventListeners() {
        // Quick actions
        this.quickLogBtn.addEventListener('click', () => this.showQuickLog());
        this.viewInsightsBtn.addEventListener('click', () => this.scrollToInsights());

        // Modal controls
        this.cancelLogBtn.addEventListener('click', () => this.closeModal());
        this.confirmLogBtn.addEventListener('click', () => this.logMood());
        this.moodLogModal.addEventListener('click', (e) => {
            if (e.target === this.moodLogModal) {
                this.closeModal();
            }
        });

        // Tag selection
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleTag(e.target));
        });

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // PWA Install prompt
        this.setupPWAInstall();

        // Handle URL parameters for quick actions
        this.handleURLParams();

        // Log mood button
        this.logMoodBtn.addEventListener('click', () => this.showModal());
    }

    createMoodGrid() {
        this.moodGrid.innerHTML = '';

        // Create 15x15 grid (225 cells total)
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // Calculate energy (0-100) and mood (0-100) based on position
                const energy = Math.round((col / 14) * 100);
                const mood = Math.round(((14 - row) / 14) * 100);

                cell.dataset.energy = energy;
                cell.dataset.mood = mood;

                // Add hover effect (desktop)
                cell.addEventListener('mouseenter', () => this.handleCellHover(cell));
                cell.addEventListener('mouseleave', () => this.handleCellLeave(cell));
                cell.addEventListener('click', () => this.selectCell(cell));

                // Add touch support (mobile)
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleCellHover(cell);
                });
                cell.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.selectCell(cell);
                });

                this.moodGrid.appendChild(cell);
            }
        }
    }

    handleCellHover(cell) {
        const energy = parseInt(cell.dataset.energy);
        const mood = parseInt(cell.dataset.mood);

        // Update display
        this.energyValue.textContent = energy;
        this.moodValue.textContent = mood;
        this.moodDescription.textContent = this.getMoodDescription(energy, mood);

        // Enable log button
        this.logMoodBtn.disabled = false;
        this.currentSelection = { energy, mood, cell };
    }

    handleCellLeave(cell) {
        if (!cell.classList.contains('selected')) {
            // Reset display if no cell is selected
            if (!this.currentSelection || this.currentSelection.cell !== cell) {
                this.energyValue.textContent = '--';
                this.moodValue.textContent = '--';
                this.moodDescription.textContent = 'Click on the grid to log your current state';
                this.logMoodBtn.disabled = true;
            }
        }
    }

    selectCell(cell) {
        // Remove previous selection
        document.querySelectorAll('.grid-cell.selected').forEach(c => {
            c.classList.remove('selected');
        });

        // Add selection to clicked cell
        cell.classList.add('selected');

        const energy = parseInt(cell.dataset.energy);
        const mood = parseInt(cell.dataset.mood);

        this.currentSelection = { energy, mood, cell };
        this.energyValue.textContent = energy;
        this.moodValue.textContent = mood;
        this.moodDescription.textContent = this.getMoodDescription(energy, mood);
        this.logMoodBtn.disabled = false;
    }

    getMoodDescription(energy, mood) {
        let energyLevel, moodLevel;

        if (energy >= 80) energyLevel = 'Very High';
        else if (energy >= 60) energyLevel = 'High';
        else if (energy >= 40) energyLevel = 'Medium';
        else if (energy >= 20) energyLevel = 'Low';
        else energyLevel = 'Very Low';

        if (mood >= 80) moodLevel = 'Excellent';
        else if (mood >= 60) moodLevel = 'Good';
        else if (mood >= 40) moodLevel = 'Okay';
        else if (mood >= 20) moodLevel = 'Low';
        else moodLevel = 'Very Low';

        return `${energyLevel} Energy, ${moodLevel} Mood`;
    }

    showModal() {
        if (!this.currentSelection) return;

        this.modalEnergy.textContent = this.currentSelection.energy;
        this.modalMood.textContent = this.currentSelection.mood;
        this.moodNotes.value = '';
        this.selectedTags.clear();
        this.updateTagButtons();

        this.moodLogModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.moodLogModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    toggleTag(button) {
        const tag = button.dataset.tag;
        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
            button.classList.remove('selected');
        } else {
            this.selectedTags.add(tag);
            button.classList.add('selected');
        }
    }

    updateTagButtons() {
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    logMood() {
        if (!this.currentSelection) return;

        const entry = {
            timestamp: new Date().toISOString(),
            energy: this.currentSelection.energy,
            mood: this.currentSelection.mood,
            notes: this.moodNotes.value.trim(),
            tags: Array.from(this.selectedTags)
        };

        this.moodHistory.unshift(entry);

        // Keep only last 200 entries
        if (this.moodHistory.length > 200) {
            this.moodHistory = this.moodHistory.slice(0, 200);
        }

        localStorage.setItem('vibeTrackerHistory', JSON.stringify(this.moodHistory));

        this.closeModal();
        this.showSuccessToast();
        this.updateDashboard();
        this.updateStreak();
        this.updateGoals();
        this.updateInsights();

        // Clear selection
        document.querySelectorAll('.grid-cell.selected').forEach(c => {
            c.classList.remove('selected');
        });
        this.currentSelection = null;
        this.energyValue.textContent = '--';
        this.moodValue.textContent = '--';
        this.moodDescription.textContent = 'Click on the grid to log your current state';
        this.logMoodBtn.disabled = true;
    }

    showSuccessToast() {
        this.successToast.classList.add('show');
        setTimeout(() => {
            this.successToast.classList.remove('show');
        }, 3000);
    }

    updateDashboard() {
        const today = new Date().toDateString();
        const todayEntries = this.moodHistory.filter(entry =>
            new Date(entry.timestamp).toDateString() === today
        );

        if (todayEntries.length > 0) {
            const avgEnergy = Math.round(todayEntries.reduce((sum, entry) => sum + entry.energy, 0) / todayEntries.length);
            const avgMood = Math.round(todayEntries.reduce((sum, entry) => sum + entry.mood, 0) / todayEntries.length);

            this.todayEnergy.textContent = avgEnergy;
            this.todayMood.textContent = avgMood;
            this.todayEntries.textContent = todayEntries.length;

            // Update trend
            const trend = this.calculateTrend(todayEntries);
            this.todayTrend.innerHTML = `
                <i class="fas fa-chart-line"></i>
                <span>${trend}</span>
            `;
        } else {
            this.todayEnergy.textContent = '--';
            this.todayMood.textContent = '--';
            this.todayEntries.textContent = '0';
            this.todayTrend.innerHTML = `
                <i class="fas fa-chart-line"></i>
                <span>No data yet today</span>
            `;
        }

        // Update overall average mood
        if (this.moodHistory.length > 0) {
            const avgMood = Math.round(this.moodHistory.reduce((sum, entry) => sum + entry.mood, 0) / this.moodHistory.length);
            this.avgMoodScoreEl.textContent = avgMood;
        }
    }

    calculateTrend(entries) {
        if (entries.length < 2) return 'Not enough data';

        const recent = entries.slice(0, Math.min(3, entries.length));
        const older = entries.slice(Math.min(3, entries.length));

        if (older.length === 0) return 'Getting started';

        const recentAvg = recent.reduce((sum, entry) => sum + entry.mood, 0) / recent.length;
        const olderAvg = older.reduce((sum, entry) => sum + entry.mood, 0) / older.length;

        const diff = recentAvg - olderAvg;

        if (diff > 5) return 'Trending up! 📈';
        if (diff < -5) return 'Trending down 📉';
        return 'Stable trend 📊';
    }

    updateStreak() {
        const today = new Date();
        let streak = 0;

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateString = checkDate.toDateString();

            const hasEntry = this.moodHistory.some(entry =>
                new Date(entry.timestamp).toDateString() === dateString
            );

            if (hasEntry) {
                streak++;
            } else {
                break;
            }
        }

        this.streakCount = streak;
        this.streakCountEl.textContent = streak;
    }

    updateGoals() {
        const goals = [
            {
                title: '7-Day Streak',
                icon: 'fas fa-fire',
                current: this.streakCount,
                target: 7,
                color: 'var(--warning)'
            },
            {
                title: 'Positive Week',
                icon: 'fas fa-heart',
                current: this.getPositiveDays(7),
                target: 7,
                color: 'var(--success)'
            }
        ];

        this.goalsList.innerHTML = goals.map(goal => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return `
                <div class="goal-item">
                    <div class="goal-icon" style="background: ${goal.color}">
                        <i class="${goal.icon}"></i>
                    </div>
                    <div class="goal-info">
                        <div class="goal-title">${goal.title}</div>
                        <div class="goal-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${goal.current}/${goal.target} ${goal.title.toLowerCase()}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getPositiveDays(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const recentEntries = this.moodHistory.filter(entry =>
            new Date(entry.timestamp) >= cutoff
        );

        const dailyAverages = {};
        recentEntries.forEach(entry => {
            const date = new Date(entry.timestamp).toDateString();
            if (!dailyAverages[date]) {
                dailyAverages[date] = { mood: 0, count: 0 };
            }
            dailyAverages[date].mood += entry.mood;
            dailyAverages[date].count++;
        });

        return Object.values(dailyAverages).filter(day =>
            (day.mood / day.count) >= 60
        ).length;
    }

    updateInsights() {
        if (this.moodHistory.length === 0) {
            this.insightsList.innerHTML = `
                <div class="insight-item">
                    <i class="fas fa-info-circle"></i>
                    <span>Log your first mood to get personalized insights!</span>
                </div>
            `;
            return;
        }

        const insights = this.generateInsights();
        this.insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <i class="${insight.icon}"></i>
                <span>${insight.text}</span>
            </div>
        `).join('');
    }

    generateInsights() {
        const insights = [];

        // Energy insights
        const avgEnergy = this.moodHistory.reduce((sum, entry) => sum + entry.energy, 0) / this.moodHistory.length;
        if (avgEnergy < 40) {
            insights.push({
                icon: 'fas fa-battery-quarter',
                text: 'Your energy levels tend to be low. Consider adding more movement or rest to your routine.'
            });
        } else if (avgEnergy > 70) {
            insights.push({
                icon: 'fas fa-battery-full',
                text: 'Great energy levels! You might benefit from channeling this into productive activities.'
            });
        }

        // Mood insights
        const avgMood = this.moodHistory.reduce((sum, entry) => sum + entry.mood, 0) / this.moodHistory.length;
        if (avgMood < 40) {
            insights.push({
                icon: 'fas fa-heart',
                text: 'Your mood could use a boost. Try activities that bring you joy or connect with loved ones.'
            });
        } else if (avgMood > 70) {
            insights.push({
                icon: 'fas fa-smile',
                text: 'You\'re in a great mood! This is a perfect time to tackle challenging tasks.'
            });
        }

        // Pattern insights
        const recentEntries = this.moodHistory.slice(0, 7);
        if (recentEntries.length >= 3) {
            const trend = this.calculateTrend(recentEntries);
            if (trend.includes('up')) {
                insights.push({
                    icon: 'fas fa-chart-line',
                    text: 'Your mood is trending upward! Keep doing what you\'re doing.'
                });
            } else if (trend.includes('down')) {
                insights.push({
                    icon: 'fas fa-chart-line',
                    text: 'Your mood has been declining. Consider what might be causing this and take action.'
                });
            }
        }

        // Tag insights
        const allTags = this.moodHistory.flatMap(entry => entry.tags || []);
        const tagCounts = {};
        allTags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        const mostCommonTag = Object.keys(tagCounts).reduce((a, b) =>
            tagCounts[a] > tagCounts[b] ? a : b, null
        );

        if (mostCommonTag) {
            insights.push({
                icon: 'fas fa-tag',
                text: `You often log moods related to "${mostCommonTag}". This might be a key factor in your wellbeing.`
            });
        }

        return insights.slice(0, 3); // Limit to 3 insights
    }

    setTodayDate() {
        const today = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        this.todayDate.textContent = today.toLocaleDateString('en-US', options);
    }

    showQuickLog() {
        // Scroll to grid and highlight it
        document.querySelector('.mood-section').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Add a subtle animation to draw attention
        setTimeout(() => {
            this.moodGrid.style.transform = 'scale(1.02)';
            setTimeout(() => {
                this.moodGrid.style.transform = 'scale(1)';
            }, 200);
        }, 500);
    }

    scrollToInsights() {
        document.querySelector('.insights-card').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    setupPWAInstall() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;

            // Show install button or banner
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.showSuccessToast('App installed successfully!');
        });
    }

    showInstallPrompt(deferredPrompt) {
        // Create install button in navigation
        const installBtn = document.createElement('button');
        installBtn.className = 'btn-secondary install-btn';
        installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
        installBtn.style.display = 'none';

        installBtn.addEventListener('click', () => {
            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
                installBtn.style.display = 'none';
            });
        });

        // Add to navigation
        const navStats = document.querySelector('.nav-stats');
        navStats.appendChild(installBtn);

        // Show after a delay
        setTimeout(() => {
            installBtn.style.display = 'flex';
        }, 3000);
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        if (action === 'log') {
            // Scroll to grid and highlight it
            setTimeout(() => {
                this.showQuickLog();
            }, 500);
        }
    }

    // Enhanced mobile touch feedback
    addMobileTouchFeedback() {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('touchstart', (e) => {
                cell.style.transform = 'translateY(-2px) scale(1.02)';
                cell.style.transition = 'transform 0.1s ease';
            });

            cell.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    if (!cell.classList.contains('selected')) {
                        cell.style.transform = '';
                    }
                }, 100);
            });
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VibeTracker();
});

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}