import sys
from datetime import datetime, timedelta
from src.config import config
from src.auth_manager import AuthManager
from src.scraper.following import FollowingScraper
from src.scraper.search import SearchScraper
from src.database.storage import DataStorage
from src.processor.media_transcriber import MockTranscriber
from src.processor.cleaning import ContentProcessor
from src.analyzer.clustering import TopicClusterer
from src.generator.newsletter import NewsletterGenerator
from src.delivery.email_client import EmailClient
from src.operations.archiver import GitArchiver
from src.operations.storage import DataStorage

def main():
    print("Starting X-Daily Automation...")
    
    # 1. Setup & Auth
    auth = AuthManager()
    
    try:
        auth.start()
        auth.ensure_logged_in()
        
        # 2. Scrape Following
        following_scraper = FollowingScraper(auth)
        # For testing, maybe limit or just use specific handle if provided
        # target_handles = following_scraper.get_following(config.X_USERNAME)
        # print(f"Found {len(target_handles)} accounts to track.")
        
        # DEMO MODE: specific handles to avoid massive scraping in initial run
        target_handles = ["@SpaceX", "@NASA", "@OpenAI"] 
        print(f"Demo Mode: Tracking {target_handles}")

        # 3. Scrape Posts
        search_scraper = SearchScraper(auth)
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        all_raw_posts = []
        for handle in target_handles:
            posts = search_scraper.get_posts_from_user(handle, yesterday)
            all_raw_posts.extend(posts)

        print(f"Total raw posts scraped: {len(all_raw_posts)}")
        
        if not all_raw_posts:
            print("No posts found. Exiting.")
            return

        # 4. Process & Enrich
        transcriber = MockTranscriber()
        processor = ContentProcessor(transcriber)
        
        processed_posts = []
        for p in all_raw_posts:
            processed_posts.append(processor.process_post(p))
            
        # 5. Store
        storage = DataStorage()
        storage.save_posts(processed_posts)
        
        # 6. Cluster
        clusterer = TopicClusterer(num_clusters=3)
        clusters = clusterer.cluster_posts(processed_posts)
        
        # 7. Generate Newsletter
        generator = NewsletterGenerator()
        html_content = generator.generate(clusters)
        
        # Save HTML locally for debug/archive
        with open("latest_newsletter.html", "w") as f:
            f.write(html_content)
            
        # 8. Deliver
        # client = EmailClient()
        # client.send_newsletter("user_email@example.com", html_content)
        print("Newsletter generated: latest_newsletter.html")

        # 9. Archive
        archiver = GitArchiver()
        archiver.archive_day()

    except Exception as e:
        print(f"Fatal Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        auth.stop()
        print("Automation complete.")

if __name__ == "__main__":
    main()
