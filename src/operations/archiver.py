import subprocess
from pathlib import Path
from datetime import datetime

class GitArchiver:
    def __init__(self):
        self.repo_dir = Path(".").resolve()

    def run_git(self, args: list):
        try:
            result = subprocess.run(
                ["git"] + args, 
                cwd=self.repo_dir, 
                capture_output=True, 
                text=True, 
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"Git error: {e.stderr}")
            return None

    def archive_day(self):
        """
        Adds daily data to git and commits.
        """
        date_str = datetime.now().strftime("%Y-%m-%d")
        print(f"Archiving data for {date_str}...")
        
        # Add data directory content
        self.run_git(["add", "data/"])
        
        # Add generated artifacts if saved
        # self.run_git(["add", "newsletter_Archive/"])

        msg = f"Archive: Daily X scrape for {date_str}"
        self.run_git(["commit", "-m", msg])
        
        # Optional push
        # self.run_git(["push"])
        print("Archived to local git.")
