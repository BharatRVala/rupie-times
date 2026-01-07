'use client';

import { useEffect } from 'react';

const useCanvasCursor = () => {
  useEffect(() => {
    // Initialize variables
    let ctx, f;
    let e = 0;
    let pos = { x: 0, y: 0 };
    let lines = [];
    let animationId;
    let colorIndex = 0;
    let smoothColor = { r: 192, g: 147, b: 75, a: 0.35 }; // start color

    // Configuration object
    const E = {
      debug: false,
      friction: 0.5,
      trails: 20,
      size: 50,
      dampening: 0.25,
      tension: 0.98,
    };

    // --- Helper: smooth color interpolation (LERP) ---
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function lerpColor(current, target, t) {
      return {
        r: lerp(current.r, target.r, t),
        g: lerp(current.g, target.g, t),
        b: lerp(current.b, target.b, t),
        a: lerp(current.a, target.a, t),
      };
    }

    // Convert rgba string to object
    function parseRGBA(str) {
      const match = str.match(/rgba?\((\d+),\s?(\d+),\s?(\d+),?\s?([0-9.]+)?\)/);
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: Number(match[4] || 1),
      };
    }

    // Constructor functions
    function Node() {
      this.x = 0;
      this.y = 0;
      this.vy = 0;
      this.vx = 0;
    }

    function Phase(e) {
      this.init(e || {});
    }

    Phase.prototype = {
      init: function(e) {
        this.phase = e.phase || 0;
        this.offset = e.offset || 0;
        this.frequency = e.frequency || 0.001;
        this.amplitude = e.amplitude || 1;
        this._value = 0;
      },
      update: function() {
        this.phase += this.frequency;
        this._value = this.offset + Math.sin(this.phase) * this.amplitude;
        return this._value;
      },
      value: function() {
        return this._value;
      }
    };

    function Line(e) {
      this.init(e || {});
    }

    Line.prototype = {
      init: function(e) {
        this.spring = e.spring + 0.1 * Math.random() - 0.02;
        this.friction = E.friction + 0.01 * Math.random() - 0.002;
        this.nodes = [];
        for (let n = 0; n < E.size; n++) {
          const t = new Node();
          t.x = pos.x;
          t.y = pos.y;
          this.nodes.push(t);
        }
      },
      update: function() {
        let e = this.spring;
        let t = this.nodes[0];
        t.vx += (pos.x - t.x) * e;
        t.vy += (pos.y - t.y) * e;

        for (let i = 0, a = this.nodes.length; i < a; i++) {
          t = this.nodes[i];
          if (i > 0) {
            const n = this.nodes[i - 1];
            t.vx += (n.x - t.x) * e;
            t.vy += (n.y - t.y) * e;
            t.vx += n.vx * E.dampening;
            t.vy += n.vy * E.dampening;
          }
          t.vx *= this.friction;
          t.vy *= this.friction;
          t.x += t.vx;
          t.y += t.vy;
          e *= E.tension;
        }
      },
      draw: function() {
        let n = this.nodes[0].x;
        let i = this.nodes[0].y;
        ctx.beginPath();
        ctx.moveTo(n, i);

        for (let a = 1, o = this.nodes.length - 2; a < o; a++) {
          const e = this.nodes[a];
          const t = this.nodes[a + 1];
          n = 0.5 * (e.x + t.x);
          i = 0.5 * (e.y + t.y);
          ctx.quadraticCurveTo(e.x, e.y, n, i);
        }

        const lastNode = this.nodes[this.nodes.length - 2];
        const finalNode = this.nodes[this.nodes.length - 1];
        ctx.quadraticCurveTo(lastNode.x, lastNode.y, finalNode.x, finalNode.y);
        ctx.stroke();
        ctx.closePath();
      }
    };

    // Event handlers
    function handleMouseMove(event) {
      if (event.touches) {
        pos.x = event.touches[0].pageX;
        pos.y = event.touches[0].pageY;
      } else {
        pos.x = event.clientX;
        pos.y = event.clientY;
      }
      event.preventDefault();
    }

    function handleTouchStart(event) {
      if (event.touches.length === 1) {
        pos.x = event.touches[0].pageX;
        pos.y = event.touches[0].pageY;
      }
    }

    // Canvas functions
    function resizeCanvas() {
      if (ctx && ctx.canvas) {
        ctx.canvas.width = window.innerWidth - 20;
        ctx.canvas.height = window.innerHeight;
      }
    }

    function initLines() {
      lines = [];
      for (let i = 0; i < E.trails; i++) {
        lines.push(new Line({ spring: 0.4 + (i / E.trails) * 0.025 }));
      }
    }

    function render() {
      if (!ctx || !ctx.running) return;

      // Selected color palette
      const COLOR_SET = [
  "rgba(250, 237, 216, 0.89)",     // Gold
  "rgba(253, 235, 209, 0.82)",    // Cream
  "rgba(196, 253, 233, 1)",     // Light Green
  "rgba(124, 255, 209, 0.93)"         // Dark Green
];
      colorIndex = (colorIndex + 0.005) % COLOR_SET.length;
      const targetColor = parseRGBA(COLOR_SET[Math.floor(colorIndex)]);

      // Smooth blend to next color
      smoothColor = lerpColor(smoothColor, targetColor, 0.02);

      ctx.strokeStyle = `rgba(${smoothColor.r}, ${smoothColor.g}, ${smoothColor.b}, ${smoothColor.a})`;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;

      for (let i = 0; i < E.trails; i++) {
        lines[i].update();
        lines[i].draw();
      }

      animationId = requestAnimationFrame(render);
    }

    function startCanvas() {
      const canvas = document.getElementById('canvas-cursor');
      if (!canvas) return;

      ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.running = true;
      f = new Phase({
        phase: Math.random() * 2 * Math.PI,
        amplitude: 85,
        frequency: 0.0015,
        offset: 285
      });

      pos.x = window.innerWidth / 2;
      pos.y = window.innerHeight / 2;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('orientationchange', resizeCanvas);

      resizeCanvas();
      initLines();
      render();
    }

    startCanvas();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (ctx) {
        ctx.running = false;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, []);
};

export default useCanvasCursor;
