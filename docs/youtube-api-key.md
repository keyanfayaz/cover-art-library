# Setting up a YouTube Data API v3 key

The music player searches YouTube for a video that matches each album you click.
Searches go through the official Data API v3, which requires a free API key.

The free quota is **10,000 units/day**; one search costs 100 units, so you can
play ~100 different albums per day before bumping the limit.

## Steps (≈5 minutes)

1. Open the Google Cloud Console and create or pick a project:
   <https://console.cloud.google.com/>.
2. Enable the YouTube Data API v3 for that project:
   <https://console.cloud.google.com/apis/library/youtube.googleapis.com>
   → **Enable**.
3. Go to **APIs & Services → Credentials** →
   **Create credentials → API key**.
4. Copy the key. (Optional but recommended:
   click **Restrict key → API restrictions → YouTube Data API v3**
   so the key is only usable for this one API.)
5. In the project root, create a file called `.env.local`:

   ```env
   VITE_YOUTUBE_API_KEY=ya...your-key-here...
   ```

6. Restart `npm run dev`.

Click any placed album sleeve — the record will fly onto the turntable and
audio will play through the hidden iframe.

## Notes

- `.env.local` is git-ignored by default with Vite, so your key stays local.
- The key is exposed to the browser (it has to be — the search runs in the
  client). For local-only use that's fine. For a public deploy, restrict the
  key by HTTP referrer in the Google Cloud Console so only your domain can
  use it.
- If the player surfaces `quotaExceeded`, you've burned through the day's
  10,000 units. The quota resets at midnight Pacific time.
