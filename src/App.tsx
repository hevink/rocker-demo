import React, { useRef, useEffect, useState } from 'react';
import { Application, Assets, Sprite, AnimatedSprite, Texture, Graphics, Container } from 'pixi.js';

const PixiRocketLauncher: React.FC = () => {
  const pixiRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rocketRef = useRef<Sprite | null>(null);
  const explosionRef = useRef<AnimatedSprite | null>(null);
  const containerRef = useRef<Container | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'preparing' | 'shooting' | 'flying' | 'exploding'>('idle');
  const [rocketPosition, setRocketPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const initPixi = async () => {
      if (!pixiRef.current) return;

      // Create PIXI Application - Full screen
      const app = new Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
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

      // Position rocket at very bottom (slightly off-screen)
      rocket.x = app.screen.width / 2;
      rocket.y = app.screen.height - 120; // Very close to bottom edge
      rocket.anchor.set(0.5, 0.5);
      rocket.scale.set(1); // Make it bigger
      rocket.rotation = 0; // Keep it vertical (original orientation)

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

    if (gameState === 'preparing') {
      // Move rocket down first (preparation phase)
      rocket.y += 3;

      // Add engine ignition effect
      rocket.rotation = Math.sin(Date.now() * 0.02) * 0.1; // Small wobble around vertical

      // After moving down a bit, start shooting up
      if (rocket.y >= app.screen.height - 5) {
        setGameState('shooting');
      }

      setRocketPosition({ x: rocket.x, y: rocket.y });
    }

    if (gameState === 'shooting') {
      // Move rocket up rapidly
      rocket.y -= 8;

      // Add slight wobble effect
      rocket.x += Math.sin(Date.now() * 0.01) * 1;
      rocket.rotation = Math.sin(Date.now() * 0.008) * 0.05; // Keep mostly vertical

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
      rocket.rotation = Math.sin(Date.now() * 0.004) * 0.1; // Keep mostly vertical

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
    setGameState('preparing'); // Start with preparation phase
  };

  // Handle manual explosion
  const handleExplode = () => {
    if (gameState !== 'preparing' && gameState !== 'shooting' && gameState !== 'flying') return;

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

    // Reset positions to very bottom
    rocket.x = appRef.current.screen.width / 2;
    rocket.y = appRef.current.screen.height - 20;
    rocket.visible = true;
    rocket.rotation = 0; // Reset to vertical

    // Hide explosion
    explosion.visible = false;

    setRocketPosition({ x: rocket.x, y: rocket.y });
    setGameState('idle');
  };

  return (
    <div className="h-screen bg-gray-900 relative">
      {/* PIXI Canvas Container - Full screen */}
      <div ref={pixiRef} className="w-full h-full" />

      {/* Control Panel - Fixed at bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-lg p-3 shadow-lg">
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
    </div>
  );
};

export default PixiRocketLauncher;