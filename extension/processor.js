// Post processing functions

/**
 * Process a raw post to extract and clean data
 */
function processPost(rawPost) {
  const cleanedText = cleanText(rawPost.text || '');
  
  // Extract images (already done in content script, but ensure format)
  const images = rawPost.images || [];
  
  return {
    id: rawPost.id,
    handle: rawPost.handle,
    timestamp: rawPost.timestamp,
    original_text: rawPost.text || '',
    clean_text: cleanedText,
    images: images,
    videos: rawPost.videos || []
  };
}
