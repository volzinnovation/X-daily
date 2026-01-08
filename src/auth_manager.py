import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from src.config import config

class AuthManager:
    def __init__(self):
        self.auth_file = Path("state.json")
        self.browser = None
        self.context = None
        self.page = None
        self.playwright = None

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

    def start(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=config.HEADLESS)
        
        if self.auth_file.exists():
            print(f"Loading session from {self.auth_file}...")
            self.context = self.browser.new_context(storage_state=self.auth_file)
        else:
            print("No existing session found. Starting fresh context.")
            self.context = self.browser.new_context()
        
        self.page = self.context.new_page()

    def stop(self):
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def ensure_logged_in(self):
        """
        Checks if currently logged in. If not, performs login flow.
        """
        try:
            self.page.goto("https://x.com/home", wait_until="networkidle")
            # Rudimentary check: look for "What is happening?!" placeholder or profile avatar
            # If redirected to login/signup, we are not logged in.
            if "/login" in self.page.url or "/i/flow/login" in self.page.url:
                print("Redirected to login page. Performing login...")
                self.login()
            elif self.page.get_by_test_id("SideNav_AccountSwitcher_Button").count() > 0:
                print("Already logged in.")
            else:
                 # Fallback check, maybe we are on a landing page
                print("Session might be invalid or expired. Attempting to verify...")
                # Try to interact with a logged-in element or re-login
                if self.page.locator('input[autocomplete="username"]').count() > 0:
                     self.login()
        except Exception as e:
            print(f"Error checking login status: {e}")
            self.login()
            
    def login(self):
        print(f"Logging in as {config.X_USERNAME}...")
        self.page.goto("https://x.com/i/flow/login")
        
        # Enter Username
        self.page.locator('input[autocomplete="username"]').fill(config.X_USERNAME)
        self.page.get_by_text("Next").click()
        
        # Handle unusual flow: sometimes asks for phone/email verification here if unusual activity
        # implementing simple flow first
        
        try:
            # Enter Password
            self.page.locator('input[name="password"]').fill(config.X_PASSWORD)
            self.page.get_by_text("Log in").click()
        except PlaywrightTimeoutError:
             print("Timeout waiting for password field. Check manual intervention.")
             # Sometimes it asks for username again or verification
             
        # Wait for home to load
        self.page.wait_for_url("https://x.com/home", timeout=20000)
        print("Login successful. Saving state...")
        self.context.storage_state(path=self.auth_file)

if __name__ == "__main__":
    # Test the auth flow
    with AuthManager() as auth:
        auth.ensure_logged_in()
        print("Auth test complete.")
