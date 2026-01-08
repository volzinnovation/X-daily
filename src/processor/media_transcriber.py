from abc import ABC, abstractmethod

class MediaTranscriber(ABC):
    @abstractmethod
    def transcribe_image(self, image_url: str) -> str:
        pass

    @abstractmethod
    def transcribe_video(self, video_url: str) -> str:
        pass

class MockTranscriber(MediaTranscriber):
    """
    Placeholder/Mock implementation until real API keys are provided.
    """
    def transcribe_image(self, image_url: str) -> str:
        return f"[Image description for {image_url}]"

    def transcribe_video(self, video_url: str) -> str:
        return f"[Video transcription for {video_url}]"
