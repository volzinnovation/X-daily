# X-Daily

An automated tool to "read" X (formerly Twitter) for you. X-Daily logs in via a headless browser, scrapes posts from your network, clusters them by topic, and delivers a daily summary newsletter.

## 🚧 Work In Progress

This project is currently under active development. Features and APIs are subject to change.

## Features

- **Automated Login**: Securely handles authentication using Playwright.
- **Content Scraping**: Fetches the latest posts from users you follow or specific lists.
- **Smart Analysis**: Clusters posts by topic using TF-IDF and K-Means (running locally).
- **Daily Digest**: Generates a clean HTML newsletter with the day's top stories.
- **Data Archival**: Commits raw data and summaries to a Git repository for permanent history.

## Getting Started

1.  **Install Dependencies**: `pip install -r requirements.txt` && `playwright install chromium`
2.  **Configure**: Copy `secrets.properties.example` to `secrets.properties` and add your credentials.
3.  **Run**: `python main.py`

## GitHub Actions Configuration

> [!IMPORTANT]
> For GitHub Actions to work (daily automated runs), you must go to your **GitHub Repository Settings -> Secrets and variables -> Actions** and add the following Repository secrets:
>
> - `X_USERNAME`
> - `X_PASSWORD`

## License

[MIT](LICENSE)
