import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import './App.css';

function App() {
  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas />
      
      {/* 2D HUD UI Layer */}
      <GameUI />
    </>
  );
}

export default App;
