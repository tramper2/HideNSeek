import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import { SeekerMinimap } from './components/SeekerMinimap';
import './App.css';

function App() {
  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas />
      
      {/* 2D HUD UI Layer */}
      <GameUI />

      {/* 술래 시야 미니맵 (DOM 레이어에 직접 배치하여 고정) */}
      <SeekerMinimap />
    </>
  );
}

export default App;
