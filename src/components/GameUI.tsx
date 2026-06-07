import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { gameStore, useGameStore } from '../hooks/useGameStore';

export const GameUI: React.FC = () => {
  const status = useGameStore((state) => state.status);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const uiMode = useGameStore((state) => state.uiMode);
  const maxHidingTime = useGameStore((state) => state.maxHidingTime);
  const seekerCount = useGameStore((state) => state.seekerCount);
  const hidingTimer = useGameStore((state) => state.hidingTimer);
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

  // Timer Countdown Logic: handles Hiding and Seeking phases
  useEffect(() => {
    let interval: any = null;
    
    if (status === 'PLAYING') {
      interval = setInterval(() => {
        const state = gameStore.getState();
        if (state.gamePhase === 'HIDING') {
          const currentHiding = state.hidingTimer;
          if (currentHiding <= 1) {
            gameStore.setState({ gamePhase: 'SEEKING', hidingTimer: 0 });
          } else {
            gameStore.setState({ hidingTimer: currentHiding - 1 });
          }
        } else {
          const currentTimer = state.timer;
          if (currentTimer <= 1) {
            gameStore.setVictory();
          } else {
            gameStore.setState({ timer: currentTimer - 1 });
          }
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
    gameStore.reset(); // Returns status back to 'START' to show the main screen
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
              <li>🖌️ <strong>페인팅</strong>: 플레이어 몸통(캡슐)을 클릭 및 드래그 (조작 모드가 <strong>페인팅 모드</strong>일 때 가능)</li>
              <li>🎥 <strong>시점 회전</strong>: 조작 모드를 <strong>시점 회전 모드</strong>로 바꾼 후 화면 드래그</li>
              <li>⏱️ <strong>은폐 시간 ({maxHidingTime}초)</strong>: 게임 시작 시 {maxHidingTime}초 동안 술래가 대기하며, 플레이어는 자유롭게 이동하고 위장색을 칠할 수 있습니다.</li>
              <li>🕵️ <strong>은폐 규칙</strong>: 술래의 감시 시야 원뿔 안에 있을 때 <strong>움직이거나</strong> 색상이 다르면 발각 게이지가 상승합니다!</li>
            </ul>
          </div>

          <div className="control-section" style={{ width: '100%', margin: '5px 0' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              은폐 시간 설정
            </h3>
            <div className="brush-size-group">
              {[30, 60, 120].map((time) => (
                <button
                  key={time}
                  className={`btn-brush-size ${maxHidingTime === time ? 'active' : ''}`}
                  onClick={() => gameStore.setState({ maxHidingTime: time })}
                >
                  {time}초
                </button>
              ))}
            </div>
          </div>

          <div className="control-section" style={{ width: '100%', margin: '5px 0' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              술래 수 설정
            </h3>
            <div className="brush-size-group">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  className={`btn-brush-size ${seekerCount === count ? 'active' : ''}`}
                  onClick={() => gameStore.setState({ seekerCount: count })}
                >
                  {count}명
                </button>
              ))}
            </div>
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
            메인 화면으로
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
          <p className="victory-subtitle">술래의 추적을 피해 생존해냈습니다!</p>
          <div className="stats-box">
            <p>남은 생존 시간: <strong>00:00</strong> (전체 시간 생존 완료!)</p>
          </div>
          <button className="btn btn-success" onClick={handleResetGame}>
            메인 화면으로
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
      {/* Top Center: Mode Indicator Banner */}
      <div className={`mode-banner ${uiMode === 'PAINT' ? 'mode-paint' : 'mode-orbit'}`}>
        <span className="mode-icon">{uiMode === 'PAINT' ? '🖌️' : '🎥'}</span>
        <span className="mode-label">{uiMode === 'PAINT' ? '페인팅 모드' : '시점 회전 모드'}</span>
      </div>

      {/* Top Left: Timer & Alert Status */}
      <div className="hud-panel top-left glass-panel">
        {gamePhase === 'HIDING' ? (
          <div className="timer-display hiding-phase">
            <span className="label text-success">은폐 가능 시간</span>
            <span className="value text-success">{hidingTimer}초</span>
          </div>
        ) : (
          <div className="timer-display seeking-phase">
            <span className="label">남은 생존 시간</span>
            <span className="value">{formatTime(timer)}</span>
          </div>
        )}
        
        <div className="detection-status-row">
          <span className="label">위장 상태</span>
          <span className={`status-badge ${gamePhase === 'HIDING' ? 'hidden' : (isPlayerSpotted ? 'spotted animate-pulse' : 'hidden')}`}>
            {gamePhase === 'HIDING' ? '대기 중' : (isPlayerSpotted ? 'SPOTTED' : 'HIDDEN')}
          </span>
        </div>

        {/* Linear detection gauge bar */}
        <div className="gauge-container">
          <div className="gauge-label-row">
            <span>발각 위기 수준</span>
            <span>{gamePhase === 'HIDING' ? 0 : Math.round(detectionGauge)}%</span>
          </div>
          <div className="gauge-track">
            <div 
              className={`gauge-fill ${gamePhase === 'HIDING' ? 'success' : alertColorClass}`} 
              style={{ width: `${gamePhase === 'HIDING' ? 0 : detectionGauge}%` }}
            />
          </div>
        </div>

        {/* Small color difference matching metric */}
        {gamePhase === 'SEEKING' && isPlayerSpotted && (
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

        {/* Controls Mode Toggle — 항상 표시 */}
        <div className="control-section">
          <h3>조작 모드 선택</h3>
          <div className="brush-size-group">
            <button
              className={`btn-brush-size ${uiMode === 'PAINT' ? 'active' : ''}`}
              style={{ flex: '1.2' }}
              onClick={() => gameStore.setState({ uiMode: 'PAINT' })}
            >
              🖌️ 페인팅 모드
            </button>
            <button
              className={`btn-brush-size ${uiMode === 'ORBIT' ? 'active' : ''}`}
              style={{ flex: '1.2' }}
              onClick={() => gameStore.setState({ uiMode: 'ORBIT' })}
            >
              🎥 시점 회전 모드
            </button>
          </div>
        </div>

        <p className="panel-desc" style={{ marginTop: '-12px', fontSize: '11px', lineHeight: '1.3' }}>
          {uiMode === 'PAINT'
            ? '페인팅 모드: 캐릭터 몸(캡슐)을 클릭 드래그하여 페인팅할 수 있습니다.'
            : '시점 회전 모드: 화면을 클릭 드래그하여 카메라 시점을 회전할 수 있습니다.'}
        </p>

        {/* 페인팅 도구 — PAINT 모드에서만 표시 */}
        {uiMode === 'PAINT' && (
          <>
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
              <p>💡 <strong>Tip</strong>: 은폐 단계인 첫 30초 동안 벽이나 장애물 옆에 위치를 잡고, 바디 텍스처를 배경색과 동일하게 색칠하세요! 30초가 지나면 술래가 이동을 시작합니다.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default GameUI;
