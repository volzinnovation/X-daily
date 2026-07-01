// Popup script for X-Daily extension

document.addEventListener('DOMContentLoaded', () => {
  const extensionApi = getExtensionApi();
  const chrome = extensionApi;
  const generateBtn = document.getElementById('generateBtn');
  const demoBtn = document.getElementById('demoBtn');
  const archiveBtn = document.getElementById('archiveBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveArchiveBtn = document.getElementById('saveArchiveBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const emailBtn = document.getElementById('emailBtn');
  const exportArchiveBtn = document.getElementById('exportArchiveBtn');
  const clearArchiveBtn = document.getElementById('clearArchiveBtn');
  const archiveSearch = document.getElementById('archiveSearch');
  const archiveList = document.getElementById('archiveList');
  const archiveEmpty = document.getElementById('archiveEmpty');
  const archiveCount = document.getElementById('archiveCount');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const settingsDiv = document.getElementById('settings');
  const archiveDiv = document.getElementById('archive');
  
  let currentNewsletter = null;
  let currentPosts = [];
  let currentClusters = {};
  let currentSource = 'live';
  let archiveEntries = [];
  
  // Load settings
  loadSettings();
  loadArchive();
  
  generateBtn.addEventListener('click', async () => {
    await generateDailySummary();
  });

  demoBtn.addEventListener('click', () => {
    generateDemoSummary();
  });

  archiveBtn.addEventListener('click', () => {
    archiveDiv.classList.toggle('hidden');
    settingsDiv.classList.add('hidden');
    renderArchive();
  });
  
  /**
   * Navigate to a URL and wait for the page to load
   */
  async function navigateToUrl(url, tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url: url }, (updatedTab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const targetTabId = updatedTab.id || tabId;
        
        // Wait for the page to load
        const targetUrlBase = url.split('?')[0].split('#')[0];
        const listener = (tabIdUpdated, changeInfo, tab) => {
          if (tabIdUpdated === targetTabId && changeInfo.status === 'complete') {
            // Check if we're on the target URL (or close to it)
            if (tab.url && (tab.url.startsWith(targetUrlBase) || tab.url.includes(targetUrlBase.replace('https://', '')))) {
              chrome.tabs.onUpdated.removeListener(listener);
              // Give it a bit more time for X.com's dynamic content to load
              setTimeout(() => {
                chrome.tabs.get(targetTabId, (finalTab) => {
                  if (finalTab) {
                    resolve(finalTab);
                  } else {
                    resolve(tab);
                  }
                });
              }, 2000);
            }
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        // Timeout after 15 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.get(targetTabId, (tab) => {
            if (tab && tab.url) {
              // Even if timeout, return the tab if we're close to the target
              resolve(tab);
            } else {
              reject(new Error('Page load timeout'));
            }
          });
        }, 15000);
      });
    });
  }
  
  /**
   * Get the current username from X.com
   */
  async function getCurrentUsername() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      // Try to get username from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentUsername' });
      if (response && response.success && response.username) {
        return response.username;
      }
    } catch (error) {
      console.log('Could not get username from content script:', error);
    }
    
    // Fallback: try to extract from URL
    const urlMatch = tab.url.match(/x\.com\/([^\/\?]+)/);
    if (urlMatch && urlMatch[1] && 
        urlMatch[1] !== 'home' && 
        urlMatch[1] !== 'explore' && 
        urlMatch[1] !== 'notifications' &&
        urlMatch[1] !== 'messages') {
      return urlMatch[1];
    }
    
    // Try to get from page title or other methods
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Try to find username in various places
          const urlMatch = window.location.pathname.match(/^\/([^\/]+)/);
          if (urlMatch && urlMatch[1] && 
              urlMatch[1] !== 'home' && 
              urlMatch[1] !== 'explore' && 
              urlMatch[1] !== 'notifications') {
            return urlMatch[1];
          }
          
          // Try to find in page content
          const profileLink = document.querySelector('a[href*="/"][role="link"]');
          if (profileLink) {
            const href = profileLink.getAttribute('href');
            const match = href.match(/^\/([^\/\?]+)/);
            if (match && match[1]) {
              return match[1];
            }
          }
          
          return null;
        }
      });
      
      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    } catch (error) {
      console.log('Could not extract username:', error);
    }
    
    return null;
  }
  
  settingsBtn.addEventListener('click', () => {
    settingsDiv.classList.toggle('hidden');
    resultsDiv.classList.add('hidden');
  });
  
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    // Status message is now shown inside saveSettings()
  });

  saveArchiveBtn.addEventListener('click', async () => {
    await saveCurrentDigest();
  });
  
  downloadBtn.addEventListener('click', () => {
    if (currentNewsletter) {
      downloadNewsletter(currentNewsletter);
    }
  });
  
  emailBtn.addEventListener('click', async () => {
    if (currentNewsletter) {
      await sendNewsletterEmail(currentNewsletter);
    }
  });

  exportArchiveBtn.addEventListener('click', () => {
    exportArchive();
  });

  clearArchiveBtn.addEventListener('click', async () => {
    await clearArchive();
  });

  archiveSearch.addEventListener('input', () => {
    renderArchive();
  });

  archiveList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-digest-id]');
    if (!button) return;
    const entry = archiveEntries.find((item) => item.id === button.dataset.digestId);
    if (entry) {
      displayArchivedDigest(entry);
    }
  });
  
  async function generateDailySummary() {
    if (!hasExtensionRuntime()) {
      showStatus('Live scraping requires the Chrome extension runtime. Use Preview Demo in this browser view.', 'error');
      return;
    }

    showStatus('Starting...', 'info');
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    archiveDiv.classList.add('hidden');
    
    try {
      // Get following accounts (will automatically navigate if needed)
      showStatus('Fetching accounts you follow...', 'info');
      const accounts = await getFollowingAccounts();
      
      if (accounts.length === 0) {
        showStatus('No accounts found. Make sure you are logged in to X.', 'error');
        loadingDiv.classList.add('hidden');
        return;
      }
      
      showStatus(`Found ${accounts.length} accounts. Fetching posts...`, 'info');
      
      // Get posts from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const sinceDate = yesterday.toISOString().split('T')[0];
      
      // Fetch posts from all accounts
      const allPosts = await fetchPostsFromAccounts(accounts, sinceDate);
      
      if (allPosts.length === 0) {
        showStatus('No new posts found from yesterday.', 'info');
        loadingDiv.classList.add('hidden');
        return;
      }
      
      showStatus(`Found ${allPosts.length} posts. Processing...`, 'info');
      
      // Process posts
      const processedPosts = allPosts.map(post => processPost(post));
      
      // Cluster posts
      const numClusters = parseInt(document.getElementById('numClusters').value) || 5;
      const clusters = clusterPosts(processedPosts, numClusters);
      
      // Generate newsletter
      const newsletter = generateNewsletter(clusters);
      
      currentNewsletter = newsletter;
      currentPosts = processedPosts;
      currentClusters = clusters;
      currentSource = 'live';
      
      // Display results
      displayResults(processedPosts, clusters, newsletter);
      
      showStatus('Daily summary generated successfully!', 'success');
      
    } catch (error) {
      console.error('Error generating summary:', error);
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      loadingDiv.classList.add('hidden');
    }
  }

  function generateDemoSummary() {
    const demoPosts = (window.X_DAILY_DEMO_POSTS || []).map(post => ({
      ...post,
      original_text: post.original_text || post.clean_text,
    }));

    if (demoPosts.length === 0) {
      showStatus('Demo data is not available in this build.', 'error');
      return;
    }

    loadingDiv.classList.add('hidden');
    settingsDiv.classList.add('hidden');
    const clusterCount = Math.min(3, demoPosts.length);
    const clusters = clusterPosts(demoPosts, clusterCount);
    const newsletter = generateNewsletter(clusters);

    currentNewsletter = newsletter;
    currentPosts = demoPosts;
    currentClusters = clusters;
    currentSource = 'demo';
    displayResults(demoPosts, clusters, newsletter);
    showStatus('Demo summary ready. No X session required.', 'success');
  }
  
  async function getFollowingAccounts() {
    // Get the current tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on x.com, if not navigate there first
    if (!tab.url || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
      showStatus('Navigating to x.com...', 'info');
      tab = await navigateToUrl('https://x.com/home', tab.id);
    }
    
    // Check if we're on the following page
    const isOnFollowingPage = tab.url && tab.url.includes('/following');
    
    if (!isOnFollowingPage) {
      // Get username from settings first, fallback to extracting from page
      showStatus('Getting your username...', 'info');
      let username = await getStoredXHandle();
      
      if (!username) {
        // Try to extract from current page as fallback
        username = await getCurrentUsername();
        
        if (!username) {
          throw new Error('X handle not found. Please set your X handle in Settings first, or navigate to your X.com profile page.');
        }
      }
      
      // Remove @ if present
      username = username.replace('@', '').trim();
      
      showStatus('Navigating to your following page...', 'info');
      const followingUrl = `https://x.com/${username}/following`;
      tab = await navigateToUrl(followingUrl, tab.id);
    }
    
    // Try to get from content script (preferred method)
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getFollowingFromPage' });
      if (response && response.success && response.accounts && response.accounts.length > 0) {
        console.log(`Found ${response.accounts.length} accounts via content script`);
        return response.accounts;
      } else if (response && response.error) {
        console.log('Content script error:', response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.log('Content script method failed:', error.message);
      // If content script isn't loaded, wait a bit and try again
      if (error.message.includes('Could not establish connection')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getFollowingFromPage' });
          if (response && response.success && response.accounts && response.accounts.length > 0) {
            return response.accounts;
          }
        } catch (retryError) {
          throw new Error('Content script not loaded. Please refresh the x.com page and try again.');
        }
      } else {
        throw error;
      }
    }
    
    // Fallback to background script (may not work if GraphQL isn't implemented)
    console.log('Trying background script method...');
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchFollowing' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.success) {
          resolve(response.accounts);
        } else {
          // Background script failed, suggest using content script method
          const errorMsg = response?.error || 'Failed to fetch following accounts';
          if (errorMsg.includes('GraphQL method not fully implemented')) {
            reject(new Error('Please navigate to your X.com following page (x.com/[your-username]/following) and try again. The API method is not yet implemented.'));
          } else {
            reject(new Error(errorMsg));
          }
        }
      });
    });
  }
  
  async function fetchPostsFromAccounts(accounts, sinceDate) {
    // Get the current tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on x.com, if not navigate there first
    if (!tab.url || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
      showStatus('Navigating to x.com...', 'info');
      tab = await navigateToUrl('https://x.com/home', tab.id);
    }
    
    const allPosts = [];
    
    // Limit to first 20 accounts to avoid taking too long (can be configured)
    const accountsToFetch = accounts.slice(0, 20);
    
    showStatus(`Fetching posts from ${accountsToFetch.length} accounts...`, 'info');
    
    for (let i = 0; i < accountsToFetch.length; i++) {
      const account = accountsToFetch[i];
      const screenName = account.replace('@', '').trim();
      
      try {
        showStatus(`Fetching posts from ${account} (${i + 1}/${accountsToFetch.length})...`, 'info');
        
        // Navigate to the account's profile page
        const profileUrl = `https://x.com/${screenName}`;
        console.log(`Navigating to ${profileUrl}`);
        
        tab = await navigateToUrl(profileUrl, tab.id);
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Refresh tab info
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log(`Current URL after navigation: ${tab.url}`);
        
        // Always inject content script after navigation (new page = new context)
        let contentScriptReady = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            // Inject content script
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            console.log(`Content script injected for ${account}, attempt ${attempt + 1}`);
            
            // Wait for script to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to ping
            try {
              const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
              if (pingResponse && pingResponse.pong) {
                contentScriptReady = true;
                console.log(`Content script ready for ${account}`);
                break;
              } else {
                console.log(`Ping response invalid for ${account}:`, pingResponse);
              }
            } catch (pingError) {
              console.log(`Ping failed for ${account}, attempt ${attempt + 1}:`, pingError.message);
            }
          } catch (injectError) {
            console.error(`Could not inject content script for ${account}, attempt ${attempt + 1}:`, injectError);
          }
          
          if (!contentScriptReady && attempt < 4) {
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (!contentScriptReady) {
          console.warn(`Content script not ready for ${account} after 5 attempts, skipping...`);
          continue;
        }
        
        // Fetch posts from this account's profile page
        try {
          const response = await Promise.race([
            chrome.tabs.sendMessage(tab.id, {
              action: 'getPostsFromPage',
              username: account,
              sinceDate: sinceDate
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timed out')), 15000)
            )
          ]);
          
          if (response && response.success && response.posts) {
            const posts = response.posts || [];
            console.log(`Found ${posts.length} posts from ${account}`);
            if (posts.length > 0) {
              allPosts.push(...posts);
            }
          } else if (response && response.error) {
            console.log(`Error fetching posts from ${account}:`, response.error);
          }
        } catch (error) {
          console.error(`Error fetching posts from ${account}:`, error.message);
          // Continue with next account
        }
        
        // Small delay between accounts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing account ${account}:`, error);
        // Continue with next account
      }
    }
    
    console.log(`Total posts collected: ${allPosts.length}`);
    return allPosts;
  }
  
  function displayResults(posts, clusters, newsletter) {
    document.getElementById('postCount').textContent = posts.length;
    document.getElementById('accountCount').textContent = new Set(posts.map(p => p.handle)).size;
    
    const newsletterDiv = document.getElementById('newsletter');
    newsletterDiv.innerHTML = newsletter;
    renderBriefingPanel(posts, clusters, newsletter);
    
    resultsDiv.classList.remove('hidden');
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusDiv.classList.add('hidden');
      }, 5000);
    }
  }

  function renderBriefingPanel(posts, clusters, newsletter) {
    const archiveApi = window.XDailyArchive;
    if (!archiveApi) return;

    const entry = archiveApi.buildDigestArchiveEntry({
      posts,
      clusters,
      newsletter,
      source: currentSource,
      generatedAt: new Date().toISOString(),
    });
    const topClusters = entry.clusterSummaries.slice(0, 3);

    document.getElementById('briefingPanel').innerHTML = `
      <div class="briefing-heading">
        <div>
          <span class="eyebrow">${escapeText(entry.source)} briefing</span>
          <h2>${entry.clusterCount} topic groups ranked by signal</h2>
        </div>
        <div class="signal-score">${entry.topKeywords.slice(0, 3).map(escapeText).join(' · ') || 'No keywords yet'}</div>
      </div>
      <div class="topic-grid">
        ${topClusters.map((cluster) => `
          <article class="topic-card">
            <div class="topic-meta">${cluster.postCount} posts · priority ${cluster.priorityScore}</div>
            <h3>${escapeText(cluster.title)}</h3>
            <p>${escapeText(cluster.excerpt || 'No excerpt available.')}</p>
            <div class="handle-row">${cluster.handles.map((handle) => `<span>${escapeText(handle)}</span>`).join('')}</div>
          </article>
        `).join('')}
      </div>
    `;
  }

  async function loadArchive() {
    const stored = await storageGet('xDailyDigestArchive');
    archiveEntries = Array.isArray(stored) ? stored : [];
    renderArchive();
  }

  async function saveCurrentDigest() {
    if (!currentNewsletter || currentPosts.length === 0) {
      showStatus('Generate or preview a digest before saving it.', 'error');
      return;
    }

    const entry = window.XDailyArchive.buildDigestArchiveEntry({
      posts: currentPosts,
      clusters: currentClusters,
      newsletter: currentNewsletter,
      source: currentSource,
      generatedAt: new Date().toISOString(),
    });
    const withoutDuplicate = archiveEntries.filter((item) => item.id !== entry.id);
    archiveEntries = window.XDailyArchive.sortArchiveEntries([entry, ...withoutDuplicate]).slice(0, 30);
    await storageSet('xDailyDigestArchive', archiveEntries);
    renderArchive();
    showStatus(`Saved ${entry.dateLabel} digest to the local archive.`, 'success');
  }

  function renderArchive() {
    if (!window.XDailyArchive) return;

    archiveCount.textContent = archiveEntries.length;
    const filtered = window.XDailyArchive.filterArchiveEntries(archiveEntries, archiveSearch.value);
    archiveEmpty.classList.toggle('hidden', filtered.length > 0);
    archiveList.innerHTML = filtered.map((entry) => `
      <article class="archive-item">
        <div>
          <div class="archive-meta">${escapeText(entry.dateLabel)} · ${escapeText(entry.source)} · ${entry.postCount} posts</div>
          <h3>${entry.clusterCount} topics from ${entry.accountCount} accounts</h3>
          <p>${escapeText((entry.topKeywords || []).slice(0, 6).join(', ') || 'No keywords captured.')}</p>
        </div>
        <button class="btn btn-secondary" data-digest-id="${escapeText(entry.id)}">Open</button>
      </article>
    `).join('');
  }

  function displayArchivedDigest(entry) {
    currentNewsletter = entry.newsletter;
    currentPosts = [];
    currentClusters = {};
    currentSource = entry.source || 'archive';
    document.getElementById('postCount').textContent = entry.postCount;
    document.getElementById('accountCount').textContent = entry.accountCount;
    document.getElementById('newsletter').innerHTML = entry.newsletter;
    document.getElementById('briefingPanel').innerHTML = `
      <div class="briefing-heading">
        <div>
          <span class="eyebrow">archived briefing</span>
          <h2>${entry.clusterCount} topic groups saved ${escapeText(entry.dateLabel)}</h2>
        </div>
        <div class="signal-score">${escapeText((entry.topKeywords || []).slice(0, 3).join(' · ') || 'No keywords')}</div>
      </div>
      <div class="topic-grid">
        ${(entry.clusterSummaries || []).slice(0, 3).map((cluster) => `
          <article class="topic-card">
            <div class="topic-meta">${cluster.postCount} posts · priority ${cluster.priorityScore}</div>
            <h3>${escapeText(cluster.title)}</h3>
            <p>${escapeText(cluster.excerpt || 'No excerpt available.')}</p>
          </article>
        `).join('')}
      </div>
    `;
    resultsDiv.classList.remove('hidden');
    archiveDiv.classList.add('hidden');
    settingsDiv.classList.add('hidden');
    showStatus('Archived digest loaded.', 'success');
  }

  function exportArchive() {
    if (archiveEntries.length === 0) {
      showStatus('Save at least one digest before exporting.', 'error');
      return;
    }
    const html = window.XDailyArchive.createDigestExport(archiveEntries);
    downloadHtml(html, `x-daily-archive-${new Date().toISOString().split('T')[0]}.html`);
    showStatus('Archive export prepared.', 'success');
  }

  async function clearArchive() {
    if (archiveEntries.length === 0) {
      showStatus('Archive is already empty.', 'info');
      return;
    }
    if (!window.confirm('Clear all saved X-Daily digests from this browser?')) {
      return;
    }
    archiveEntries = [];
    await storageSet('xDailyDigestArchive', archiveEntries);
    renderArchive();
    showStatus('Digest archive cleared.', 'success');
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (items) => {
        resolve(items[key]);
      });
    });
  }

  function storageSet(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  function downloadHtml(html, filename) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeText(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hasExtensionRuntime() {
    return Boolean(extensionApi.tabs && extensionApi.scripting && extensionApi.runtime);
  }

  function getExtensionApi() {
    if (window.chrome && window.chrome.storage) {
      return window.chrome;
    }
    return createLocalPreviewApi();
  }

  function createLocalPreviewApi() {
    function load(area) {
      try {
        return JSON.parse(window.localStorage.getItem(`xDaily.${area}`) || '{}');
      } catch (error) {
        return {};
      }
    }

    function save(area, data) {
      window.localStorage.setItem(`xDaily.${area}`, JSON.stringify(data));
    }

    function getValues(area, keys, callback) {
      const data = load(area);
      if (Array.isArray(keys)) {
        callback(keys.reduce((items, key) => ({ ...items, [key]: data[key] }), {}));
        return;
      }
      if (typeof keys === 'string') {
        callback({ [keys]: data[keys] });
        return;
      }
      if (keys && typeof keys === 'object') {
        callback(Object.entries(keys).reduce((items, [key, fallback]) => ({
          ...items,
          [key]: data[key] === undefined ? fallback : data[key],
        }), {}));
        return;
      }
      callback({ ...data });
    }

    function makeArea(area) {
      return {
        get(keys, callback) {
          getValues(area, keys, callback);
        },
        set(values, callback) {
          save(area, { ...load(area), ...values });
          if (callback) callback();
        },
      };
    }

    return {
      runtime: { lastError: null },
      storage: {
        local: makeArea('local'),
        sync: makeArea('sync'),
      },
    };
  }
  
  function loadSettings() {
    chrome.storage.sync.get(['xHandle', 'autoGenerate', 'emailAddress', 'numClusters'], (items) => {
      if (items.xHandle) {
        document.getElementById('xHandle').value = items.xHandle;
      }
      if (items.autoGenerate !== undefined) {
        document.getElementById('autoGenerate').checked = items.autoGenerate;
      }
      if (items.emailAddress) {
        document.getElementById('emailAddress').value = items.emailAddress;
      }
      if (items.numClusters) {
        document.getElementById('numClusters').value = items.numClusters;
      }
    });
  }
  
  function saveSettings() {
    const xHandleInput = document.getElementById('xHandle').value.trim();
    const xHandle = xHandleInput.replace('@', '').trim(); // Remove @ if user included it
    
    // Validate X handle
    if (xHandle && !/^[a-zA-Z0-9_]+$/.test(xHandle)) {
      showStatus('Invalid X handle. Use only letters, numbers, and underscores.', 'error');
      return;
    }
    
    const settings = {
      xHandle: xHandle || null,
      autoGenerate: document.getElementById('autoGenerate').checked,
      emailAddress: document.getElementById('emailAddress').value,
      numClusters: parseInt(document.getElementById('numClusters').value) || 5
    };
    
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        showStatus('Error saving settings. Please try again.', 'error');
      } else {
        showStatus('Settings saved!', 'success');
      }
    });
  }
  
  /**
   * Get the stored X handle from settings
   */
  async function getStoredXHandle() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['xHandle'], (items) => {
        resolve(items.xHandle || null);
      });
    });
  }
  
  function downloadNewsletter(html) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-daily-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async function sendNewsletterEmail(html) {
    const email = document.getElementById('emailAddress').value;
    if (!email) {
      showStatus('Please set your email address in settings.', 'error');
      return;
    }
    
    showStatus('Sending email...', 'info');
    
    // This would require a backend service or email API
    // For now, just show a message
    showStatus('Email functionality requires backend setup. Use download instead.', 'info');
  }
});
