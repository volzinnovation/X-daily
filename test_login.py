import sys
import os
 
# Add project root to sys.path
sys.path.append(os.getcwd())

from src.auth_manager import AuthManager

if __name__ == "__main__":
    print("Running login test...")
    try:
        with AuthManager() as auth:
            # Force a fresh login attempt by clearing/ignoring existing state if possible,
            # but AuthManager uses state.json by default.
            # To test login logic thoroughly, we might want to temporarily rename state.json or just rely on ensure_logged_in 
            # handling the case where it's not logged in.
            
            # For this test, let's just run ensure_logged_in. If it's already logged in, it prints "Already logged in".
            # If we want to force login, we would need to delete state.json.
            
            if os.path.exists("state.json"):
                print("Note: state.json exists. If valid, login flow might be skipped.")
                # Optional: os.remove("state.json") # Uncomment to force fresh login
                
            auth.ensure_logged_in()
            print("Login test passed!")
    except Exception as e:
        print(f"Login test failed: {e}")
        import traceback
        traceback.print_exc()
