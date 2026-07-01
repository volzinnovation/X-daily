// Background service worker for X-Daily extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('X-Daily extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookies') {
    // Get cookies for x.com to use for API requests
    chrome.cookies.getAll({ domain: 'x.com' }, (cookies) => {
      sendResponse({ cookies: cookies });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchFollowing') {
    fetchFollowingAccounts()
      .then(accounts => sendResponse({ success: true, accounts }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'fetchPosts') {
    fetchPostsFromAccounts(request.accounts, request.sinceDate)
      .then(posts => sendResponse({ success: true, posts }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Fetch list of accounts the user follows
 */
async function fetchFollowingAccounts() {
  const cookies = await getCookies();
  const authToken = extractAuthToken(cookies);
  
  if (!authToken) {
    throw new Error('Not authenticated. Please log in to X.com first.');
  }
  
  // Use X's GraphQL API to fetch following list
  const userId = await getUserId(authToken, cookies);
  const following = await getFollowingList(userId, authToken, cookies);
  
  return following;
}

/**
 * Fetch posts from specified accounts since a given date
 */
async function fetchPostsFromAccounts(accounts, sinceDate) {
  const cookies = await getCookies();
  const authToken = extractAuthToken(cookies);
  
  if (!authToken) {
    throw new Error('Not authenticated. Please log in to X.com first.');
  }
  
  const allPosts = [];
  
  for (const account of accounts) {
    try {
      const posts = await getPostsFromUser(account, sinceDate, authToken, cookies);
      allPosts.push(...posts);
    } catch (error) {
      console.error(`Error fetching posts from ${account}:`, error);
    }
  }
  
  return allPosts;
}

/**
 * Get cookies for x.com
 */
function getCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: 'x.com' }, (cookies) => {
      resolve(cookies);
    });
  });
}

/**
 * Extract auth token from cookies
 */
function extractAuthToken(cookies) {
  // X uses 'auth_token' cookie for authentication
  const authCookie = cookies.find(c => c.name === 'auth_token');
  return authCookie ? authCookie.value : null;
}

/**
 * Get user ID from API
 */
async function getUserId(authToken, cookies) {
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  const response = await fetch('https://api.x.com/1.1/account/verify_credentials.json', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    // Try alternative method using GraphQL
    return await getUserIdFromGraphQL(authToken, cookies);
  }
  
  const data = await response.json();
  return data.id_str;
}

/**
 * Get user ID using GraphQL (X's current API)
 */
async function getUserIdFromGraphQL(authToken, cookies) {
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  // X uses GraphQL endpoints - this is a simplified version
  // In practice, you'd need to reverse engineer the exact GraphQL queries
  const query = {
    query: `
      query UserByScreenName($screenName: String!) {
        user: userByScreenName(screen_name: $screenName) {
          id
        }
      }
    `,
    variables: {}
  };
  
  // For now, we'll use a different approach - get it from the current page
  // This will be handled by the content script
  throw new Error('GraphQL API method not fully implemented. Please use the content script method by navigating to your X.com following page.');
}

/**
 * Get following list using GraphQL
 */
async function getFollowingList(userId, authToken, cookies) {
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  // X's GraphQL endpoint for following
  // This is a simplified version - actual implementation may vary
  const url = `https://api.x.com/graphql/UserFollowing?userId=${userId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Cookie': cookieString,
      'Content-Type': 'application/json',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch following: ${response.status}`);
  }
  
  const data = await response.json();
  // Parse the response to extract usernames
  // The actual structure depends on X's API response
  return parseFollowingResponse(data);
}

/**
 * Get posts from a specific user since a date
 */
async function getPostsFromUser(username, sinceDate, authToken, cookies) {
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  // Remove @ if present
  const screenName = username.replace('@', '');
  
  // Use X's API to get user timeline
  // Note: X's API structure may have changed, this is a template
  const url = `https://api.x.com/2/tweets/search/recent?query=from:${screenName}&start_time=${sinceDate}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    // Fallback: use content script to scrape from the page
    throw new Error(`API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  return parsePostsResponse(data, screenName);
}

/**
 * Parse following response from X API
 */
function parseFollowingResponse(data) {
  // This depends on the actual API response structure
  // For now, return empty array - will be handled by content script
  return [];
}

/**
 * Parse posts response from X API
 */
function parsePostsResponse(data, username) {
  const posts = [];
  
  if (data.data && Array.isArray(data.data)) {
    for (const tweet of data.data) {
      posts.push({
        id: tweet.id,
        handle: `@${username}`,
        text: tweet.text,
        timestamp: tweet.created_at,
        html: tweet.text, // Simplified
        images: tweet.attachments?.media_keys?.map(key => 
          data.includes?.media?.find(m => m.media_key === key)?.url
        ).filter(Boolean) || []
      });
    }
  }
  
  return posts;
}
