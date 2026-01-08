from src.scraper.utils import ScraperUtils
from src.auth_manager import AuthManager

class FollowingScraper:
    def __init__(self, auth_manager: AuthManager):
        self.auth = auth_manager
        self.page = auth_manager.page

    def get_following(self, user_handle):
        """
        Navigates to the user's following page and scrapes the list of handles.
        Returns a set of unique handles (e.g., {'@elonmusk', '@nasa'}).
        """
        print(f"Scraping following list for {user_handle}...")
        url = f"https://x.com/{user_handle}/following"
        self.page.goto(url, wait_until="networkidle")
        ScraperUtils.random_sleep(2, 4)

        following_handles = set()
        last_height = self.page.evaluate("document.body.scrollHeight")
        attempts = 0
        max_attempts = 50 # Limit scrolling to avoid infinite loops if something breaks

        while attempts < max_attempts:
            # Scrape visible user cells
            # X user cells usually have a specific data-testid or structure.
            # A robust way is looking for 'UserCell' testid
            cells = self.page.get_by_test_id("UserCell").all()
            
            for cell in cells:
                try:
                    # Extract handle, usually starts with @
                    text = cell.inner_text()
                    lines = text.split('\n')
                    for line in lines:
                        if line.startswith('@'):
                            following_handles.add(line.strip())
                            break
                except Exception:
                    continue

            print(f"Refreshed count: {len(following_handles)}")

            # Scroll down
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            ScraperUtils.random_sleep(2, 4)
            
            # Check if we reached bottom
            new_height = self.page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                # Try waiting a bit more to see if it loads
                ScraperUtils.random_sleep(2, 4)
                new_height = self.page.evaluate("document.body.scrollHeight")
                if new_height == last_height:
                    print("Reached bottom of following list.")
                    break
            
            last_height = new_height
            attempts += 1
            
        return list(following_handles)
