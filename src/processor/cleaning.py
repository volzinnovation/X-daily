from bs4 import BeautifulSoup
from src.processor.media_transcriber import MediaTranscriber

class ContentProcessor:
    def __init__(self, transcriber: MediaTranscriber):
        self.transcriber = transcriber

    def process_post(self, raw_post: dict) -> dict:
        """
        Cleans text, extracts and transcribes media from HTML.
        """
        html = raw_post.get("html", "")
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract images
        images = []
        image_tags = soup.find_all("img")
        for img in image_tags:
            src = img.get("src")
            # Filter emoji or tiny icons based on src/class if needed
            if src and "emoji" not in src:
                images.append(src)
        
        # Mock Video extraction (usually <video> or special div)
        videos = []
        video_tags = soup.find_all("video")
        for vid in video_tags:
            src = vid.get("src") or vid.get("poster") # Simplification
            if src:
                videos.append(src)

        # Transcribe
        transcriptions = []
        for img_url in images:
            description = self.transcriber.transcribe_image(img_url)
            transcriptions.append(f"Image: {description}")
            
        for vid_url in videos:
            description = self.transcriber.transcribe_video(vid_url)
            transcriptions.append(f"Video: {description}")

        # Combine logic
        cleaned_text = raw_post.get("text", "")
        if transcriptions:
            cleaned_text += "\n\n[Multimedia Content]\n" + "\n".join(transcriptions)

        return {
            "handle": raw_post["handle"],
            "timestamp": raw_post["timestamp"],
            "original_text": raw_post.get("text", ""),
            "clean_text": cleaned_text,
            "images": images,
            "videos": videos
        }
