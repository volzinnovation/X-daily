import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

def load_properties(filepath, sep='=', comment_char='#'):
    """
    Read the file passed as parameter as a properties file.
    """
    props = {}
    with open(filepath, "rt") as f:
        for line in f:
            l = line.strip()
            if l and not l.startswith(comment_char):
                key_value = l.split(sep)
                key = key_value[0].strip()
                value = sep.join(key_value[1:]).strip().strip('"') 
                props[key] = value 
    return props

class Config:
    def __init__(self):
        self.secrets_path = BASE_DIR / "secrets.properties"
        self._secrets = {}
        self._load_secrets()

    def _load_secrets(self):
        if self.secrets_path.exists():
            self._secrets = load_properties(self.secrets_path)
        else:
            print(f"Warning: {self.secrets_path} not found.")

    def get(self, key, default=None):
        return self._secrets.get(key, os.getenv(key, default))

    @property
    def X_USERNAME(self):
        return self.get("X_USERNAME")

    @property
    def X_PASSWORD(self):
        return self.get("X_PASSWORD")

    @property
    def HEADLESS(self):
        return self.get("HEADLESS", "true").lower() == "true"

config = Config()
