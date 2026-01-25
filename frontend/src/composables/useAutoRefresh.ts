
import { onMounted, onUnmounted } from 'vue';

/**
 * Automatically calls a callback function at a set interval.
 * Smartly pauses when the tab is not visible to save resources.
 * 
 * @param callback The function to call (e.g., fetchData)
 * @param intervalMs Interval in milliseconds (default: 30000ms = 30s)
 */
export function useAutoRefresh(callback: () => any, intervalMs = 30000) {
  let intervalId: any = null;

  const start = () => {
    stop(); // Ensure no duplicates
    intervalId = setInterval(() => {
      if (!document.hidden) {
        // console.log('🔄 Auto-refreshing data...');
        callback();
      }
    }, intervalMs);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched tabs -> pause
      stop();
    } else {
      // User returned -> update immediately & resume
      // console.log('👀 Tab active -> Refreshing data');
      callback();
      start();
    }
  };

  onMounted(() => {
    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
}
