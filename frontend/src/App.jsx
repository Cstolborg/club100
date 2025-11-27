import { useState, useEffect } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import ArtistSelector from './components/ArtistSelector';
import GameScreen from './components/GameScreen';
import { checkHealth } from './api';

function App() {
  const [screen, setScreen] = useState('loading'); // loading, login, select, game
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [tracks, setTracks] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [player, setPlayer] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const health = await checkHealth();
      if (health.has_tokens && !health.token_expired) {
        setScreen('select');
      } else {
        setScreen('login');
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    setScreen('select');
  };

  const handleArtistsSelected = (artists, tracksData) => {
    setSelectedArtists(artists);
    setTracks(tracksData);
    setScreen('game');
  };

  const handleBackToSelection = () => {
    setScreen('select');
    setSelectedArtists([]);
    setTracks(null);
  };

  return (
    <div className="App">
      {screen === 'loading' && (
        <div className="loading">
          <h1>Club 100</h1>
          <p>Loading...</p>
        </div>
      )}

      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}

      {screen === 'select' && (
        <ArtistSelector
          onArtistsSelected={handleArtistsSelected}
          onPlayerReady={(player, deviceId) => {
            setPlayer(player);
            setDeviceId(deviceId);
          }}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          artists={selectedArtists}
          tracks={tracks}
          deviceId={deviceId}
          player={player}
          onBack={handleBackToSelection}
        />
      )}
    </div>
  );
}

export default App;
