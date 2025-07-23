import { onMount, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

interface ConfettiProps {
  /** The duration of the confetti effect in seconds. Defaults to 5. */
  duration?: number;
  /** The total number of confetti particles. Defaults to 200. */
  particleCount?: number;
  /** An array of color pairs for the front and back of the confetti. */
  colors?: Color[];
}

type Color = {
  front: string;
  back: string;
};

const DEFAULT_PARTICLE_COUNT = 200;
const GRAVITY = 0.5;
const TERMINAL_VELOCITY = 5;
const DRAG = 0.075;
const DEFAULT_COLORS: Color[] = [
  { front: "#f44336", back: "#d32f2f" },
  { front: "#4CAF50", back: "#388E3C" },
  { front: "#2196F3", back: "#1976D2" },
  { front: "#FFEB3B", back: "#FBC02D" },
  { front: "#FF9800", back: "#F57C00" },
  { front: "#E91E63", back: "#C2185B" },
  { front: "#9C27B0", back: "#7B1FA2" },
];

const randomRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

class ConfettiParticle {
  x: number;
  y: number;
  color: Color;
  dimensions: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  velocity: { x: number; y: number };
  wobble: number;
  wobbleSpeed: number;
  spin: number;

  constructor(x: number, y: number, colors: Color[]) {
    this.x = x;
    this.y = y;
    this.color = colors[Math.floor(randomRange(0, colors.length))];

    const baseSize = randomRange(8, 16);
    this.dimensions = {
      x: baseSize,
      y: randomRange(baseSize * 0.8, baseSize * 1.5),
    };

    // A 90-degree cone pointing upwards (from 225 to 315 degrees)
    const angle = randomRange(Math.PI * 1.25, Math.PI * 1.75);

    const blastPower = randomRange(25, 50);

    this.velocity = {
      x: Math.cos(angle) * blastPower,
      y: Math.sin(angle) * blastPower,
    };

    this.spin = randomRange(-0.1, 0.1);
    this.rotation = randomRange(0, 2 * Math.PI);
    this.wobble = randomRange(0, Math.PI * 2);
    this.wobbleSpeed = randomRange(0.05, 0.15);
    this.scale = { x: 1, y: 1 };
  }

  update(): void {
    this.velocity.y += GRAVITY;
    this.velocity.x -= this.velocity.x * DRAG;

    if (this.velocity.y > TERMINAL_VELOCITY) {
      this.velocity.y = TERMINAL_VELOCITY;
    }

    this.x += this.velocity.x;
    this.y += this.velocity.y;

    this.rotation += this.spin;
    this.wobble += this.wobbleSpeed;
    this.scale.y = Math.cos(this.wobble);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(1, this.scale.y);

    ctx.fillStyle = this.scale.y > 0 ? this.color.front : this.color.back;
    ctx.fillRect(
      -this.dimensions.x / 2,
      -this.dimensions.y / 2,
      this.dimensions.x,
      this.dimensions.y,
    );

    ctx.restore();
  }
}

function Confetti(props: ConfettiProps): JSX.Element {
  let canvas: HTMLCanvasElement | undefined;

  onMount(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let confetti: ConfettiParticle[] = [];
    let animationFrameId: number | undefined;

    const resizeCanvas = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const render = (): void => {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      confetti = confetti.filter((particle) => {
        particle.update();
        particle.draw(ctx);
        return (
          particle.y < canvas!.height + 50 &&
          particle.x > -50 &&
          particle.x < canvas!.width + 50
        );
      });

      if (confetti.length > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        animationFrameId = undefined;
      }
    };

    const startConfetti = (): void => {
      resizeCanvas();

      const particleCount = props.particleCount ?? DEFAULT_PARTICLE_COUNT;
      const colors = props.colors ?? DEFAULT_COLORS;

      for (let i = 0; i < particleCount; i++) {
        // Spread over screen width
        const startX = randomRange(canvas!.width * 0.1, canvas!.width * 0.9);
        // Start just below the viewport
        const startY = canvas!.height + randomRange(10, 30);

        confetti.push(new ConfettiParticle(startX, startY, colors));
      }

      if (animationFrameId == null) {
        render();
      }
    };

    window.addEventListener("resize", resizeCanvas);
    startConfetti();

    onCleanup(() => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
    });
  });

  return (
    <canvas
      ref={canvas}
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        "pointer-events": "none",
        "z-index": "5000",
      }}
    />
  );
}

export default Confetti;
