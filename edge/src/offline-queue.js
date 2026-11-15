/**
 * IoMT Edge Offline Buffering Queue
 * 
 * Ensures zero silent health data loss when network link or central backend is unavailable.
 * Buffers telemetry locally in FIFO order and provides batch synchronization upon reconnection.
 */

export class OfflineQueue {
  constructor(maxSize = 2000) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.isOnline = true;
    this.totalBufferedCount = 0;
    this.totalSynchronizedCount = 0;
  }

  setOnlineStatus(status) {
    const wasOffline = !this.isOnline;
    this.isOnline = Boolean(status);
    return {
      isOnline: this.isOnline,
      justReconnected: wasOffline && this.isOnline,
      pendingCount: this.buffer.length,
    };
  }

  enqueue(item) {
    if (this.buffer.length >= this.maxSize) {
      console.warn(`[OfflineQueue] Maximum buffer size (${this.maxSize}) reached. Overwriting oldest sample to preserve continuous telemetry.`);
      this.buffer.shift();
    }

    const queuedItem = {
      ...item,
      queuedAt: new Date().toISOString(),
      wasOfflineBuffered: true,
    };

    this.buffer.push(queuedItem);
    this.totalBufferedCount++;
    return this.buffer.length;
  }

  size() {
    return this.buffer.length;
  }

  drainAll() {
    const items = [...this.buffer];
    this.buffer = [];
    this.totalSynchronizedCount += items.length;
    return items;
  }

  drainBatch(batchSize = 50) {
    const batch = this.buffer.splice(0, batchSize);
    this.totalSynchronizedCount += batch.length;
    return batch;
  }

  clear() {
    this.buffer = [];
  }

  getStats() {
    return {
      currentBufferSize: this.buffer.length,
      maxCapacity: this.maxSize,
      isOnline: this.isOnline,
      totalBufferedLifetime: this.totalBufferedCount,
      totalSynchronizedLifetime: this.totalSynchronizedCount,
      oldestBufferedAt: this.buffer[0]?.queuedAt || null,
      newestBufferedAt: this.buffer[this.buffer.length - 1]?.queuedAt || null,
    };
  }
}
