import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

def load_properties(filepath, sep="=", comment_char="#"):
    """
    Read the file passed as parameter as a properties file.
    """
    props = {}
    with open(filepath, "rt") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith(comment_char) or sep not in stripped:
                continue

            key, value = stripped.split(sep, 1)
            props[key.strip()] = value.strip().strip('"')
    return props

class Config:
    def __init__(self, secrets_path=None, *, warn_on_missing=True):
        self.secrets_path = Path(secrets_path) if secrets_path else BASE_DIR / "secrets.properties"
        self.warn_on_missing = warn_on_missing
        self._secrets = {}
        self._load_secrets()

    def _load_secrets(self):
        if self.secrets_path.exists():
            self._secrets = load_properties(self.secrets_path)
        elif self.warn_on_missing:
            print(f"Warning: {self.secrets_path} not found.")

    def get(self, key, default=None):
        env_value = os.getenv(key)
        if env_value is not None:
            return env_value
        return self._secrets.get(key, default)

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
