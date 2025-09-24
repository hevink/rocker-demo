import React, { useRef, useEffect, useState } from 'react';
import { Application, Assets, Sprite, AnimatedSprite, Texture, Graphics, Container } from 'pixi.js';

const PixiRocketLauncher: React.FC = () => {
  const pixiRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rocketRef = useRef<Sprite | null>(null);
  const explosionRef = useRef<AnimatedSprite | null>(null);
  const containerRef = useRef<Container | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'shooting' | 'flying' | 'exploding'>('idle');
  const [rocketPosition, setRocketPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const initPixi = async () => {
      if (!pixiRef.current) return;

      // Create PIXI Application
      const app = new Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight, // Full screen height
        backgroundColor: 0x001122,
        antialias: true
      });

      pixiRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Create main container
      const container = new Container();
      app.stage.addChild(container);
      containerRef.current = container;

      // Load fighter spritesheet from PixiJS
      await Assets.load('https://pixijs.com/assets/spritesheet/fighter.json');

      // Create rocket sprite using fighter texture
      const rocketTexture = Texture.from('rollSequence0000.png'); // First frame of fighter
      const rocket = new Sprite(rocketTexture);

      // Position rocket at bottom center
      rocket.x = app.screen.width / 2;
      rocket.y = app.screen.height - 250; // Near bottom
      rocket.anchor.set(0.5, 0.5);
      rocket.scale.set(2); // Make it bigger
      rocket.rotation = -Math.PI / 2; // Point upward

      container.addChild(rocket);
      rocketRef.current = rocket;

      setRocketPosition({ x: rocket.x, y: rocket.y });

      // Create explosion animation using fighter frames
      const explosionFrames = [];
      for (let i = 0; i < 30; i++) {
        const frameNum = String(i).padStart(4, '0');
        try {
          explosionFrames.push(Texture.from(`rollSequence${frameNum}.png`));
        } catch (e) {
          // If frame doesn't exist, reuse earlier frames
          explosionFrames.push(Texture.from(`rollSequence0000.png`));
        }
      }

      const explosion = new AnimatedSprite(explosionFrames);
      explosion.visible = false;
      explosion.anchor.set(0.5);
      explosion.animationSpeed = 0.3;
      explosion.loop = false;
      explosion.scale.set(2);
      container.addChild(explosion);
      explosionRef.current = explosion;

      // Add stars background
      createStarsBackground(container, app);

      // Animation loop
      app.ticker.add(() => {
        updateAnimation();
      });

      // Handle window resize
      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    initPixi();

    // Cleanup
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, [gameState]);

  // Create stars background
  const createStarsBackground = (container: Container, app: Application) => {
    for (let i = 0; i < 100; i++) {
      const star = new Graphics();
      star.beginFill(0xFFFFFF);
      star.drawCircle(0, 0, Math.random() * 2 + 0.5);
      star.endFill();
      star.x = Math.random() * app.screen.width;
      star.y = Math.random() * app.screen.height * 0.8;
      star.alpha = Math.random() * 0.8 + 0.2;
      container.addChild(star);
    }
  };

  // Animation update loop
  const updateAnimation = () => {
    if (!rocketRef.current || !appRef.current) return;

    const rocket = rocketRef.current;
    const app = appRef.current;

    if (gameState === 'shooting') {
      // Move rocket up rapidly
      rocket.y -= 6;

      // Add slight wobble effect
      rocket.x += Math.sin(Date.now() * 0.01) * 1;
      rocket.rotation = -Math.PI / 2 + Math.sin(Date.now() * 0.008) * 0.05;

      // Transition to flying state when rocket is halfway up
      if (rocket.y <= app.screen.height / 2) {
        setGameState('flying');
      }

      setRocketPosition({ x: rocket.x, y: rocket.y });
    }

    if (gameState === 'flying') {
      // Continue moving up but slower
      rocket.y -= 3;

      // Add flying movement pattern
      rocket.x += Math.sin(Date.now() * 0.005) * 2;
      rocket.rotation = -Math.PI / 2 + Math.sin(Date.now() * 0.004) * 0.1;

      // Auto-explode if reaches very top
      if (rocket.y <= 50) {
        handleExplode();
      }

      setRocketPosition({ x: rocket.x, y: rocket.y });
    }
  };

  // Handle shoot button
  const handleShoot = () => {
    if (gameState !== 'idle') return;
    setGameState('shooting');
  };

  // Handle manual explosion
  const handleExplode = () => {
    if (gameState !== 'shooting' && gameState !== 'flying') return;

    if (!rocketRef.current || !explosionRef.current) return;

    const rocket = rocketRef.current;
    const explosion = explosionRef.current;

    // Hide rocket
    rocket.visible = false;

    // Show and play explosion at rocket position
    explosion.x = rocket.x;
    explosion.y = rocket.y;
    explosion.visible = true;
    explosion.scale.set(3);
    explosion.gotoAndPlay(0);

    setGameState('exploding');

    // Reset after explosion completes
    explosion.onComplete = () => {
      setTimeout(() => {
        resetRocket();
      }, 1500);
    };
  };

  // Reset rocket to initial state
  const resetRocket = () => {
    if (!appRef.current || !rocketRef.current || !explosionRef.current) return;

    const rocket = rocketRef.current;
    const explosion = explosionRef.current;

    // Reset positions to bottom of full screen
    rocket.x = appRef.current.screen.width / 2;
    rocket.y = appRef.current.screen.height - 50;
    rocket.visible = true;
    rocket.rotation = -Math.PI / 2;

    // Hide explosion
    explosion.visible = false;

    setRocketPosition({ x: rocket.x, y: rocket.y });
    setGameState('idle');
  };

  return (
    <div className="w-full bg-gray-900">
      {/* PIXI Canvas Container - Full Screen */}
      <div ref={pixiRef} className="w-full h-full" />

      {/* Control Panel - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 bg-opacity-90 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Status Display */}
          <div className="text-white">
            <h2 className="text-xl font-bold mb-1">🚀 Rocket Launcher</h2>
            <p className="text-sm">
              Status: <span className="font-semibold text-blue-400">
                {gameState === 'idle' && '🎯 Ready to Launch'}
                {gameState === 'shooting' && '🚀 Launching...'}
                {gameState === 'flying' && '✈️ Flying - Click Explode!'}
                {gameState === 'exploding' && '💥 BOOM!'}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              Height: {Math.round((appRef.current?.screen.height || 0) - rocketPosition.y)} / {appRef.current?.screen.height || 0}
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleShoot}
              disabled={gameState !== 'idle'}
              className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${gameState === 'idle'
                ? 'bg-green-500 hover:bg-green-600 shadow-lg animate-pulse'
                : 'bg-gray-600 cursor-not-allowed'
                }`}
            >
              🚀 Launch
            </button>

            <button
              onClick={handleExplode}
              disabled={gameState !== 'shooting' && gameState !== 'flying'}
              className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${(gameState === 'shooting' || gameState === 'flying')
                ? 'bg-red-500 hover:bg-red-600 shadow-lg animate-bounce'
                : 'bg-gray-600 cursor-not-allowed'
                }`}
            >
              💥 Explode
            </button>

            <button
              onClick={resetRocket}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-2 text-gray-400 text-xs text-center">
          <p>1. Click <strong>🚀 Launch</strong> to shoot rocket up • 2. Click <strong>💥 Explode</strong> to detonate • 3. <strong>🔄 Reset</strong> to restart</p>
        </div>
      </div>
    </div>
  );
};

export default PixiRocketLauncher;