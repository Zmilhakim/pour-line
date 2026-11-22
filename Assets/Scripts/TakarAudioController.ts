/**
 * TakarAudioController — plain TypeScript helper (not a @component).
 *
 * Owns: playback of the four Takar sound cues — the looping pour bed and the
 * three one-shots (kettle snap, kettle return, button click).
 *
 * Expects no @inputs. TakarMain constructs it from four AudioComponent
 * references authored by the scene bootstrap (each with its audioTrack set).
 *
 * Must not create scene objects or touch anything but those four
 * AudioComponents. Every reference may be null or destroyed; missing audio is
 * skipped silently and must never take the Lens down.
 */
export class TakarAudioController {
  private pourLoop: AudioComponent | null
  private snap: AudioComponent | null
  private kettleReturn: AudioComponent | null
  private click: AudioComponent | null
  private pourPlaying: boolean = false
  private volume: number = 1

  constructor(
    pourLoop: AudioComponent | null,
    snap: AudioComponent | null,
    kettleReturn: AudioComponent | null,
    click: AudioComponent | null,
    volume: number
  ) {
    this.pourLoop = pourLoop
    this.snap = snap
    this.kettleReturn = kettleReturn
    this.click = click

    for (const a of this.all()) {
      if (!this.ok(a)) continue
      try {
        a.playbackMode = Audio.PlaybackMode.LowLatency
      } catch (e) {
        print("[TakarAudio] playbackMode failed: " + e)
      }
    }
    this.setVolume(volume)
  }

  /** Clamp to 0..1 and apply to all four components. */
  setVolume(volume: number): void {
    const v = typeof volume === "number" && !isNaN(volume) ? volume : 1
    this.volume = Math.max(0, Math.min(1, v))
    for (const a of this.all()) {
      if (!this.ok(a)) continue
      try {
        a.volume = this.volume
      } catch (e) {
        print("[TakarAudio] setVolume failed: " + e)
      }
    }
  }

  /** Start the pour loop if it is not already playing. Safe to call every frame. */
  startPour(): void {
    if (this.pourPlaying) return
    const a = this.pourLoop
    if (!this.ok(a) || !a.audioTrack) return
    try {
      if (!a.isPlaying()) a.play(-1)
      this.pourPlaying = true
    } catch (e) {
      print("[TakarAudio] startPour failed: " + e)
    }
  }

  /** Stop the pour loop at once if it is playing. */
  stopPour(): void {
    const a = this.pourLoop
    const wasPlaying = this.pourPlaying
    this.pourPlaying = false
    if (!this.ok(a)) return
    try {
      if (wasPlaying || a.isPlaying()) a.stop(false)
    } catch (e) {
      print("[TakarAudio] stopPour failed: " + e)
    }
  }

  isPourPlaying(): boolean {
    return this.pourPlaying
  }

  playSnap(): void {
    this.oneShot(this.snap, "playSnap")
  }

  playReturn(): void {
    this.oneShot(this.kettleReturn, "playReturn")
  }

  playClick(): void {
    this.oneShot(this.click, "playClick")
  }

  private oneShot(a: AudioComponent | null, label: string): void {
    if (!this.ok(a) || !a.audioTrack) return
    try {
      if (a.isPlaying()) a.stop(false)
      a.play(1)
    } catch (e) {
      print("[TakarAudio] " + label + " failed: " + e)
    }
  }

  private all(): (AudioComponent | null)[] {
    return [this.pourLoop, this.snap, this.kettleReturn, this.click]
  }

  private ok(a: AudioComponent | null): a is AudioComponent {
    return !!a && !isNull(a)
  }
}
