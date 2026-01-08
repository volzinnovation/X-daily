from src.config import config
from src.auth_manager import AuthManager
import sys

def check_environment():
    print("Checking environment...")
    
    # Check config
    if config.X_USERNAME == "my_handle":
        print("[WARN] It looks like you haven't configured 'secrets.properties' yet.")
        print("       Please copy 'secrets.properties.example' to 'secrets.properties' and edit it.")
    else:
        print(f"[OK] Configuration loaded for user: {config.X_USERNAME}")
        
    # Check Playwright
    try:
        from playwright.sync_api import sync_playwright
        print("[OK] Playwright installed.")
    except ImportError:
        print("[FAIL] Playwright not installed. Run 'pip install -r requirements.txt'")
        return False
        
    return True

def verify_browser_launch():
    print("\nVerifying browser launch (Headless: {})...".format(config.HEADLESS))
    try:
        with AuthManager() as auth:
            print("[OK] Browser launched successfully.")
            print(f"[INFO] Navigate to: {auth.page.url if auth.page else 'None'}")
            auth.ensure_logged_in()
            print("[OK] Authentication flow check passed (This did not strictly verify login success, just the flow).")
    except Exception as e:
        print(f"[FAIL] Browser launch failed: {e}")
        return False
    return True

if __name__ == "__main__":
    if check_environment():
        verify_browser_launch()
