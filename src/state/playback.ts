const TAU = Math.PI * 2;

type Listener = (angle: number) => void;

/** Drives the input (cam) angle outside React so a 60 fps animation never re-renders the UI. */
export class Playback {
  angle = 0;
  playing = false;
  rpm = 24;
  private listeners = new Set<Listener>();
  private raf = 0;
  private last = 0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.angle);
    return () => this.listeners.delete(fn);
  }

  set(angle: number) {
    this.angle = ((angle % TAU) + TAU) % TAU;
    this.listeners.forEach((l) => l(this.angle));
  }

  play(on: boolean) {
    if (on === this.playing) return;
    this.playing = on;
    cancelAnimationFrame(this.raf);
    if (!on) return;
    this.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.set(this.angle + (this.rpm / 60) * TAU * dt);
      if (this.playing) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  dispose() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
  }
}
