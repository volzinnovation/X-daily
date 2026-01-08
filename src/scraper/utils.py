import time
import random
from playwright.sync_api import Page

class ScraperUtils:
    @staticmethod
    def random_sleep(min_seconds=1.0, max_seconds=3.0):
        """
        Sleeps for a random amount of time to mimic human behavior.
        """
        sleep_time = random.uniform(min_seconds, max_seconds)
        time.sleep(sleep_time)

    @staticmethod
    def human_scroll(page: Page, speed=100):
        """
        Scrolls the page down slightly to trigger lazy loading.
        """
        page.mouse.wheel(0, speed)
        ScraperUtils.random_sleep(0.5, 1.5)

    @staticmethod
    def safe_click(page: Page, selector: str):
        try:
            page.locator(selector).click()
            ScraperUtils.random_sleep()
        except Exception as e:
            print(f"Error clicking {selector}: {e}")
