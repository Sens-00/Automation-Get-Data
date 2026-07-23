import json
import os
import time
from playwright.sync_api import sync_playwright
import redis
import requests

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:5000')

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

print('Python Automation Worker is running and waiting for jobs...')


def process_youtube_scroll(duration):
  videos = []
  start_time = time.time()

  with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
    )
    context = browser.new_context(
        user_agent=(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ' (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
    )
    page = context.new_page()

    print(
        f'[LOG] Navigating to YouTube Shorts for duration {duration} seconds...'
    )

    # FIX #3: Use 'domcontentloaded' instead of 'networkidle' to prevent timeouts on streaming media
    page.goto(
        'https://www.youtube.com/shorts',
        wait_until='domcontentloaded',
        timeout=30000,
    )
    page.wait_for_selector('ytd-reel-video-renderer', timeout=15000)
    time.sleep(3)

    seen_urls = set()

    while (time.time() - start_time) < duration:
      try:
        current_url = page.url

        # FIX #2: Scope searches to the active Shorts container on screen
        active_reel = page.query_selector(
            'ytd-reel-video-renderer[is-active]'
        )
        target = active_reel if active_reel else page

        title_elem = target.query_selector(
            'h2.yt-shorts-video-title-model, h2.title,'
            ' span.reel-player-header-renderer'
        )
        title = (
            title_elem.inner_text().strip()
            if title_elem
            else 'YouTube Short Video'
        )

        channel_elem = target.query_selector('a[href*="/@"]')
        channel = (
            channel_elem.inner_text().strip()
            if channel_elem
            else 'Unknown Channel'
        )

        if current_url not in seen_urls and '/shorts/' in current_url:
          seen_urls.add(current_url)
          videos.append({
              'title': title,
              'channel': channel,
              'url': current_url,
              'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
          })
          print(f'[LOG] Scraped Video: {title} ({channel})')

        # Scroll down
        page.keyboard.press('ArrowDown')
        time.sleep(3)
      except Exception as e:
        print(f'[LOG ERROR] Error during scroll step: {e}')
        time.sleep(2)

    actual_duration = round(time.time() - start_time, 2)
    browser.close()

    return {
        'status': 'completed',
        'actual_duration': actual_duration,
        'videos': videos,
    }


def send_callback(
    job_id, status, actual_duration, video_data, error_message=None
):
  payload = {
      'jobId': job_id,
      'status': status,
      'actual_duration': actual_duration,
      'video_data': video_data,
      'error_message': error_message,
  }
  try:
    res = requests.post(
        f'{BACKEND_URL}/api/internal/jobs/callback', json=payload
    )
    print(
        f'[LOG] Callback sent for Job #{job_id}. Response: {res.status_code}'
    )
  except Exception as e:
    print(f'[LOG ERROR] Failed to send callback to backend: {e}')


# Worker Loop
while True:
  try:
    item = r.brpop('shorts_queue', timeout=5)
    if item:
      queue_name, payload_raw = item
      job = json.loads(payload_raw.decode('utf-8'))
      job_id = job['jobId']
      duration = job['duration']

      print(f'[LOG] Processing Job #{job_id} with duration {duration}s...')

      # Notify backend: status = processing
      send_callback(job_id, 'processing', 0, [])

      # FIX #1: Catch scraper-specific errors and send failure status back to backend
      try:
        result = process_youtube_scroll(duration)
        send_callback(
            job_id=job_id,
            status=result['status'],
            actual_duration=result['actual_duration'],
            video_data=result['videos'],
        )
        print(f'[LOG] Job #{job_id} Finished Successfully!')
      except Exception as scrape_err:
        print(f'[LOG ERROR] Job #{job_id} failed: {scrape_err}')
        send_callback(
            job_id=job_id,
            status='failed',
            actual_duration=0,
            video_data=[],
            error_message=str(scrape_err),
        )

  except Exception as e:
    print(f'[LOG ERROR] Worker Exception: {e}')
    time.sleep(2)