// Content script for X-Daily extension
// Runs on x.com pages to extract data and interact with the page

console.log('X-Daily content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action, request);
  
  // Handle ping for connection check
  if (request.action === 'ping') {
    console.log('Ping received, sending pong');
    try {
      const response = { success: true, pong: true };
      sendResponse(response);
      console.log('Pong sent:', response);
      return false; // Synchronous response
    } catch (e) {
      console.error('Error sending pong:', e);
      return false;
    }
  }
  
  if (request.action === 'getFollowingFromPage') {
    getFollowingFromPage()
      .then(accounts => sendResponse({ success: true, accounts }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getPostsFromPage') {
    getPostsFromPage(request.username, request.sinceDate)
      .then(posts => sendResponse({ success: true, posts }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getPostsFromHomeTimeline') {
    console.log('getPostsFromHomeTimeline message received at', new Date().toISOString());
    
    // Keep a reference to sendResponse
    let responseSent = false;
    const safeSendResponse = (response) => {
      if (!responseSent) {
        responseSent = true;
        try {
          console.log('Sending response:', response);
          const result = sendResponse(response);
          console.log('sendResponse result:', result);
          return result;
        } catch (e) {
          console.error('Error sending response (channel may be closed):', e);
          return false;
        }
      }
      return false;
    };
    
    // Start the operation
    const startTime = Date.now();
    getPostsFromHomeTimeline(request.sinceDate, request.accountFilter)
      .then(posts => {
        const duration = Date.now() - startTime;
        console.log(`getPostsFromHomeTimeline completed in ${duration}ms, posts:`, posts.length);
        const sent = safeSendResponse({ success: true, posts });
        if (!sent) {
          console.error('Failed to send response - channel may be closed');
        }
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        console.error(`Error in getPostsFromHomeTimeline after ${duration}ms:`, error);
        const sent = safeSendResponse({ success: false, error: error.message });
        if (!sent) {
          console.error('Failed to send error response - channel may be closed');
        }
      });
    
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCurrentUserId') {
    const userId = getCurrentUserId();
    sendResponse({ success: true, userId });
    return true;
  }
  
  if (request.action === 'getCurrentUsername') {
    const username = extractUsernameFromPage();
    sendResponse({ success: true, username });
    return true;
  }
});

/**
 * Extract list of accounts the user follows from the current page
 */
async function getFollowingFromPage() {
  const accounts = new Set();
  
  // Check if we're on the following page
  const currentUrl = window.location.href;
  if (!currentUrl.includes('/following')) {
    // Try to find and click the following link, or construct URL
    const username = extractUsernameFromPage();
    if (username) {
      // Don't navigate - instead return an error asking user to navigate
      throw new Error(`Please navigate to your following page first: https://x.com/${username}/following. Then try again.`);
    } else {
      throw new Error('Please navigate to your X.com following page (x.com/[your-username]/following) first, then try again.');
    }
  }
  
  // Wait a bit for page to fully load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Scroll and collect following accounts
  let lastHeight = document.body.scrollHeight;
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    // Find user cells - X uses data-testid="UserCell" or similar
    // Try multiple selectors as X's structure may vary
    let userCells = document.querySelectorAll('[data-testid="UserCell"]');
    
    // Fallback selectors
    if (userCells.length === 0) {
      userCells = document.querySelectorAll('[data-testid="User-Name"]');
    }
    if (userCells.length === 0) {
      // Try finding by article elements with user info
      userCells = document.querySelectorAll('article[role="article"]');
    }
    
    userCells.forEach(cell => {
      const text = cell.innerText;
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('@')) {
          accounts.add(line.trim());
        }
      }
      
      // Also try to find username in links
      const links = cell.querySelectorAll('a[href*="/"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && !href.includes('/i/')) {
          const match = href.match(/^\/([^\/\?]+)/);
          if (match && match[1] && match[1] !== 'home' && match[1] !== 'explore' && match[1] !== 'notifications') {
            accounts.add(`@${match[1]}`);
          }
        }
      });
    });
    
    // Scroll down
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we've reached the bottom
    const newHeight = document.body.scrollHeight;
    if (newHeight === lastHeight) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const finalHeight = document.body.scrollHeight;
      if (finalHeight === lastHeight) {
        break;
      }
    }
    lastHeight = newHeight;
    attempts++;
  }
  
  const accountArray = Array.from(accounts);
  if (accountArray.length === 0) {
    throw new Error('No following accounts found. Make sure you are on your following page and have accounts you follow.');
  }
  
  return accountArray;
}

/**
 * Extract posts from a user's profile page
 */
async function getPostsFromPage(username, sinceDate) {
  const screenName = username.replace('@', '');
  const posts = [];
  
  // Check if we're on the right page
  const currentUrl = window.location.href;
  const isOnProfile = currentUrl.includes(`/${screenName}`) && 
                      !currentUrl.includes('/following') && 
                      !currentUrl.includes('/followers') &&
                      !currentUrl.includes('/status/');
  
  if (!isOnProfile) {
    // The popup will handle navigation, but if we're not on the right page, wait a bit
    // in case navigation is still in progress
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newUrl = window.location.href;
    const isOnProfileAfterWait = newUrl.includes(`/${screenName}`) && 
                                 !newUrl.includes('/following') && 
                                 !newUrl.includes('/followers') &&
                                 !newUrl.includes('/status/');
    
    if (!isOnProfileAfterWait) {
      throw new Error(`Not on profile page for ${screenName}. Current URL: ${newUrl}`);
    }
  }
  
  // Wait for page to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Parse sinceDate to compare timestamps
  const sinceTimestamp = new Date(sinceDate).getTime();
  
  // Scroll and collect posts (limit attempts to avoid timeout)
  let lastHeight = document.body.scrollHeight;
  let attempts = 0;
  const maxAttempts = 10; // Reduced to avoid timeout
  let foundOldPost = false;
  const seenPostIds = new Set();
  
  while (attempts < maxAttempts && !foundOldPost) {
    // Find tweet articles - X uses article[data-testid="tweet"]
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweetElements.forEach(article => {
      try {
        const post = extractPostFromElement(article, screenName);
        if (post && post.id && !seenPostIds.has(post.id)) {
          seenPostIds.add(post.id);
          const postTimestamp = new Date(post.timestamp).getTime();
          if (postTimestamp >= sinceTimestamp) {
            posts.push(post);
          } else {
            foundOldPost = true;
          }
        }
      } catch (error) {
        console.error('Error extracting post:', error);
      }
    });
    
    // Scroll down
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time
    
    // Check if we've reached the bottom or found old posts
    const newHeight = document.body.scrollHeight;
    if (newHeight === lastHeight || foundOldPost) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time
      const finalHeight = document.body.scrollHeight;
      if (finalHeight === lastHeight || foundOldPost) {
        break;
      }
    }
    lastHeight = newHeight;
    attempts++;
  }
  
  return posts;
}

/**
 * Extract post data from a tweet article element
 */
function extractPostFromElement(article, username) {
  try {
    // Extract text
    const textElement = article.querySelector('[data-testid="tweetText"]');
    const text = textElement ? textElement.innerText : '';
    
    // Extract timestamp
    const timeElement = article.querySelector('time');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();
    
    // Extract post ID from link
    const linkElement = article.querySelector('a[href*="/status/"]');
    const postId = linkElement ? linkElement.href.match(/\/status\/(\d+)/)?.[1] : Date.now().toString();
    
    // Extract images
    const images = [];
    const imageElements = article.querySelectorAll('img[src*="pbs.twimg.com"]');
    imageElements.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('profile_images') && !src.includes('emoji')) {
        // Get full resolution image URL
        const fullSrc = src.replace(/&name=\w+/, '').replace(/\?format=\w+/, '');
        if (!images.includes(fullSrc)) {
          images.push(fullSrc);
        }
      }
    });
    
    return {
      id: postId,
      handle: `@${username}`,
      text: text,
      timestamp: timestamp,
      html: text, // Simplified
      images: images
    };
  } catch (error) {
    console.error('Error extracting post:', error);
    return null;
  }
}

/**
 * Extract posts from home timeline (all accounts you follow)
 * This is more efficient than fetching from individual profiles
 */
async function getPostsFromHomeTimeline(sinceDate, accountFilter = null) {
  const posts = [];
  
  console.log('getPostsFromHomeTimeline called, current URL:', window.location.href);
  
  // Wait a bit first in case we're still navigating (reduced wait time)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if we're on home timeline - be more lenient with the check
  const currentUrl = window.location.href;
  const isOnHome = currentUrl.includes('x.com/home') || 
                    currentUrl === 'https://x.com/' || 
                    currentUrl === 'https://x.com/home' ||
                    currentUrl === 'https://twitter.com/home' ||
                    currentUrl === 'https://twitter.com/' ||
                    (currentUrl.includes('x.com') && !currentUrl.match(/\/[^\/]+\/[^\/]+/) && 
                     !currentUrl.includes('/following') && 
                     !currentUrl.includes('/followers') &&
                     !currentUrl.includes('/status/') &&
                     !currentUrl.includes('/i/') &&
                     !currentUrl.includes('/messages')); // x.com or x.com/something but not specific pages
  
  console.log('Is on home timeline?', isOnHome, 'URL:', currentUrl);
  
  if (!isOnHome) {
    // Try to wait a bit more in case we're still navigating
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newUrl = window.location.href;
    const isOnHomeAfterWait = newUrl.includes('x.com/home') || 
                              newUrl === 'https://x.com/' || 
                              newUrl === 'https://x.com/home' ||
                              newUrl === 'https://twitter.com/home' ||
                              newUrl === 'https://twitter.com/';
    
    console.log('After wait, URL:', newUrl, 'Is on home?', isOnHomeAfterWait);
    
    if (!isOnHomeAfterWait) {
      throw new Error(`Please navigate to your X.com home timeline (x.com/home) first, then try again. Current URL: ${newUrl}`);
    }
  }
  
  // Wait for page to be ready and content to load (reduced wait time)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if tweets are visible on the page
  let tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
  console.log('Found', tweetElements.length, 'tweet elements on page');
  
  if (tweetElements.length === 0) {
    // Wait a bit more for content to load (reduced wait time)
    await new Promise(resolve => setTimeout(resolve, 1000));
    tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    console.log('After wait, found', tweetElements.length, 'tweet elements');
    if (tweetElements.length === 0) {
      // Don't throw error, just log and continue - might be a loading issue
      console.warn('No tweets found on the page yet. Continuing anyway...');
    }
  }
  
  // Parse sinceDate to compare timestamps
  const sinceTimestamp = new Date(sinceDate).getTime();
  
  // Create a set to track which accounts we want (if filtering)
  const accountSet = accountFilter ? new Set(accountFilter.map(acc => acc.replace('@', '').toLowerCase())) : null;
  
  // Scroll and collect posts (limit attempts to avoid timeout)
  let lastHeight = document.body.scrollHeight;
  let attempts = 0;
  const maxAttempts = 3; // Very reduced to avoid timeout - just get what's visible
  let foundOldPost = false;
  const seenPostIds = new Set();
  
  console.log('Starting to collect posts from home timeline, max attempts:', maxAttempts, 'sinceDate:', sinceDate);
  
  while (attempts < maxAttempts && !foundOldPost) {
    // Find tweet articles - X uses article[data-testid="tweet"]
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    console.log(`Attempt ${attempts + 1}/${maxAttempts}: Found ${tweetElements.length} tweet elements, have ${posts.length} posts so far`);
    
    tweetElements.forEach(article => {
      try {
        // Extract username from the tweet
        const userLink = article.querySelector('a[href*="/"][role="link"]');
        let username = null;
        if (userLink) {
          const href = userLink.getAttribute('href');
          const match = href.match(/^\/([^\/\?]+)/);
          if (match && match[1] && match[1] !== 'home' && match[1] !== 'explore' && match[1] !== 'notifications') {
            username = match[1].toLowerCase();
          }
        }
        
        // If filtering by accounts, skip if not in our list
        if (accountSet && username && !accountSet.has(username)) {
          return;
        }
        
        // Extract post data
        const post = extractPostFromElement(article, username || 'unknown');
        if (post && post.id && !seenPostIds.has(post.id)) {
          seenPostIds.add(post.id);
          
          const postTimestamp = new Date(post.timestamp).getTime();
          if (postTimestamp >= sinceTimestamp) {
            posts.push(post);
          } else {
            foundOldPost = true;
          }
        }
      } catch (error) {
        console.error('Error extracting post from timeline:', error);
      }
    });
    
    // Scroll down
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 500)); // Further reduced
    
    // Check if we've reached the bottom or found old posts
    const newHeight = document.body.scrollHeight;
    if (newHeight === lastHeight || foundOldPost) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Further reduced
      const finalHeight = document.body.scrollHeight;
      if (finalHeight === lastHeight || foundOldPost) {
        console.log('Reached bottom or found old post, breaking');
        break;
      }
    }
    lastHeight = newHeight;
    attempts++;
  }
  
  return posts;
}

/**
 * Extract current username from page
 */
function extractUsernameFromPage() {
  // Try to find username in various places
  const urlMatch = window.location.pathname.match(/^\/([^\/]+)/);
  if (urlMatch && urlMatch[1] && urlMatch[1] !== 'home' && urlMatch[1] !== 'explore') {
    return urlMatch[1];
  }
  
  // Try to find in page content
  const profileLink = document.querySelector('a[href*="/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/^\/([^\/]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get current user ID from page data
 */
function getCurrentUserId() {
  // X stores user data in window.__INITIAL_STATE__ or similar
  // Try to extract from various sources
  if (window.__INITIAL_STATE__) {
    return window.__INITIAL_STATE__.user?.id;
  }
  
  // Try to find in meta tags or data attributes
  const userData = document.querySelector('[data-user-id]');
  if (userData) {
    return userData.getAttribute('data-user-id');
  }
  
  return null;
}
