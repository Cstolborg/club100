import { useState, useEffect, useRef, useCallback } from 'react';
import { playMinute, getDevices } from '../api';
import './GameScreen.css';

function GameScreen({ artists, tracks, deviceId, player, onBack }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, paused, finished
  const [currentRound, setCurrentRound] = useState(1);
  const [testMode, setTestMode] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const currentTrackRef = useRef(null);

  // Game configuration
  const config = testMode
    ? { maxRounds: 20, intervalMs: 10000 } // 20 rounds, 10 seconds each
    : { maxRounds: 100, intervalMs: 60000 }; // 100 rounds, 60 seconds each

  // Get current track based on round
  const getCurrentTrack = useCallback((round) => {
    if (round > config.maxRounds) return null;

    const artistIndex = (round - 1) % 10;
    const songIndex = Math.floor((round - 1) / 10);

    const track = tracks[artistIndex][songIndex];
    return track ? {
      ...track,
      artist: artists[artistIndex],
    } : null;
  }, [artists, tracks, config.maxRounds]);

  currentTrackRef.current = getCurrentTrack(currentRound);

  // Play track for current round
  const playCurrentRound = useCallback(async (round) => {
    const track = getCurrentTrack(round);

    if (!track) {
      console.log(`Round ${round}: No track available, skipping`);
      return;
    }

    try {
      // Fetch current device ID fresh each time since they change
      const devices = await getDevices();
      const clubDevice = devices.find(d => d.name === 'Club 100 Game Player');

      if (!clubDevice) {
        console.error('Club 100 Game Player device not found');
        setError('Spotify player disconnected');
        return;
      }

      const currentDeviceId = clubDevice.id;
      console.log(`Round ${round}: Playing ${track.name} by ${track.artist_name} on device ${currentDeviceId}`);
      await playMinute(currentDeviceId, track.uri, track.duration_ms);
    } catch (err) {
      console.error(`Failed to play round ${round}:`, err);
      setError(`Playback error: ${err.message}`);
    }
  }, [getCurrentTrack]);

  // Timer logic with drift correction
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setGameState('playing');
    setError(null);

    // Play first round immediately
    playCurrentRound(1);

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const round = Math.floor(elapsed / config.intervalMs) + 1;

      if (round > config.maxRounds) {
        // Game finished
        setGameState('finished');
        setCurrentRound(config.maxRounds);
        setTimeRemaining(0);
        return;
      }

      setCurrentRound(round);

      // Calculate time remaining in current round
      const roundElapsed = elapsed % config.intervalMs;
      const roundRemaining = config.intervalMs - roundElapsed;
      setTimeRemaining(Math.ceil(roundRemaining / 1000));

      // Play track if we've moved to a new round
      if (round > 1 && Math.floor((elapsed - config.intervalMs) / config.intervalMs) + 1 < round) {
        playCurrentRound(round);
      }

      // Schedule next tick
      const nextTickDelay = roundRemaining % 1000 || 1000;
      timerRef.current = setTimeout(tick, nextTickDelay);
    };

    tick();
  }, [config.intervalMs, config.maxRounds, playCurrentRound]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = () => {
    if (!deviceId) {
      setError('No Spotify device connected');
      return;
    }
    startTimer();
  };

  const handlePause = () => {
    stopTimer();
    setGameState('paused');
    if (player) {
      player.pause();
    }
  };

  const handleResume = () => {
    // Recalculate timing based on current round
    const elapsed = (currentRound - 1) * config.intervalMs;
    startTimeRef.current = Date.now() - elapsed;
    setGameState('playing');

    // Resume playback
    if (player) {
      player.resume();
    }

    // Restart timer
    const tick = () => {
      const newElapsed = Date.now() - startTimeRef.current;
      const round = Math.floor(newElapsed / config.intervalMs) + 1;

      if (round > config.maxRounds) {
        setGameState('finished');
        setCurrentRound(config.maxRounds);
        setTimeRemaining(0);
        return;
      }

      setCurrentRound(round);

      const roundElapsed = newElapsed % config.intervalMs;
      const roundRemaining = config.intervalMs - roundElapsed;
      setTimeRemaining(Math.ceil(roundRemaining / 1000));

      const nextTickDelay = roundRemaining % 1000 || 1000;
      timerRef.current = setTimeout(tick, nextTickDelay);
    };

    tick();
  };

  const handleReset = () => {
    stopTimer();
    setGameState('ready');
    setCurrentRound(1);
    setTimeRemaining(0);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const progress = (currentRound / config.maxRounds) * 100;

  return (
    <div className="game-screen">
      <div className="game-header">
        <h1>Club 100</h1>
        <button className="secondary back-btn" onClick={onBack}>
          ← Change Artists
        </button>
      </div>

      {gameState === 'ready' && (
        <div className="game-setup">
          <h2>Ready to Start?</h2>
          <p>
            You've selected {artists.length} artists for a {config.maxRounds}-round game
            {testMode ? ' (TEST MODE - 10 seconds per round)' : ' (60 seconds per round)'}
          </p>

          <div className="mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
              />
              <span>Test Mode (20 rounds × 10 seconds)</span>
            </label>
          </div>

          <button className="primary start-btn" onClick={handleStart}>
            🎵 Start Game
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'paused') && currentTrackRef.current && (
        <div className="game-active">
          <div className="round-info">
            <h2 className="round-number">Round {currentRound}</h2>
            <p className="time-remaining">{timeRemaining}s remaining</p>
          </div>

          <div className="progress-bar-large">
            <div className="progress-fill-large" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">{currentRound} / {config.maxRounds} rounds</p>

          {currentTrackRef.current.album_image && (
            <img
              src={currentTrackRef.current.album_image}
              alt="Album art"
              className="album-art"
            />
          )}

          <div className="track-info">
            <h3 className="track-name">{currentTrackRef.current.name}</h3>
            <p className="artist-name">{currentTrackRef.current.artist_name}</p>
          </div>

          <div className="drink-cue">
            <div className="drink-pulse">🍺</div>
            <h2>DRINK!</h2>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="game-controls">
            {gameState === 'playing' && (
              <button className="secondary" onClick={handlePause}>
                ⏸ Pause
              </button>
            )}
            {gameState === 'paused' && (
              <button className="primary" onClick={handleResume}>
                ▶ Resume
              </button>
            )}
            <button className="secondary" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>
        </div>
      )}

      {gameState === 'finished' && (
        <div className="game-finished">
          <h2>🎉 Game Complete!</h2>
          <p>You made it through all {config.maxRounds} rounds!</p>
          <p className="congrats">Congratulations! 🍻</p>

          <div className="final-stats">
            <div className="stat">
              <span className="stat-value">{config.maxRounds}</span>
              <span className="stat-label">Rounds</span>
            </div>
            <div className="stat">
              <span className="stat-value">{artists.length}</span>
              <span className="stat-label">Artists</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.floor((config.maxRounds * config.intervalMs) / 60000)}</span>
              <span className="stat-label">Minutes</span>
            </div>
          </div>

          <div className="finish-actions">
            <button className="primary" onClick={handleReset}>
              ▶ Play Again
            </button>
            <button className="secondary" onClick={onBack}>
              ← Change Artists
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
