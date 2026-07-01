import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from src.auth_manager import STATE_FILE_MODE

def setup_session():
    print("Starting manual login session...")
    print("The browser will open. Please log in to X (Twitter) manually.")
    print("Complete any verification puzzles or codes.")
    print("Once you reach the Home page (https://x.com/home), the script will automatically save your session and close.")

    with sync_playwright() as p:
        # Launch in headed mode so the user can interact
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            page.goto("https://x.com/i/flow/login")
            
            # Wait for the user to reach the home page (5 minutes timeout)
            print("Waiting for you to log in...")
            page.wait_for_url("https://x.com/home", timeout=300000) 
            
            print("Login detected! saving session...")
            
            # Save state
            auth_file = Path("state.json")
            context.storage_state(path=auth_file)
            os.chmod(auth_file, STATE_FILE_MODE)
            print(f"Session saved to {auth_file.absolute()}")
            
        except Exception as e:
            print(f"Error or timeout: {e}")
        finally:
            browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    setup_session()
