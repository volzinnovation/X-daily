from src.scraper.utils import ScraperUtils
from src.auth_manager import AuthManager
from datetime import datetime
import urllib.parse

class SearchScraper:
    def __init__(self, auth_manager: AuthManager):
        self.auth = auth_manager
        self.page = auth_manager.page

    def get_posts_from_user(self, user_handle, since_date: str):
        """
        Searches for posts from a user since a given date (YYYY-MM-DD).
        Returns a list of dictionaries containing post data.
        """
        # Construct search query: "from:handle since:2023-01-01 -filter:replies" (optional filter)
        query = f"from:{user_handle.replace('@', '')} since:{since_date}"
        encoded_query = urllib.parse.quote(query)
        url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=live"
        
        print(f"Searching posts for {user_handle} since {since_date}...")
        self.page.goto(url, wait_until="networkidle")
        ScraperUtils.random_sleep(2, 4)

        posts = []
        last_height = self.page.evaluate("document.body.scrollHeight")
        attempts = 0
        max_attempts = 10 # Search results are usually finite for a single day

        while attempts < max_attempts:
            # X posts are <article> tags generally.
            articles = self.page.locator("article").all()
            
            for article in articles:
                try:
                    # Basic extraction
                    # We need uniqueness check (e.g., by text content or time)
                    content_text = article.locator('[data-testid="tweetText"]').inner_text()
                    
                    # Timestamp
                    time_element = article.locator("time").first
                    timestamp = time_element.get_attribute("datetime")
                    
                    # HTML content for later processing
                    html_content = article.inner_html()

                    post_data = {
                        "handle": user_handle,
                        "timestamp": timestamp,
                        "text": content_text,
                        "html": html_content
                    }
                    
                    # Simple deduplication based on text+timestamp
                    if post_data not in posts:
                         posts.append(post_data)

                except Exception:
                    # Might be an ad or promotional tweet without standard structure
                    continue
            
            print(f"Collected {len(posts)} posts so far...")

            # Scroll
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            ScraperUtils.random_sleep(2, 3)
            
            new_height = self.page.evaluate("document.body.scrollHeight")
            if new_height == last_height: 
                break # End of results
            
            last_height = new_height
            attempts += 1
            
        return posts
