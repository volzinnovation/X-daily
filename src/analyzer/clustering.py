from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import numpy as np

class TopicClusterer:
    def __init__(self, num_clusters=5):
        self.num_clusters = num_clusters

    def cluster_posts(self, posts: list) -> dict:
        """
        Groups posts into clusters based on text similarity.
        Returns a dict: {cluster_id: [post1, post2, ...]}
        """
        if not posts:
            return {}
            
        texts = [p['clean_text'] for p in posts]
        if len(texts) < self.num_clusters:
            # Not enough data to cluster meaningfully, return single cluster
            return {0: posts}
            
        # Vectorize
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        X = vectorizer.fit_transform(texts)
        
        # Cluster
        kmeans = KMeans(n_clusters=self.num_clusters, random_state=42, n_init=10)
        kmeans.fit(X)
        
        # Group
        clusters = {}
        for idx, label in enumerate(kmeans.labels_):
            label = int(label)
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(posts[idx])
            
        return clusters

    def summarize_cluster(self, cluster_posts: list) -> str:
        """
        Simple summary by picking the specific post that is closest to centroid? 
        Or just the first one for now.
        """
        if not cluster_posts:
            return "Empty Topic"
        # In a real implementation, would use LLM to summarize
        return f"Topic related to: {cluster_posts[0]['clean_text'][:50]}..."
