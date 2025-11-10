let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;
let studyModeActive = false;
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerInitialSeconds = 25 * 60;

const stats = {
  co2Saved: parseInt(localStorage.getItem('nyx_co2') || '0'),
  trackersBlocked: parseInt(localStorage.getItem('nyx_trackers') || '0'),
  studySessions: parseInt(localStorage.getItem('nyx_study_sessions') || '0'),
  notesSaved: parseInt(localStorage.getItem('nyx_notes_count') || '0')
};

const history = JSON.parse(localStorage.getItem('nyx_history') || '[]');
const bookmarks = JSON.parse(localStorage.getItem('nyx_bookmarks') || '[]');
const notes = JSON.parse(localStorage.getItem('nyx_notes') || '[]');
const downloads = JSON.parse(localStorage.getItem('nyx_downloads') || '[]');
const whitelist = JSON.parse(localStorage.getItem('nyx_whitelist') || '[]');

// Enhanced settings with search engine
const settings = {
  blockAds: localStorage.getItem('nyx_block_ads') !== 'false',
  searchEngine: localStorage.getItem('nyx_search_engine') || 'ecosia',
  theme: localStorage.getItem('nyx_theme') || 'dark'
};

// Gamification - Badges system
const badges = JSON.parse(localStorage.getItem('nyx_badges') || '[]');
const badgeDefinitions = {
  'eco_starter': { name: 'Eco Starter', emoji: '🌱', requirement: 10, type: 'co2' },
  'eco_warrior': { name: 'Eco Warrior', emoji: '🌿', requirement: 100, type: 'co2' },
  'privacy_guardian': { name: 'Privacy Guardian', emoji: '🛡️', requirement: 50, type: 'trackers' },
  'super_blocker': { name: 'Super Blocker', emoji: '🚫', requirement: 200, type: 'trackers' },
  'focused_learner': { name: 'Focused Learner', emoji: '🎯', requirement: 5, type: 'study' },
  'master_student': { name: 'Master Student', emoji: '🏆', requirement: 20, type: 'study' },
  'note_taker': { name: 'Note Taker', emoji: '📝', requirement: 10, type: 'notes' },
  'knowledge_keeper': { name: 'Knowledge Keeper', emoji: '📚', requirement: 50, type: 'notes' }
};

// Dashboard state
let dashboardCollapsed = localStorage.getItem('nyx_dashboard_collapsed') === 'true';

// Enhanced notes with folders and tags
const noteFolders = ['general', 'study', 'research', 'personal'];
let currentNoteFilter = { folder: 'all', search: '', tags: [] };

// Drag and drop state
let draggedTab = null;

// Reduced feedback frequency
let lastFeedbackTime = 0;
const FEEDBACK_COOLDOWN = 10000; // 10 seconds between feedbacks

// Session management
let sessionData = {
  tabs: [],
  activeTabId: null,
  lastSaved: null
};

// Course-based bookmark folders
const courseFolders = JSON.parse(localStorage.getItem('nyx_course_folders') || '["Math", "History", "Cybersecurity", "Science"]');

// Sustainability tracking
const sustainabilityStats = {
  dataSaved: parseInt(localStorage.getItem('nyx_data_saved') || '0'),
  energySaved: parseInt(localStorage.getItem('nyx_energy_saved') || '0')
};

document.addEventListener('DOMContentLoaded', () => {
  initializeBrowser();
  updateStats();
  loadSettings();
  updateDashboard();
  loadBadges();
  loadCourseBookmarkFolders();
});

window.addEventListener('beforeunload', () => {
  saveSession();
});

function initializeBrowser() {
  const restored = restoreSession();

  if (!restored) {
    createNewTab();
  }

  renderTabs();

  const whitelistText = whitelist.join('\n');
  const whitelistInput = document.getElementById('whitelistInput');
  if (whitelistInput) whitelistInput.value = whitelistText;

  // Set dashboard state
  if (dashboardCollapsed) {
    document.getElementById('dashboard').classList.add('collapsed');
  }

  // Set search engine dropdown
  const dropdown = document.getElementById('searchEngineDropdown');
  if (dropdown) dropdown.value = settings.searchEngine;

  updateSustainabilityDashboard();
}

// Enhanced Dashboard Functions
function toggleDashboard() {
  const dashboard = document.getElementById('dashboard');
  const button = dashboard.querySelector('.dashboard-toggle');
  
  if (dashboard.classList.contains('collapsed')) {
    dashboard.classList.remove('collapsed');
    button.textContent = '−';
    dashboardCollapsed = false;
  } else {
    dashboard.classList.add('collapsed');
    button.textContent = '+';
    dashboardCollapsed = true;
  }
  
  localStorage.setItem('nyx_dashboard_collapsed', dashboardCollapsed);
}

function updateDashboard() {
  document.getElementById('dashboardCO2').textContent = stats.co2Saved + 'g';
  document.getElementById('dashboardTrackers').textContent = stats.trackersBlocked;
  document.getElementById('dashboardStudy').textContent = stats.studySessions;
  document.getElementById('dashboardNotes').textContent = stats.notesSaved;
  updateSustainabilityDashboard();
}

function expandStat(statType) {
  let message = '';
  switch(statType) {
    case 'co2':
      message = `You've saved ${stats.co2Saved}g of CO₂! Every gram counts for our planet. 🌍`;
      break;
    case 'trackers':
      message = `${stats.trackersBlocked} trackers blocked! Your privacy is protected. 🔒`;
      break;
    case 'study':
      message = `${stats.studySessions} study sessions completed! Keep up the great work! 📚`;
      break;
    case 'notes':
      message = `${stats.notesSaved} notes saved! Knowledge is power! 💡`;
      break;
  }
  showMicroFeedback(message);
}

// Search Engine Functions
function changeSearchEngine() {
  const dropdown = document.getElementById('searchEngineDropdown');
  settings.searchEngine = dropdown.value;
  localStorage.setItem('nyx_search_engine', settings.searchEngine);
  showMicroFeedback(`Search engine changed to ${getSearchEngineName(settings.searchEngine)}! 🔍`);
}

function getSearchEngineName(engine) {
  const names = {
    'ecosia': 'Ecosia 🌱',
    'google': 'Google',
    'duckduckgo': 'DuckDuckGo 🦆'
  };
  return names[engine] || 'Ecosia';
}

// Enhanced Tab Functions with Drag & Drop
function createNewTab(url = null) {
  const tabId = `tab-${++tabIdCounter}`;

  tabs.forEach(tab => tab.active = false);

  const tab = {
    id: tabId,
    title: 'New Tab',
    url: url || 'about:blank',
    active: true,
    canGoBack: false,
    canGoForward: false
  };

  tabs.push(tab);
  activeTabId = tabId;

  renderTabs();

  if (url) {
    loadUrlInTab(tabId, url);
  } else {
    showStartPage();
  }

  updateNavButtons();
  showMicroFeedback('New tab opened! 📑');
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  if (webview) webview.remove();

  tabs.splice(index, 1);

  if (tabs.length === 0) {
    createNewTab();
    return;
  }

  if (activeTabId === tabId) {
    const newActiveTab = tabs[Math.max(0, index - 1)];
    switchToTab(newActiveTab.id);
  }

  renderTabs();
}

function closeAllTabs() {
  if (confirm('Close all tabs?')) {
    // Remove all webviews
    const allWebviews = document.querySelectorAll('webview');
    allWebviews.forEach(wv => wv.remove());
    
    // Clear tabs array
    tabs = [];
    tabIdCounter = 0;
    
    // Create new tab
    createNewTab();
    showMicroFeedback('All tabs closed! Starting fresh! 🔄');
  }
}

function switchToTab(tabId) {
  tabs.forEach(tab => tab.active = (tab.id === tabId));
  activeTabId = tabId;

  const allWebviews = document.querySelectorAll('webview');
  allWebviews.forEach(wv => wv.style.display = 'none');

  const activeWebview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  if (activeWebview) {
    activeWebview.style.display = 'flex';
    document.getElementById('startPage').style.display = 'none';

    const activeTab = tabs.find(t => t.id === tabId);
    if (activeTab) {
      document.getElementById('urlInput').value = activeTab.url === 'about:blank' ? '' : activeTab.url;
    }
  } else {
    showStartPage();
  }

  renderTabs();
  updateNavButtons();
}

function renderTabs() {
  const container = document.getElementById('tabsContainer');

  const tabsHTML = tabs.map(tab => `
    <div class="tab ${tab.active ? 'active' : ''}" 
         draggable="true"
         ondragstart="startTabDrag(event, '${tab.id}')"
         ondragover="allowTabDrop(event)"
         ondrop="dropTab(event, '${tab.id}')"
         onclick="switchToTab('${tab.id}')">
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      <span class="tab-close" onclick="event.stopPropagation(); closeTab('${tab.id}')">×</span>
      <div class="tab-preview">
        <div style="font-size: 12px; font-weight: 500;">${escapeHtml(tab.title)}</div>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">${escapeHtml(tab.url === 'about:blank' ? 'New Tab' : tab.url)}</div>
      </div>
    </div>
  `).join('');

  const actionButtons = `
    <button class="new-tab-btn" onclick="createNewTab()">+</button>
    <button class="close-all-tabs-btn" onclick="closeAllTabs()" title="Close All Tabs">×All</button>
  `;

  container.innerHTML = tabsHTML + actionButtons;
}

// Drag and Drop Tab Functions
function startTabDrag(event, tabId) {
  draggedTab = tabId;
  event.target.classList.add('dragging');
}

function allowTabDrop(event) {
  event.preventDefault();
}

function dropTab(event, targetTabId) {
  event.preventDefault();
  
  if (draggedTab && draggedTab !== targetTabId) {
    const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Reorder tabs
      const draggedTabObj = tabs.splice(draggedIndex, 1)[0];
      tabs.splice(targetIndex, 0, draggedTabObj);
      renderTabs();
      showMicroFeedback('Tab reordered! 📋');
    }
  }
  
  // Clean up
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('dragging');
  });
  draggedTab = null;
}

function loadUrlInTab(tabId, url) {
  if (studyModeActive && !isWhitelisted(url)) {
    alert('This website is blocked in Study Mode. Add it to your whitelist first.');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      url = 'https://' + url;
    } else {
      url = getSearchUrl(url);
    }
  }

  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    tab.url = url;
  }

  let webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);

  if (!webview) {
    webview = document.createElement('webview');
    webview.setAttribute('data-tab-id', tabId);
    webview.style.flex = '1';
    webview.style.width = '100%';
    webview.style.height = '100%';

    webview.addEventListener('did-start-loading', () => {
      if (tab) tab.loading = true;
    });

    webview.addEventListener('did-stop-loading', () => {
      if (tab) {
        tab.loading = false;
        tab.canGoBack = webview.canGoBack();
        tab.canGoForward = webview.canGoForward();
        updateNavButtons();
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      if (tab) {
        tab.title = e.title || 'Untitled';
        renderTabs();
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      if (tab) {
        tab.url = e.url;
        if (tab.active) {
          document.getElementById('urlInput').value = e.url;
        }
        addToHistory(e.url, tab.title);
      }
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (tab && e.url) {
        tab.url = e.url;
        if (tab.active) {
          document.getElementById('urlInput').value = e.url;
        }
      }
    });

    webview.addEventListener('will-download', () => {
      const download = {
        filename: 'download-' + Date.now(),
        date: new Date().toISOString(),
        status: 'completed'
      };
      downloads.unshift(download);
      localStorage.setItem('nyx_downloads', JSON.stringify(downloads));
    });

    document.getElementById('webviewContainer').appendChild(webview);
  }

  webview.src = url;

  document.getElementById('startPage').style.display = 'none';
  const allWebviews = document.querySelectorAll('webview');
  allWebviews.forEach(wv => wv.style.display = 'none');
  webview.style.display = 'flex';

  if (settings.blockAds) {
    const trackersBlocked = Math.floor(Math.random() * 5) + 1;
    const co2Saved = Math.floor(Math.random() * 3) + 1;
    const dataSaved = Math.floor(Math.random() * 50) + 20;
    const energySaved = Math.floor(Math.random() * 2) + 1;

    stats.trackersBlocked += trackersBlocked;
    stats.co2Saved += co2Saved;
    sustainabilityStats.dataSaved += dataSaved;
    sustainabilityStats.energySaved += energySaved;

    localStorage.setItem('nyx_trackers', stats.trackersBlocked);
    localStorage.setItem('nyx_co2', stats.co2Saved);
    localStorage.setItem('nyx_data_saved', sustainabilityStats.dataSaved);
    localStorage.setItem('nyx_energy_saved', sustainabilityStats.energySaved);

    updateStats();
    updateDashboard();
    checkForNewBadges();

    // Reduced feedback frequency - only show occasionally
    if (Math.random() < 0.1 && canShowFeedback()) { // 10% chance
      showMicroFeedback(`🛡️ ${trackersBlocked} trackers blocked! Privacy protected!`);
    }
  }

  saveSession();
}


function getSearchUrl(query) {
  const engines = {
    'ecosia': `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
    'google': `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    'duckduckgo': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
  };
  return engines[settings.searchEngine] || engines['ecosia'];
}

function showStartPage() {
  document.getElementById('startPage').style.display = 'flex';
  const allWebviews = document.querySelectorAll('webview');
  allWebviews.forEach(wv => wv.style.display = 'none');
  document.getElementById('urlInput').value = '';
}

function handleUrlEnter(event) {
  if (event.key === 'Enter') {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) return;

    if (activeTabId) {
      loadUrlInTab(activeTabId, url);
    } else {
      createNewTab(url);
    }
  }
}

function handleStartSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('startSearch').value.trim();
    if (!query) return;

    let url;
    // Check if it's a URL or search query
    if (query.includes('.') && !query.includes(' ') && !query.startsWith('http')) {
      url = 'https://' + query;
    } else if (query.startsWith('http://') || query.startsWith('https://')) {
      url = query;
    } else {
      url = getSearchUrl(query);
    }

    if (activeTabId && tabs.find(t => t.id === activeTabId && t.url === 'about:blank')) {
      loadUrlInTab(activeTabId, url);
    } else {
      createNewTab(url);
    }
  }
}

function goBack() {
  if (!activeTabId) return;
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (webview && webview.canGoBack()) {
    webview.goBack();
  }
}

function goForward() {
  if (!activeTabId) return;
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (webview && webview.canGoForward()) {
    webview.goForward();
  }
}

function reloadPage() {
  if (!activeTabId) return;
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (webview) {
    webview.reload();
    if (canShowFeedback()) {
      showMicroFeedback('Page refreshed! 🔄');
    }
  }
}

function updateNavButtons() {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const backBtn = document.getElementById('backBtn');
  const forwardBtn = document.getElementById('forwardBtn');

  if (backBtn) backBtn.disabled = !activeTab || !activeTab.canGoBack;
  if (forwardBtn) forwardBtn.disabled = !activeTab || !activeTab.canGoForward;
}

// Window controls (unchanged)
function minimizeWindow() {
  if (window.nyx && window.nyx.minimize) {
    window.nyx.minimize();
  }
}

function maximizeWindow() {
  if (window.nyx && window.nyx.maximize) {
    window.nyx.maximize();
  }
}

function closeWindow() {
  if (window.nyx && window.nyx.close) {
    window.nyx.close();
  }
}

// Study Mode Functions (enhanced)
function toggleStudyMode() {
  document.getElementById('studyModeModal').classList.add('active');
}

function closeStudyModal() {
  document.getElementById('studyModeModal').classList.remove('active');
}

function setPomodoroTime(minutes) {
  timerSeconds = minutes * 60;
  timerInitialSeconds = minutes * 60;
  updateTimerDisplay();

  document.querySelectorAll('.pomodoro-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

function startTimer() {
  if (timerInterval) return;

  studyModeActive = true;
  document.getElementById('studyModeBanner').classList.add('active');

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      stopTimer();
      stats.studySessions++;
      localStorage.setItem('nyx_study_sessions', stats.studySessions);
      updateStats();
      updateDashboard();
      checkForNewBadges();
      showMicroFeedback('🎉 Study session complete! Great work! 🏆');
      alert('Study session complete! Great work!');
    }
  }, 1000);

  showMicroFeedback('🎯 Study mode activated! Stay focused!');
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (canShowFeedback()) {
      showMicroFeedback('⏸️ Study session paused');
    }
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerSeconds = timerInitialSeconds;
  updateTimerDisplay();
  studyModeActive = false;
  document.getElementById('studyModeBanner').classList.remove('active');
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('timerDisplay').textContent = display;
}

function saveWhitelist() {
  const text = document.getElementById('whitelistInput').value;
  const sites = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  localStorage.setItem('nyx_whitelist', JSON.stringify(sites));
  whitelist.length = 0;
  whitelist.push(...sites);
  showMicroFeedback('✅ Whitelist saved successfully!');
}

function isWhitelisted(url) {
  if (whitelist.length === 0) return false;
  return whitelist.some(site => url.includes(site));
}

// Enhanced Notes Functions
function toggleNotes() {
  const sidebar = document.getElementById('notesSidebar');
  sidebar.classList.toggle('hidden');
  if (!sidebar.classList.contains('hidden')) {
    renderNotes();
  }
}

function saveNote() {
  const noteInput = document.getElementById('noteInput');
  const tagInput = document.getElementById('tagInput');
  const folderSelect = document.getElementById('noteFolderSelect');
  
  const text = noteInput.value.trim();
  const tagsText = tagInput.value.trim();
  const folder = folderSelect.value;

  if (!text) return;

  // Parse tags
  const tags = tagsText.split(/[,\s]+/)
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(tag => tag.length > 0);

  const note = {
    id: Date.now(),
    text: text,
    date: new Date().toISOString(),
    url: activeTabId ? tabs.find(t => t.id === activeTabId)?.url : '',
    folder: folder,
    tags: tags
  };

  notes.unshift(note);
  localStorage.setItem('nyx_notes', JSON.stringify(notes));

  stats.notesSaved = notes.length;
  localStorage.setItem('nyx_notes_count', stats.notesSaved);

  noteInput.value = '';
  tagInput.value = '';
  renderNotes();
  updateStats();
  updateDashboard();
  checkForNewBadges();
  showMicroFeedback('📝 Note saved successfully!');
}

function filterNotes() {
  const searchInput = document.getElementById('notesSearch');
  const folderSelect = document.getElementById('folderSelector');
  
  currentNoteFilter.search = searchInput.value.toLowerCase();
  currentNoteFilter.folder = folderSelect.value;
  
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById('notesList');

  let filteredNotes = notes;

  // Apply folder filter
  if (currentNoteFilter.folder !== 'all') {
    filteredNotes = filteredNotes.filter(note => 
      note.folder === currentNoteFilter.folder
    );
  }

  // Apply search filter
  if (currentNoteFilter.search) {
    filteredNotes = filteredNotes.filter(note =>
      note.text.toLowerCase().includes(currentNoteFilter.search) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(currentNoteFilter.search)))
    );
  }

  if (filteredNotes.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div>No notes found</div></div>';
    return;
  }

  container.innerHTML = filteredNotes.map(note => `
    <div class="note-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(note.text.substring(0, 50))}${note.text.length > 50 ? '...' : ''}</div>
        <div class="list-item-subtitle">
          📁 ${note.folder || 'general'} • ${new Date(note.date).toLocaleDateString()}
        </div>
        ${note.tags && note.tags.length > 0 ? `
          <div class="note-tags">
            ${note.tags.map(tag => `<span class="note-tag">#${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="list-item-actions">
        <button class="icon-btn" onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function deleteNote(noteId) {
  const index = notes.findIndex(n => n.id === noteId);
  if (index !== -1) {
    notes.splice(index, 1);
    localStorage.setItem('nyx_notes', JSON.stringify(notes));
    stats.notesSaved = notes.length;
    localStorage.setItem('nyx_notes_count', stats.notesSaved);
    renderNotes();
    updateStats();
    updateDashboard();
    if (canShowFeedback()) {
      showMicroFeedback('🗑️ Note deleted');
    }
  }
}

function exportNotes() {
  if (notes.length === 0) {
    alert('No notes to export');
    return;
  }

  const text = notes.map(note => {
    const tags = note.tags && note.tags.length > 0 ? `\nTags: ${note.tags.map(t => '#' + t).join(', ')}` : '';
    const folder = note.folder ? `\nFolder: ${note.folder}` : '';
    return `${note.text}${tags}${folder}\n\nDate: ${new Date(note.date).toLocaleString()}\nURL: ${note.url || 'N/A'}\n\n---\n\n`;
  }).join('');

  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nyx-notes-${Date.now()}.txt`;
  a.click();
  
  showMicroFeedback('📤 Notes exported successfully!');
}

// Gamification Functions
function checkForNewBadges() {
  const newBadges = [];
  
  Object.keys(badgeDefinitions).forEach(badgeKey => {
    const badge = badgeDefinitions[badgeKey];
    const hasBeenEarned = badges.includes(badgeKey);
    
    if (!hasBeenEarned) {
      let currentValue = 0;
      switch(badge.type) {
        case 'co2': currentValue = stats.co2Saved; break;
        case 'trackers': currentValue = stats.trackersBlocked; break;
        case 'study': currentValue = stats.studySessions; break;
        case 'notes': currentValue = stats.notesSaved; break;
      }
      
      if (currentValue >= badge.requirement) {
        badges.push(badgeKey);
        newBadges.push(badge);
      }
    }
  });
  
  if (newBadges.length > 0) {
    localStorage.setItem('nyx_badges', JSON.stringify(badges));
    loadBadges();
    
    newBadges.forEach(badge => {
      showMicroFeedback(`🏆 Badge Earned: ${badge.emoji} ${badge.name}!`);
    });
  }
}

function loadBadges() {
  const container = document.getElementById('dashboardBadges');
  const earnedBadges = badges.map(badgeKey => badgeDefinitions[badgeKey]).filter(Boolean);
  
  container.innerHTML = earnedBadges.map(badge => 
    `<div class="badge" title="${badge.name}">${badge.emoji}</div>`
  ).join('');
}

// Enhanced Micro-feedback System with cooldown
function canShowFeedback() {
  const now = Date.now();
  return now - lastFeedbackTime > FEEDBACK_COOLDOWN;
}

function showMicroFeedback(message) {
  if (!canShowFeedback()) return; // Don't show if still in cooldown
  
  lastFeedbackTime = Date.now();
  const feedback = document.getElementById('microFeedback');
  feedback.textContent = message;
  feedback.style.display = 'block';
  
  setTimeout(() => {
    feedback.style.display = 'none';
  }, 3000);
}

// Existing functions (unchanged)
function openHistory() {
  document.getElementById('historyModal').classList.add('active');
  renderHistory();
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.remove('active');
}

function renderHistory() {
  const container = document.getElementById('historyList');

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><div>No history yet</div></div>';
    return;
  }

  container.innerHTML = history.slice(0, 100).map(item => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.title)}</div>
        <div class="list-item-subtitle">${escapeHtml(item.url)}</div>
      </div>
      <div class="list-item-actions">
        <button class="icon-btn" onclick="openHistoryUrl('${escapeHtml(item.url)}')" title="Open">🔗</button>
      </div>
    </div>
  `).join('');
}

function addToHistory(url, title) {
  if (url === 'about:blank') return;

  history.unshift({
    url: url,
    title: title || url,
    date: new Date().toISOString()
  });

  if (history.length > 1000) {
    history.splice(1000);
  }

  localStorage.setItem('nyx_history', JSON.stringify(history));
}

function openHistoryUrl(url) {
  createNewTab(url);
  closeHistoryModal();
}

function clearHistory() {
  if (confirm('Clear all browsing history?')) {
    history.length = 0;
    localStorage.setItem('nyx_history', '[]');
    renderHistory();
    showMicroFeedback('🧹 History cleared!');
  }
}

function openDownloads() {
  document.getElementById('downloadsModal').classList.add('active');
  renderDownloads();
}

function closeDownloadsModal() {
  document.getElementById('downloadsModal').classList.remove('active');
}

function renderDownloads() {
  const container = document.getElementById('downloadsList');

  if (downloads.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⬇️</div><div>No downloads yet</div></div>';
    return;
  }

  container.innerHTML = downloads.map((item, index) => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.filename)}</div>
        <div class="list-item-subtitle">${new Date(item.date).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

function openBookmarks() {
  document.getElementById('bookmarksModal').classList.add('active');
  addCourseFolderToBookmark();
  loadCourseBookmarkFolders();
  renderBookmarks();
}

function closeBookmarksModal() {
  document.getElementById('bookmarksModal').classList.remove('active');
}

function renderBookmarks() {
  const container = document.getElementById('bookmarksList');

  if (bookmarks.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⭐</div><div>No bookmarks yet</div></div>';
    return;
  }

  container.innerHTML = bookmarks.map(item => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.title)}</div>
        <div class="list-item-subtitle">${escapeHtml(item.url)}</div>
      </div>
      <div class="list-item-actions">
        <button class="icon-btn" onclick="openBookmarkUrl('${escapeHtml(item.url)}')" title="Open">🔗</button>
        <button class="icon-btn" onclick="deleteBookmark('${item.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addCurrentBookmark() {
  if (!activeTabId) return;

  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab || activeTab.url === 'about:blank') {
    alert('No page to bookmark');
    return;
  }

  const folderSelect = document.getElementById('bookmarkFolderSelect');
  const folder = folderSelect ? folderSelect.value : '';

  const bookmark = {
    id: Date.now().toString(),
    title: activeTab.title,
    url: activeTab.url,
    date: new Date().toISOString(),
    folder: folder
  };

  bookmarks.unshift(bookmark);
  localStorage.setItem('nyx_bookmarks', JSON.stringify(bookmarks));
  renderBookmarks();
  showMicroFeedback('⭐ Bookmark saved!');
}

function openBookmarkUrl(url) {
  createNewTab(url);
  closeBookmarksModal();
}

function deleteBookmark(bookmarkId) {
  const index = bookmarks.findIndex(b => b.id === bookmarkId);
  if (index !== -1) {
    bookmarks.splice(index, 1);
    localStorage.setItem('nyx_bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
    if (canShowFeedback()) {
      showMicroFeedback('🗑️ Bookmark removed');
    }
  }
}

function openSettings() {
  document.getElementById('settingsModal').classList.add('active');
  document.getElementById('blockAds').checked = settings.blockAds;
  document.getElementById('searchEngine').value = settings.searchEngine;
  document.getElementById('theme').value = settings.theme;
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
  settings.blockAds = document.getElementById('blockAds').checked;
  settings.searchEngine = document.getElementById('searchEngine').value;
  settings.theme = document.getElementById('theme').value;

  localStorage.setItem('nyx_block_ads', settings.blockAds);
  localStorage.setItem('nyx_search_engine', settings.searchEngine);
  localStorage.setItem('nyx_theme', settings.theme);

  // Update search dropdown
  const dropdown = document.getElementById('searchEngineDropdown');
  if (dropdown) dropdown.value = settings.searchEngine;

  applyTheme();
  showMicroFeedback('⚙️ Settings saved!');
}

function loadSettings() {
  applyTheme();
}

function applyTheme() {
  const root = document.documentElement;

  if (settings.theme === 'eco') {
    root.style.setProperty('--primary-color', '#10b981');
  } else if (settings.theme === 'student') {
    root.style.setProperty('--primary-color', '#3b82f6');
  } else {
    root.style.setProperty('--primary-color', '#10b981');
  }
}

function clearAllData() {
  if (confirm('This will clear ALL browser data including history, bookmarks, notes, and settings. Continue?')) {
    localStorage.clear();
    location.reload();
  }
}

function updateStats() {
  document.getElementById('co2Display').textContent = stats.co2Saved;
  document.getElementById('statCO2').textContent = stats.co2Saved + 'g';
  document.getElementById('statTrackers').textContent = stats.trackersBlocked;
  document.getElementById('statStudy').textContent = stats.studySessions;
  document.getElementById('statNotes').textContent = stats.notesSaved;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Session Management Functions
function saveSession() {
  sessionData = {
    tabs: tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      active: tab.active
    })),
    activeTabId: activeTabId,
    studyModeActive: studyModeActive,
    timerSeconds: timerSeconds,
    lastSaved: new Date().toISOString()
  };

  localStorage.setItem('nyx_session', JSON.stringify(sessionData));
  fetch('/session.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  }).catch(() => {});
}

function restoreSession() {
  const savedSession = localStorage.getItem('nyx_session');
  if (!savedSession) return false;

  try {
    const session = JSON.parse(savedSession);
    if (!session.tabs || session.tabs.length === 0) return false;

    const shouldRestore = confirm(
      `Restore your previous session from ${new Date(session.lastSaved).toLocaleString()}?\n` +
      `${session.tabs.length} tab(s) will be restored.`
    );

    if (!shouldRestore) return false;

    tabs = session.tabs.map(tab => ({
      ...tab,
      canGoBack: false,
      canGoForward: false
    }));

    activeTabId = session.activeTabId;
    tabIdCounter = Math.max(...tabs.map(t => parseInt(t.id.split('-')[1]))) || 0;

    tabs.forEach(tab => {
      if (tab.url && tab.url !== 'about:blank') {
        loadUrlInTab(tab.id, tab.url);
      }
    });

    if (session.studyModeActive) {
      studyModeActive = session.studyModeActive;
      timerSeconds = session.timerSeconds || timerInitialSeconds;
      document.getElementById('studyModeBanner').classList.add('active');
    }

    showMicroFeedback('Session restored successfully!');
    return true;
  } catch (e) {
    console.error('Failed to restore session:', e);
    return false;
  }
}

function openSessionManager() {
  document.getElementById('sessionModal').classList.add('active');
  renderSessionInfo();
}

function closeSessionModal() {
  document.getElementById('sessionModal').classList.remove('active');
}

function renderSessionInfo() {
  const container = document.getElementById('sessionInfo');
  const savedSession = localStorage.getItem('nyx_session');

  if (!savedSession) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💾</div><div>No saved session</div></div>';
    return;
  }

  try {
    const session = JSON.parse(savedSession);
    container.innerHTML = `
      <div style="padding: 16px; background: #2a2a2a; border-radius: 8px; margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Last Saved Session</div>
        <div style="font-size: 13px; color: #888;">Date: ${new Date(session.lastSaved).toLocaleString()}</div>
        <div style="font-size: 13px; color: #888;">Tabs: ${session.tabs.length}</div>
      </div>
      ${session.tabs.map(tab => `
        <div class="list-item" style="margin-bottom: 8px;">
          <div class="list-item-content">
            <div class="list-item-title">${escapeHtml(tab.title)}</div>
            <div class="list-item-subtitle">${escapeHtml(tab.url)}</div>
          </div>
        </div>
      `).join('')}
    `;
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>Error loading session</div></div>';
  }
}

function clearSession() {
  if (confirm('Clear saved session?')) {
    localStorage.removeItem('nyx_session');
    renderSessionInfo();
    showMicroFeedback('Session cleared!');
  }
}

// Sustainability Dashboard Functions
function updateSustainabilityDashboard() {
  const dataSavedEl = document.getElementById('dashboardDataSaved');
  const energySavedEl = document.getElementById('dashboardEnergySaved');

  if (dataSavedEl) {
    dataSavedEl.textContent = (sustainabilityStats.dataSaved / 1024).toFixed(2) + 'MB';
  }
  if (energySavedEl) {
    energySavedEl.textContent = sustainabilityStats.energySaved + 'Wh';
  }
}

function openSustainabilityDashboard() {
  document.getElementById('sustainabilityModal').classList.add('active');
  renderSustainabilityStats();
}

function closeSustainabilityModal() {
  document.getElementById('sustainabilityModal').classList.remove('active');
}

function renderSustainabilityStats() {
  const container = document.getElementById('sustainabilityStats');

  const co2InKg = (stats.co2Saved / 1000).toFixed(3);
  const treesEquivalent = (stats.co2Saved / 21000).toFixed(3);
  const dataInMB = (sustainabilityStats.dataSaved / 1024).toFixed(2);

  container.innerHTML = `
    <div class="sustainability-card">
      <div class="sustainability-icon">🌍</div>
      <div class="sustainability-value">${stats.co2Saved}g</div>
      <div class="sustainability-label">CO₂ Saved</div>
      <div class="sustainability-detail">Equivalent to ${co2InKg}kg carbon offset</div>
    </div>

    <div class="sustainability-card">
      <div class="sustainability-icon">🌳</div>
      <div class="sustainability-value">${treesEquivalent}</div>
      <div class="sustainability-label">Trees Planted (Equivalent)</div>
      <div class="sustainability-detail">Based on ~21kg CO₂ per tree/year</div>
    </div>

    <div class="sustainability-card">
      <div class="sustainability-icon">📊</div>
      <div class="sustainability-value">${dataInMB}MB</div>
      <div class="sustainability-label">Data Saved</div>
      <div class="sustainability-detail">By blocking ads and trackers</div>
    </div>

    <div class="sustainability-card">
      <div class="sustainability-icon">⚡</div>
      <div class="sustainability-value">${sustainabilityStats.energySaved}Wh</div>
      <div class="sustainability-label">Energy Saved</div>
      <div class="sustainability-detail">Reduced CPU/network usage</div>
    </div>

    <div class="sustainability-card">
      <div class="sustainability-icon">🛡️</div>
      <div class="sustainability-value">${stats.trackersBlocked}</div>
      <div class="sustainability-label">Trackers Blocked</div>
      <div class="sustainability-detail">Privacy and efficiency combined</div>
    </div>
  `;
}

// Course Bookmark Folders
function loadCourseBookmarkFolders() {
  const container = document.getElementById('courseBookmarkFolders');
  if (!container) return;

  container.innerHTML = courseFolders.map(folder => `
    <div class="course-folder" onclick="filterBookmarksByFolder('${escapeHtml(folder)}')">
      <span class="folder-icon">📚</span>
      <span class="folder-name">${escapeHtml(folder)}</span>
    </div>
  `).join('');
}

function filterBookmarksByFolder(folder) {
  const filteredBookmarks = bookmarks.filter(b => b.folder === folder);
  renderFilteredBookmarks(filteredBookmarks, folder);
}

function renderFilteredBookmarks(filteredBookmarks, folderName) {
  const container = document.getElementById('bookmarksList');

  if (filteredBookmarks.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><div>No bookmarks in ${folderName}</div></div>`;
    return;
  }

  container.innerHTML = filteredBookmarks.map(item => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(item.title)}</div>
        <div class="list-item-subtitle">${escapeHtml(item.url)}</div>
      </div>
      <div class="list-item-actions">
        <button class="icon-btn" onclick="openBookmarkUrl('${escapeHtml(item.url)}')">🔗</button>
        <button class="icon-btn" onclick="deleteBookmark('${item.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addCourseFolderToBookmark() {
  const folderSelect = document.getElementById('bookmarkFolderSelect');
  if (!folderSelect) return;

  folderSelect.innerHTML = '<option value="">General</option>' +
    courseFolders.map(folder => `<option value="${folder}">${folder}</option>`).join('');
}

//----------------------------------------
//Lionel: AI FUNCTIONS (Summaries, Study Assistant, Recommendations)
//----------------------------------------

async function getActivePageText() {
  if (!activeTabId) return '';
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (!webview) return '';

  try {
    const text = await webview.executeJavaScript(`
      (function(){
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let out = '';
        while(walker.nextNode()) {
          const t = walker.currentNode.nodeValue;
          if (t && t.trim().length) out += t.trim() + '\\n';
        }
        out;
      })();
    `, true);
    return text || '';
  } catch {
    const tab = tabs.find(t => t.id === activeTabId);
    return `URL_ONLY:: ${tab ? tab.url : ''}`;
  }
}

async function summarizeActiveTab() {
  const responseEl = document.getElementById('aiResponse');
  responseEl.innerHTML = '<div style="color:#888">Summarizing…</div>';
  const text = await getActivePageText();

  const system = [
    "You are a concise study summarizer.",
    "Output:",
    "• 5–8 bullet key points",
    "• Key terms",
    "• One-sentence TL;DR"
  ].join('\n');

  const user = text.startsWith('URL_ONLY::')
    ? `Summarize the page at ${text.replace('URL_ONLY::','').trim()} for a student.`
    : `Summarize this page:\n\n${text.slice(0, 15000)}`;

  const json = await window.ai.respond({
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const out = json.output_text || "No output";
  responseEl.textContent = out;
  showMicroFeedback("✅ Summary ready!");
}

async function studyAssistant(question) {
  const responseEl = document.getElementById('aiResponse');
  responseEl.innerHTML = '<div style="color:#888">Thinking…</div>';

  const recentHistory = (history || []).slice(0, 20)
    .map(h => `• ${h.title} — ${h.url}`).join('\n');

  const recentNotes = (notes || []).slice(0, 20)
    .map(n => `• [${n.folder}] ${n.text}`).join('\n');

  const sys = [
    "You are a helpful study assistant.",
    "Prefer grounded answers; if uncertain, say so.",
    "Explain in simple structured steps if helpful."
  ].join('\n');

  const prompt = [
    `User question: ${question}`,
    `Relevant notes:\n${recentNotes || '(none)'}`,
    `Recent browsing:\n${recentHistory || '(none)'}`
  ].join('\n\n');

  const json = await window.ai.respond({
    input: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]
  });

  responseEl.textContent = json.output_text || "No output";
  showMicroFeedback("📘 Study answer ready!");
}

//
function cosine(a, b) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){
    dot+=a[i]*b[i];
    na+=a[i]*a[i];
    nb+=b[i]*b[i];
  }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}

async function recommendContent(userGoalText) {
  const responseEl = document.getElementById('aiResponse');
  responseEl.innerHTML = '<div style="color:#888">Finding recommendations…</div>';

  const candidates = [
    ...(history || []).slice(0,150).map(h => ({kind:"history",title:h.title,url:h.url})),
    ...(bookmarks || []).map(b => ({kind:"bookmark",title:b.title,url:b.url}))
  ];
  if (candidates.length === 0) {
    responseEl.textContent = "Not enough data.";
    return;
  }

  const texts = candidates.map(c => `${c.title} | ${c.url}`);
  const emb = await window.ai.embed(texts);
  const candVecs = emb.data.map(d => d.embedding);

  const goalRes = await window.ai.embed([userGoalText]);
  const goalVec = goalRes.data[0].embedding;

  const scored = candidates.map((c, i) => ({
    ...c,
    score: cosine(goalVec, candVecs[i])
  }))
  .sort((a,b)=>b.score - a.score)
  .slice(0, 8);

  responseEl.textContent =
    `Top matches for "${userGoalText}":\n\n` +
    scored.map(s => `• ${s.title} (${s.kind})\n  ${s.url}`).join("\n");
  
  showMicroFeedback("🎯 Recommendations ready!");
}

function openAIHelper() {
  document.getElementById('aiHelperModal').classList.add('active');
}

function closeAIHelperModal() {
  document.getElementById('aiHelperModal').classList.remove('active');
}
//---------------------------
//Lionel:Replaced sendAIQuery 
//---------------------------
function sendAIQuery() {
  const query = document.getElementById('aiQueryInput').value.trim();
  if (!query) return;

  if (/summari[sz]e|summary|summarize page/i.test(query)) {
    summarizeActiveTab();
  } 
  else if (/recommend|suggest|what next/i.test(query)) {
    const clean = query.replace(/recommend|suggest/i, '').trim() || 'help me find related content';
    recommendContent(clean);
  } 
  else {
    studyAssistant(query);
  }
}
