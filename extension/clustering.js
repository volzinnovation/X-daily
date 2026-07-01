// Clustering functionality for posts
// Simplified JavaScript implementation of TF-IDF and K-Means

/**
 * Simple text vectorization using term frequency
 */
function vectorizeTexts(texts) {
  // Create vocabulary
  const vocabulary = new Set();
  texts.forEach(text => {
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      // Remove punctuation and filter short words
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        vocabulary.add(cleanWord);
      }
    });
  });
  
  const vocabArray = Array.from(vocabulary);
  
  // Vectorize each text
  const vectors = texts.map(text => {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
      }
    });
    
    // Create vector
    const vector = vocabArray.map(word => wordCounts[word] || 0);
    
    // Normalize (L2 norm)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  });
  
  return { vectors, vocabArray };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

/**
 * Simple K-Means clustering
 */
function kMeansClustering(vectors, k, maxIterations = 100) {
  if (vectors.length === 0) return [];
  if (vectors.length < k) {
    // Return each vector in its own cluster
    return vectors.map((_, i) => i);
  }
  
  const n = vectors.length;
  const dim = vectors[0].length;
  
  // Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * n);
    centroids.push([...vectors[randomIndex]]);
  }
  
  let assignments = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    let changed = false;
    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let bestSimilarity = cosineSimilarity(vectors[i], centroids[0]);
      
      for (let j = 1; j < k; j++) {
        const similarity = cosineSimilarity(vectors[i], centroids[j]);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = j;
        }
      }
      
      if (assignments[i] !== bestCluster) {
        changed = true;
        assignments[i] = bestCluster;
      }
    }
    
    if (!changed) break;
    
    // Update centroids
    for (let j = 0; j < k; j++) {
      const clusterPoints = vectors.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length === 0) continue;
      
      const newCentroid = new Array(dim).fill(0);
      clusterPoints.forEach(point => {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += point[d];
        }
      });
      
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= clusterPoints.length;
      }
      
      // Normalize
      const magnitude = Math.sqrt(newCentroid.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        centroids[j] = newCentroid.map(val => val / magnitude);
      }
    }
  }
  
  return assignments;
}

/**
 * Cluster posts by topic
 */
function clusterPosts(posts, numClusters) {
  if (posts.length === 0) return {};
  if (posts.length < numClusters) {
    return { 0: posts };
  }
  
  const texts = posts.map(p => p.clean_text || p.original_text || '');
  const { vectors } = vectorizeTexts(texts);
  
  const assignments = kMeansClustering(vectors, numClusters);
  
  // Group posts by cluster
  const clusters = {};
  assignments.forEach((clusterId, postIndex) => {
    if (!clusters[clusterId]) {
      clusters[clusterId] = [];
    }
    clusters[clusterId].push(posts[postIndex]);
  });
  
  return clusters;
}
