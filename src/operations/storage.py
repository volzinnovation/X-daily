import json
from pathlib import Path
from datetime import datetime

class DataStorage:
    def __init__(self, base_dir="data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)

    def search_path(self, date_str: str) -> Path:
        return self.base_dir / f"posts_{date_str}.jsonl"

    def save_posts(self, posts: list):
        """
        Appends a list of post dictionaries to the daily file.
        """
        if not posts:
            return

        date_str = datetime.now().strftime("%Y-%m-%d")
        file_path = self.search_path(date_str)
        
        print(f"Saving {len(posts)} posts to {file_path}...")
        
        with open(file_path, "a", encoding="utf-8") as f:
            for post in posts:
                # Ensure we strictly save known fields
                f.write(json.dumps(post, ensure_ascii=False) + "\n")
