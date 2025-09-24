import React, { useRef, useEffect, useState } from 'react';
import { Application, Assets, Sprite, AnimatedSprite, Texture, Graphics, Container } from 'pixi.js';

const PixiRocketLauncher: React.FC = () => {
  const pixiRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rocketRef = useRef<Sprite | null>(null);
  const explosionRef = useRef<AnimatedSprite | null>(null);
  const containerRef = useRef<Container | null>(null);
  const particlesRef = useRef<Graphics[]>([]);
  const gameStateRef = useRef<'idle' | 'shooting' | 'flying' | 'exploding'>('idle');

  const [gameState, setGameState] = useState<'idle' | 'shooting' | 'flying' | 'exploding'>('idle');

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const initPixi = async () => {
      if (!pixiRef.current) return;

      const app = new Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x001122,
        antialias: true
      });

      pixiRef.current.appendChild(app.canvas);
      appRef.current = app;

      const container = new Container();
      app.stage.addChild(container);
      containerRef.current = container;

      await Assets.load('https://pixijs.com/assets/spritesheet/fighter.json');

      const rocketTexture = Texture.from('rollSequence0000.png');
      const rocket = new Sprite(rocketTexture);

      rocket.x = app.screen.width / 2;
      rocket.y = app.screen.height - 120;
      rocket.anchor.set(0.5, 0.5);
      rocket.scale.set(1);
      rocket.rotation = 0;

      container.addChild(rocket);
      rocketRef.current = rocket;

      const explosionFrames = [];
      for (let i = 0; i < 30; i++) {
        const frameNum = String(i).padStart(4, '0');
        try {
          explosionFrames.push(Texture.from(`rollSequence${frameNum}.png`));
        } catch (e) {
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

      createStarsBackground(container, app);

      app.ticker.add(() => {
        updateAnimation();
      });

      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

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

  const updateAnimation = () => {
    if (!rocketRef.current || !appRef.current) return;

    const rocket = rocketRef.current;
    const app = appRef.current;
    const currentState = gameStateRef.current;

    if (currentState === 'shooting') {
      rocket.y -= 8;
      rocket.x += Math.sin(Date.now() * 0.01) * 1;
      rocket.rotation = Math.sin(Date.now() * 0.008) * 0.05;

      if (rocket.y <= app.screen.height / 2) {
        setGameState('flying');
      }
    }

    if (currentState === 'flying') {
      rocket.y -= 3;
      rocket.x += Math.sin(Date.now() * 0.005) * 2;
      rocket.rotation = Math.sin(Date.now() * 0.004) * 0.1;

      if (rocket.y <= 50) {
        handleExplode();
      }
    }
  };

  const createExplosionParticles = (x: number, y: number, container: Container) => {
    const particles: Graphics[] = [];
    for (let i = 0; i < 50; i++) {
      const particle = new Graphics();
      const colors = [0xFF4400, 0xFFAA00, 0xFFFF00, 0xFF0000, 0xFFCC00];
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.beginFill(color);
      particle.drawCircle(0, 0, Math.random() * 4 + 1);
      particle.endFill();
      particle.x = x;
      particle.y = y;
      (particle as any).vx = (Math.random() - 0.5) * 20;
      (particle as any).vy = (Math.random() - 0.5) * 20;
      (particle as any).gravity = 0.3;
      (particle as any).life = 1.0;
      container.addChild(particle);
      particles.push(particle);
    }

    particlesRef.current = particles;

    const animateParticles = () => {
      particles.forEach((particle, index) => {
        if ((particle as any).life <= 0) {
          container.removeChild(particle);
          particles.splice(index, 1);
          return;
        }
        particle.x += (particle as any).vx;
        particle.y += (particle as any).vy;
        (particle as any).vy += (particle as any).gravity;
        (particle as any).life -= 0.02;
        particle.alpha = (particle as any).life;
        particle.scale.set((particle as any).life);
      });

      if (particles.length > 0) {
        requestAnimationFrame(animateParticles);
      }
    };

    animateParticles();
  };

  const createScreenShake = (container: Container, intensity: number = 15, duration: number = 500) => {
    const originalX = container.x;
    const originalY = container.y;
    let shakeTime = 0;
    const shake = () => {
      if (shakeTime < duration) {
        const progress = shakeTime / duration;
        const currentIntensity = intensity * (1 - progress);
        container.x = originalX + (Math.random() - 0.5) * currentIntensity;
        container.y = originalY + (Math.random() - 0.5) * currentIntensity;
        shakeTime += 16;
        requestAnimationFrame(shake);
      } else {
        container.x = originalX;
        container.y = originalY;
      }
    };
    shake();
  };

  const createExplosionRings = (x: number, y: number, container: Container) => {
    const rings: Graphics[] = [];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const ring = new Graphics();
        ring.lineStyle(4, 0xFFAA00, 1);
        ring.drawCircle(0, 0, 5);
        ring.x = x;
        ring.y = y;
        ring.alpha = 1;
        container.addChild(ring);
        rings.push(ring);
        const expandRing = () => {
          ring.scale.x += 0.3;
          ring.scale.y += 0.3;
          ring.alpha -= 0.03;
          if (ring.alpha > 0) {
            requestAnimationFrame(expandRing);
          } else {
            container.removeChild(ring);
          }
        };
        expandRing();
      }, i * 100);
    }
  };

  const handleShoot = () => {
    if (gameState !== 'idle') return;
    setGameState('shooting');
  };

  const handleExplode = () => {
    if (gameState !== 'shooting' && gameState !== 'flying') return;
    if (!rocketRef.current || !explosionRef.current || !containerRef.current) return;

    const rocket = rocketRef.current;
    const explosion = explosionRef.current;
    const container = containerRef.current;

    createExplosionParticles(rocket.x, rocket.y, container);
    createExplosionRings(rocket.x, rocket.y, container);
    createScreenShake(container, 20, 800);

    rocket.visible = false;
    explosion.x = rocket.x;
    explosion.y = rocket.y;
    explosion.visible = true;
    explosion.scale.set(4);
    explosion.gotoAndPlay(0);

    setGameState('exploding');

    console.log("💥 BOOM! 💥");

    explosion.onComplete = () => {
      setTimeout(() => {
        resetRocket();
      }, 2000);
    };
  };

  const resetRocket = () => {
    if (!appRef.current || !rocketRef.current || !explosionRef.current) return;
    const rocket = rocketRef.current;
    const explosion = explosionRef.current;
    rocket.x = appRef.current.screen.width / 2;
    rocket.y = appRef.current.screen.height - 20;
    rocket.visible = true;
    rocket.rotation = 0;
    explosion.visible = false;
    setGameState('idle');
  };

  return (
    <div className="h-screen bg-gray-900 relative">
      <div ref={pixiRef} className="w-full h-full" />
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-lg p-3 shadow-lg">
        <div className="flex gap-3">
          <button
            onClick={handleShoot}
            disabled={gameState !== 'idle'}
            className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
              gameState === 'idle'
                ? 'bg-green-500 hover:bg-green-600 shadow-lg animate-pulse'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            🚀 Launch
          </button>
          <button
            onClick={handleExplode}
            disabled={gameState !== 'shooting' && gameState !== 'flying'}
            className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
              gameState === 'shooting' || gameState === 'flying'
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
