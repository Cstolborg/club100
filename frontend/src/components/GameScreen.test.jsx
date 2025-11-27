import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GameScreen from './GameScreen';
import { playMinute } from '../api';

vi.mock('../api', () => {
  return {
    playMinute: vi.fn().mockResolvedValue({}),
  };
});

const artists = Array.from({ length: 10 }, (_, i) => ({
  id: `artist-${i}`,
  name: `Artist ${i}`,
}));

const tracks = Array.from({ length: 10 }, (_, artistIndex) => {
  const list = Array(10).fill(null);
  list[0] = {
    uri: `uri-${artistIndex}-0`,
    name: `Track ${artistIndex}-0`,
    duration_ms: 200000,
    artist_name: `Artist ${artistIndex}`,
    album_image: null,
  };
  return list;
});

describe('GameScreen playback timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls playMinute once per round in order (test mode)', async () => {
    render(
      <GameScreen
        artists={artists}
        tracks={tracks}
        deviceId="device-123"
        player={{ pause: vi.fn(), resume: vi.fn() }}
        onBack={() => {}}
      />
    );

    // Enable test mode and start
    const testModeToggle = screen.getByLabelText(/Test Mode/i);
    fireEvent.click(testModeToggle);

    const startButton = screen.getByText(/Start Game/i);
    fireEvent.click(startButton);

    // First round should play immediately
    await act(async () => {
      await Promise.resolve();
    });
    expect(playMinute).toHaveBeenCalledTimes(1);
    expect(playMinute).toHaveBeenLastCalledWith('device-123', 'uri-0-0', 200000);

    // Advance one interval (10s in test mode) -> second round
    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(playMinute).toHaveBeenCalledTimes(2);
    expect(playMinute).toHaveBeenLastCalledWith('device-123', 'uri-1-0', 200000);
  });
});
