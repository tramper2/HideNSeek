import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { gameStore, useGameStore } from '../hooks/useGameStore';

export const GameUI: React.FC = () => {
  const status = useGameStore((state) => state.status);
  const timer = useGameStore((state) => state.timer);
  const brushColor = useGameStore((state) => state.brushColor);
  const brushBrightness = useGameStore((state) => state.brushBrightness);
  const brushSize = useGameStore((state) => state.brushSize);
  const detectionGauge = useGameStore((state) => state.detectionGauge);
  const isPlayerSpotted = useGameStore((state) => state.isPlayerSpotted);
  const colorDistance = useGameStore((state) => state.colorDistance);

  // Palette colors defined in specifications
  const palette = [
    { name: 'Beige (북쪽 벽)', hex: '#FEF3C7' },
    { name: 'Mint (남쪽 벽)', hex: '#D1FAE5' },
    { name: 'Indigo (동쪽 벽)', hex: '#E0E7FF' },
    { name: 'Charcoal (서쪽 벽)', hex: '#1F2937' },
    { name: 'Deep Red (소파)', hex: '#991B1B' },
    { name: 'Forest Green (식물)', hex: '#065F46' },
    { name: 'White (기본)', hex: '#FFFFFF' }
  ];

  // Timer Countdown Logic
  useEffect(() => {
    let interval: any = null;
    
    if (status === 'PLAYING') {
      interval = setInterval(() => {
        const currentTimer = gameStore.getState().timer;
        if (currentTimer <= 1) {
          gameStore.setVictory();
        } else {
          gameStore.setState({ timer: currentTimer - 1 });
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // Confetti trigger on victory
  useEffect(() => {
    if (status === 'VICTORY') {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [status]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStartGame = () => {
    gameStore.startGame();
  };

  const handleResetGame = () => {
    gameStore.reset();
    gameStore.startGame();
  };

  // 1. Start Overlay Screen
  if (status === 'START') {
    return (
      <div className="overlay-screen start-screen">
        <div className="glass-panel text-center">
          <h1 className="game-title animate-title">CHAMELEON HIDE & SEEK</h1>
          <p className="game-subtitle">카멜레온 숨바꼭질: 컬러 서바이벌</p>
          
          <div className="instructions">
            <h3>게임 방법</h3>
            <ul>
              <li>⌨️ <strong>이동</strong>: <code>WASD</code> 또는 <code>방향키</code></li>
              <li>🖱️ <strong>시점 회전</strong>: 배경을 마우스 클릭 후 드래그</li>
              <li>🖌️ <strong>페인팅</strong>: 플레이어 몸통(캡슐)을 클릭 및 드래그</li>
              <li>🕵️ <strong>은폐</strong>: 뒤에 있는 벽이나 가구의 색상과 몸색을 일치시키고 멈추세요!</li>
              <li>⚠️ <strong>주의</strong>: 술래의 감시 시야 cone 안에 있을 때 <strong>움직이거나</strong> 색상이 다르면 발각 게이지가 차오릅니다!</li>
            </ul>
          </div>
          
          <button className="btn btn-primary" onClick={handleStartGame}>
            게임 시작
          </button>
        </div>
      </div>
    );
  }

  // 2. Game Over Overlay Screen
  if (status === 'GAMEOVER') {
    return (
      <div className="overlay-screen gameover-screen animate-fade-in">
        <div className="glass-panel text-center alert-panel">
          <h1 className="alert-title animate-pulse">SPOTTED!</h1>
          <p className="alert-subtitle">술래에게 정체가 발각되었습니다!</p>
          <div className="stats-box">
            <p>버틴 시간: <strong>{formatTime(60 - timer)}</strong></p>
          </div>
          <button className="btn btn-danger" onClick={handleResetGame}>
            다시 도전
          </button>
        </div>
      </div>
    );
  }

  // 3. Victory Overlay Screen
  if (status === 'VICTORY') {
    return (
      <div className="overlay-screen victory-screen animate-fade-in">
        <div className="glass-panel text-center success-panel">
          <h1 className="victory-title animate-bounce">VICTORY!</h1>
          <p className="victory-subtitle">60초간 완벽히 위장하여 생존했습니다!</p>
          <div className="stats-box">
            <p>남은 생존 시간: <strong>00:00</strong> (전체 시간 생존 완료!)</p>
          </div>
          <button className="btn btn-success" onClick={handleResetGame}>
            다시 하기
          </button>
        </div>
      </div>
    );
  }

  // 4. Running Game UI Layer
  const alertColorClass = detectionGauge > 80 
    ? 'danger' 
    : detectionGauge > 40 
      ? 'warning' 
      : 'success';

  return (
    <div className="game-hud-layer">
      {/* Top Left: Timer & Alert Status */}
      <div className="hud-panel top-left glass-panel">
        <div className="timer-display">
          <span className="label">생존 시간</span>
          <span className="value">{formatTime(timer)}</span>
        </div>
        
        <div className="detection-status-row">
          <span className="label">위장 상태</span>
          <span className={`status-badge ${isPlayerSpotted ? 'spotted animate-pulse' : 'hidden'}`}>
            {isPlayerSpotted ? 'SPOTTED' : 'HIDDEN'}
          </span>
        </div>

        {/* Linear detection gauge bar */}
        <div className="gauge-container">
          <div className="gauge-label-row">
            <span>발각 위기 수준</span>
            <span>{Math.round(detectionGauge)}%</span>
          </div>
          <div className="gauge-track">
            <div 
              className={`gauge-fill ${alertColorClass}`} 
              style={{ width: `${detectionGauge}%` }}
            />
          </div>
        </div>

        {/* Small color difference matching metric */}
        {isPlayerSpotted && (
          <div className="match-indicator">
            <span>색상 차이치:</span>
            <span style={{ color: colorDistance > 110 ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
              {Math.round(colorDistance)}
            </span>
            <span className="threshold-label">(기준치: 110)</span>
          </div>
        )}
      </div>

      {/* Right side: Paint Control Panel */}
      <div className="hud-panel right-controls glass-panel">
        <h2>위장 팔레트</h2>
        <p className="panel-desc">캐릭터 몸을 드래그해서 색상을 입히세요.</p>
        
        {/* Color Palette */}
        <div className="control-section">
          <h3>브러시 색상</h3>
          <div className="color-palette-grid">
            {palette.map((color, idx) => (
              <button
                key={idx}
                className={`color-chip-btn ${brushColor === color.hex ? 'active' : ''}`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
                onClick={() => gameStore.setState({ brushColor: color.hex })}
              >
                {brushColor === color.hex && (
                  <span className="check-icon" style={{ color: color.hex === '#FFFFFF' || color.hex === '#FEF3C7' || color.hex === '#D1FAE5' ? '#1E2937' : '#FFFFFF' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lightness range slider */}
        <div className="control-section">
          <div className="slider-header">
            <h3>명도 조절</h3>
            <span>{Math.round(brushBrightness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            className="brightness-slider"
            value={brushBrightness}
            onChange={(e) => gameStore.setState({ brushBrightness: parseFloat(e.target.value) })}
          />
        </div>

        {/* Brush Size options */}
        <div className="control-section">
          <h3>브러시 크기</h3>
          <div className="brush-size-group">
            {[
              { label: '소 (5px)', size: 0.05 },
              { label: '중 (15px)', size: 0.15 },
              { label: '대 (30px)', size: 0.3 }
            ].map((brush, idx) => (
              <button
                key={idx}
                className={`btn-brush-size ${brushSize === brush.size ? 'active' : ''}`}
                onClick={() => gameStore.setState({ brushSize: brush.size })}
              >
                {brush.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tips box */}
        <div className="tips-box">
          <p>💡 <strong>Tip</strong>: 술래의 눈을 피하려면 주변 바닥이나 소파, 기둥의 색상에 맞춰 캐릭터 몸을 정확하게 칠한 다음 멈춰 서세요!</p>
        </div>
      </div>
    </div>
  );
};
export default GameUI;
