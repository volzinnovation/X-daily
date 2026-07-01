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
        
        # 1. Enter Username
        try:
            username_input = self.page.locator('input[autocomplete="username"]')
            username_input.wait_for(state="visible", timeout=10000)
            username_input.fill(config.X_USERNAME)
        except Exception as e:
            print(f"Error finding username field: {e}")
            raise

        # 2. Click Next
        # Trying a more robust approach for the "Next" button
        try:
            # Common structure: buttons often have specific roles or test-ids
            # "Next" or "Weiter" usually
            next_btn = self.page.get_by_role("button", name="Next")
            if next_btn.count() == 0:
                next_btn = self.page.get_by_role("button", name="Weiter")
            
            if next_btn.count() > 0:
                next_btn.click()
            else:
                # Fallback to text search if role fails
                self.page.get_by_text("Next").click()
        except Exception as e:
             print(f"Error clicking Next info: {e}")
             # taking a screenshot for debug could be useful here
             
        # 3. Handle Potential "Verify it's you" (Unusual Activity)
        # Sometimes X asks for email or phone number here
        try:
            # Check for the verification input field
            # It usually asks for "Phone or Email"
            # We will try to input the email (which is usually the username or a separate email if configured)
            # For this script, let's assume X_USERNAME is the handle/email or we have X_EMAIL
            
            # This input often looks like a standard text input
            verification_input = self.page.locator('input[data-testid="ocfEnterTextTextInput"]')
            
            if verification_input.count() > 0 and verification_input.is_visible():
                print("Verification step detected (Unusual Activity).")
                # We need to know what it is asking for. 
                # If we don't have a separate email config, we might retry username or fail.
                # Let's assume we proceed with X_EMAIL if available, else X_USERNAME
                verify_value = config.get("X_EMAIL", config.X_USERNAME)
                print(f"Providing verification value: {verify_value}")
                verification_input.fill(verify_value)
                
                # Click Next again
                self.page.get_by_role("button", name="Next").click()
                
        except Exception as e:
             # If this step doesn't exist, we just proceed
             pass

        # 4. Enter Password
        try:
            password_input = self.page.locator('input[name="password"]')
            password_input.wait_for(state="visible", timeout=10000)
            password_input.fill(config.X_PASSWORD)
            
            # 5. Click Log in
            login_btn = self.page.get_by_role("button", name="Log in")
            if login_btn.count() == 0:
                login_btn = self.page.get_by_role("button", name="Anmelden")
            
            if login_btn.count() > 0:
                login_btn.click()
            else:
                 self.page.get_by_test_id("LoginForm_Login_Button").click()

        except Exception as e:
             print(f"Error during password/login step: {e}")
             raise

        # Wait for home to load
        try:
            self.page.wait_for_url("https://x.com/home", timeout=20000)
            print("Login successful. Saving state...")
            self.context.storage_state(path=self.auth_file)
        except Exception:
            print("Login flow finished but did not reach home. Check if 2FA is requested or login failed.")

if __name__ == "__main__":
    # Test the auth flow
    with AuthManager() as auth:
        auth.ensure_logged_in()
        print("Auth test complete.")
