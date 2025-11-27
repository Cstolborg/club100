import { useState, useEffect, useCallback, useRef } from 'react';
import { searchArtists, fetchTracks, getToken, getDevices } from '../api';
import './ArtistSelector.css';

function ArtistSelector({ onArtistsSelected, onPlayerReady }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [autoLoadComplete, setAutoLoadComplete] = useState(false);

  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Default artists to auto-load
  const DEFAULT_ARTISTS = [
    'Avicii',
    'Pitbull',
    'Sabaton',
    'Rammstein',
    'Linkin Park',
    'Green Day',
    'Red Hot Chili Peppers',
    'Florence + The Machine',
    'Flo Rida',
    'Medina'
  ];

  const initializePlayer = useCallback(async () => {
    try {
      const token = await getToken();

      const player = new window.Spotify.Player({
        name: 'Club 100 Game Player',
        getOAuthToken: async (cb) => {
          const token = await getToken();
          cb(token);
        },
        volume: 0.8,
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Initialization error:', message);
        setError('Failed to initialize player: ' + message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication error:', message);
        setError('Authentication failed. Please log in again.');
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Account error:', message);
        setError('Spotify Premium required. ' + message);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Playback error:', message);
      });

      // Ready event
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        deviceIdRef.current = device_id;

        // Poll Spotify's devices API to verify the device is actually registered
        // The Web Playback SDK reports "ready" locally but takes 10-20+ seconds
        // to register with Spotify's backend API
        const verifyDeviceRegistered = async () => {
          let attempts = 0;
          const maxAttempts = 20; // Poll with backoff for up to ~40s
          let delayMs = 1500;
          const maxDelayMs = 6000;

          const checkDevice = async () => {
            attempts++;
            try {
              const devices = await getDevices();
              console.log(`Checking devices (attempt ${attempts}/${maxAttempts}):`, devices);
              console.log(`Looking for device_id: ${device_id}`);
              console.log(`Device IDs in list:`, devices.map(d => d.id));

              // Match by name "Club 100 Game Player" since device IDs can differ
              // between SDK and API representations
              const deviceFound = devices.some(d =>
                d.id === device_id || d.name === 'Club 100 Game Player'
              );

              if (deviceFound) {
                console.log(`✓ Device verified in Spotify API after ${attempts * 1000}ms`);
                const matchedDevice = devices.find(d => d.id === device_id || d.name === 'Club 100 Game Player');
                console.log(`Matched device:`, matchedDevice);

                // Use the device ID from Spotify's API, not the SDK's device ID
                // These can be different representations of the same device
                const apiDeviceId = matchedDevice.id;
                console.log(`Using API device ID for playback: ${apiDeviceId}`);
                deviceIdRef.current = apiDeviceId;

                setPlayerReady(true);
                onPlayerReady(player, apiDeviceId);
                return true;
              } else if (attempts < maxAttempts) {
                console.log(`✗ Device not found yet, retrying...`);
                const nextDelay = Math.min(maxDelayMs, delayMs);
                delayMs = Math.min(maxDelayMs, Math.floor(delayMs * 1.4));
                setTimeout(checkDevice, nextDelay);
              } else {
                console.error('⚠️ Device registration timeout - proceeding anyway');
                console.error(`Expected device_id: ${device_id}`);
                console.error(`Available devices:`, devices);
                setPlayerReady(true);
                onPlayerReady(player, device_id);
              }
            } catch (err) {
              console.error('Error checking devices:', err);
              if (attempts < maxAttempts) {
                const nextDelay =
                  err.status === 429
                    ? Math.max(delayMs * 2, 3000)
                    : Math.min(maxDelayMs, delayMs);
                delayMs = Math.min(maxDelayMs, Math.floor(nextDelay * 1.1));
                setTimeout(checkDevice, nextDelay);
              } else {
                setPlayerReady(true);
                onPlayerReady(player, device_id);
              }
            }
          };

          checkDevice();
        };

        verifyDeviceRegistered();
      });

      // Not Ready event
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setPlayerReady(false);
      });

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (state) {
          setDeviceName(state.track_window?.current_track?.name || 'Club 100 Player');
        }
      });

      // Connect to the player
      const connected = await player.connect();
      if (connected) {
        console.log('Spotify player connected successfully');
        playerRef.current = player;
      } else {
        setError('Failed to connect to Spotify player');
      }
    } catch (err) {
      console.error('Error initializing player:', err);
      setError('Failed to initialize Spotify player: ' + err.message);
    }
  }, [onPlayerReady]);

  // Initialize Spotify Player (only once)
  useEffect(() => {
    // Prevent multiple initializations
    if (playerRef.current) {
      console.log('Player already initialized, skipping...');
      return;
    }

    // Check if SDK is already loaded
    if (window.Spotify && window.Spotify.Player) {
      console.log('Spotify SDK already loaded, initializing player...');
      initializePlayer();
    } else {
      // Poll for SDK to become ready
      const checkInterval = setInterval(() => {
        if (window.Spotify && window.Spotify.Player) {
          console.log('Spotify SDK now ready, initializing player...');
          clearInterval(checkInterval);
          initializePlayer();
        }
      }, 100);

      return () => {
        clearInterval(checkInterval);
      };
    }

    // Keep the player alive across screens so GameScreen can control it.
    // We intentionally do not disconnect on unmount here.
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Debounced search
  const handleSearch = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchArtists(query);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleSelectArtist = (artist) => {
    if (selectedArtists.length >= 10) {
      setError('You can only select 10 artists');
      return;
    }

    if (selectedArtists.find((a) => a.id === artist.id)) {
      setError('Artist already selected');
      return;
    }

    setSelectedArtists([...selectedArtists, artist]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleRemoveArtist = (artistId) => {
    setSelectedArtists(selectedArtists.filter((a) => a.id !== artistId));
  };

  // Auto-load default artists on mount
  useEffect(() => {
    const autoLoadArtists = async () => {
      if (autoLoadComplete || selectedArtists.length > 0) return;

      setLoading(true);
      setError(null);

      try {
        const loadedArtists = [];

        for (const artistName of DEFAULT_ARTISTS) {
          try {
            const results = await searchArtists(artistName);
            if (results.length > 0) {
              // Take the first (most relevant) result
              loadedArtists.push(results[0]);
            }
          } catch (err) {
            console.error(`Failed to load ${artistName}:`, err);
          }
        }

        if (loadedArtists.length === 10) {
          setSelectedArtists(loadedArtists);
          setAutoLoadComplete(true);
        } else {
          setError(`Only loaded ${loadedArtists.length}/10 artists. Please search and add the missing artists.`);
        }
      } catch (err) {
        setError('Failed to auto-load artists: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    autoLoadArtists();
  }, [autoLoadComplete, selectedArtists.length]);

  const handleConfirm = async () => {
    if (selectedArtists.length !== 10) {
      setError('Please select exactly 10 artists');
      return;
    }

    if (!playerReady) {
      setError('Spotify player not ready. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const artistIds = selectedArtists.map((a) => a.id);
      const tracksData = await fetchTracks(artistIds);
      onArtistsSelected(selectedArtists, tracksData);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="artist-selector">
      <div className="header">
        <h1>Select Your Artists</h1>
        <p>Choose exactly 10 artists to create your 100-song playlist</p>
        {loading && !autoLoadComplete && (
          <p className="player-status connecting">
            ⏳ Auto-loading artists...
          </p>
        )}
        {playerReady && (
          <p className="player-status">
            ✓ Spotify Player Ready{deviceName && `: ${deviceName}`}
          </p>
        )}
        {!playerReady && !loading && deviceIdRef.current && (
          <p className="player-status connecting">
            ⏳ Verifying device registration (this can take 10-30 seconds)...
          </p>
        )}
        {!playerReady && !loading && !deviceIdRef.current && (
          <p className="player-status connecting">
            ⏳ Connecting to Spotify...
          </p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="selection-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(selectedArtists.length / 10) * 100}%` }}
          />
        </div>
        <p>{selectedArtists.length} / 10 artists selected</p>
      </div>

      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search for artists..."
          value={searchQuery}
          onChange={handleSearchInput}
          disabled={selectedArtists.length >= 10}
        />

        {loading && <div className="loading-spinner">Searching...</div>}

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((artist) => (
              <div
                key={artist.id}
                className="artist-result"
                onClick={() => handleSelectArtist(artist)}
              >
                {artist.image ? (
                  <img src={artist.image} alt={artist.name} />
                ) : (
                  <div className="no-image">🎤</div>
                )}
                <span>{artist.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="selected-artists">
        <h3>Selected Artists</h3>
        <div className="artists-grid">
          {selectedArtists.map((artist, index) => (
            <div key={artist.id} className="selected-artist">
              <span className="artist-number">{index + 1}</span>
              {artist.image ? (
                <img src={artist.image} alt={artist.name} />
              ) : (
                <div className="no-image">🎤</div>
              )}
              <div className="artist-info">
                <span className="artist-name">{artist.name}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveArtist(artist.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {[...Array(10 - selectedArtists.length)].map((_, i) => (
            <div key={`empty-${i}`} className="selected-artist empty">
              <span className="artist-number">{selectedArtists.length + i + 1}</span>
              <div className="no-image">+</div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="primary confirm-btn"
        onClick={handleConfirm}
        disabled={selectedArtists.length !== 10 || !playerReady || loading}
      >
        {loading ? 'Loading tracks...' : 'Start Game'}
      </button>
    </div>
  );
}

export default ArtistSelector;
