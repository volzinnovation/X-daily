import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.config import config

class EmailClient:
    def __init__(self):
        # We need to add SMTP config to config.py ideally, but mocking for now
        # or assuming standard env vars
        self.smtp_server = config.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(config.get("SMTP_PORT", 587))
        self.username = config.get("SMTP_USERNAME")
        self.password = config.get("SMTP_PASSWORD")

    def send_newsletter(self, to_email: str, html_content: str):
        if not self.username or not self.password:
            print("[WARN] SMTP credentials not set. Skipping email.")
            return

        print(f"Sending newsletter to {to_email}...")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"X-Daily Update: {config.X_USERNAME}"
        msg["From"] = self.username
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.username, to_email, msg.as_string())
            print("Email sent successfully.")
        except Exception as e:
            print(f"Failed to send email: {e}")
