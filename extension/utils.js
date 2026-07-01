// Utility functions for X-Daily extension

/**
 * Clean text content from a post
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove extra whitespace
  let cleaned = text.trim();
  
  // Remove URLs (optional - might want to keep them)
  // cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove @mentions (optional)
  // cleaned = cleaned.replace(/@\w+/g, '');
  
  // Remove #hashtags (optional)
  // cleaned = cleaned.replace(/#\w+/g, '');
  
  return cleaned;
}

/**
 * Extract date from timestamp
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
