import { db } from "@/lib/db";
import { YoutubeTranscript } from "@/lib/youtube-transcript-src/index";
import { TranscriptStatus, VideoProvider } from "@/lib/generated/db";

export const transcribeYouTubeVideo = async (url: string): Promise<string> => {
  try {
    const transcriptLines = await YoutubeTranscript.fetchTranscript(url, { lang: 'pt' });
    // Fallback to auto-generated if pt is not available may happen automatically,
    // or we might just fetch whatever is default if pt fails.
    // For now we just join the text.
    return transcriptLines.map((t: any) => t.text).join(" ");
  } catch (error) {
    console.error("[YOUTUBE_TRANSCRIPT_ERROR]", error);
    // try fetching without specific language as fallback
    try {
      const fallback = await YoutubeTranscript.fetchTranscript(url);
      return fallback.map((t: any) => t.text).join(" ");
    } catch (fallbackError) {
      console.error("[YOUTUBE_TRANSCRIPT_FALLBACK_ERROR]", fallbackError);
      throw new Error("Could not fetch transcript for this video.");
    }
  }
};

export const startTranscription = async (
  chapterId: string, 
  videoProvider: VideoProvider, 
  externalUrl?: string | null
) => {
  try {
    // Determine if we can transcribe
    if (videoProvider !== VideoProvider.YOUTUBE || !externalUrl) {
      // Not youtube, mark as NOT_AVAILABLE
      await db.chapter.update({
        where: { id: chapterId },
        data: { transcriptStatus: TranscriptStatus.NOT_AVAILABLE }
      });
      return;
    }

    // Set status to PROCESSING
    await db.chapter.update({
      where: { id: chapterId },
      data: { transcriptStatus: TranscriptStatus.PROCESSING }
    });

    // Transcribe
    const transcriptText = await transcribeYouTubeVideo(externalUrl);

    if (!transcriptText || transcriptText.trim() === "") {
      throw new Error("Transcript is empty");
    }

    // Save and mark COMPLETED
    await db.chapter.update({
      where: { id: chapterId },
      data: { 
        transcript: transcriptText,
        transcriptStatus: TranscriptStatus.COMPLETED 
      }
    });

  } catch (error) {
    console.error("[START_TRANSCRIPTION_ERROR]", error);
    // Mark as FAILED
    await db.chapter.update({
      where: { id: chapterId },
      data: { transcriptStatus: TranscriptStatus.FAILED }
    });
  }
};
