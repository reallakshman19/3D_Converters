import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function pathSize(path) {
  try {
    const info = await stat(path);
    if (info.isFile()) return info.size;
    if (!info.isDirectory()) return 0;
    let total = 0;
    for (const entry of await readdir(path)) total += await pathSize(join(path, entry));
    return total;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
}

export async function directoryBytes(path) {
  return pathSize(path);
}

async function procIo() {
  try {
    const text = await readFile('/proc/self/io', 'utf8');
    return Object.fromEntries(text.trim().split('\n').map((line) => {
      const [key, value] = line.split(':');
      return [key.trim(), Number.parseInt(value.trim(), 10)];
    }));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function fileDescriptorCount() {
  try { return (await readdir('/proc/self/fd')).length; }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function ioDelta(before, after, key) {
  if (!before || !after) return null;
  return Math.max(0, (after[key] || 0) - (before[key] || 0));
}

export async function startResourceSampler(monitorRoot, intervalMs = 250) {
  const baselineDisk = await pathSize(monitorRoot);
  const startingIo = await procIo();
  const startingCpu = process.cpuUsage();
  const started = process.hrtime.bigint();
  const peaks = { rss: 0, heap: 0, disk: baselineDisk, fds: 0 };
  let active = true;
  let pending = null;

  async function sample() {
    const memory = process.memoryUsage();
    peaks.rss = Math.max(peaks.rss, memory.rss);
    peaks.heap = Math.max(peaks.heap, memory.heapUsed);
    peaks.disk = Math.max(peaks.disk, await pathSize(monitorRoot));
    const fds = await fileDescriptorCount();
    if (fds !== null) peaks.fds = Math.max(peaks.fds, fds);
  }

  const timer = setInterval(() => {
    if (!active || pending) return;
    pending = sample().finally(() => { pending = null; });
  }, intervalMs);
  timer.unref();
  await sample();

  return async function stop() {
    active = false;
    clearInterval(timer);
    if (pending) await pending;
    await sample();
    const endingIo = await procIo();
    const cpu = process.cpuUsage(startingCpu);
    const maxRss = process.resourceUsage().maxRSS * 1024;
    return {
      wallMs: Number(process.hrtime.bigint() - started) / 1e6,
      cpuUserMs: cpu.user / 1000,
      cpuSystemMs: cpu.system / 1000,
      peakRssBytes: Math.max(peaks.rss, maxRss),
      peakHeapBytes: peaks.heap,
      temporaryDiskPeakBytes: Math.max(0, peaks.disk - baselineDisk),
      bytesRead: ioDelta(startingIo, endingIo, 'read_bytes'),
      bytesWritten: ioDelta(startingIo, endingIo, 'write_bytes'),
      fileDescriptorPeak: peaks.fds || null,
    };
  };
}
