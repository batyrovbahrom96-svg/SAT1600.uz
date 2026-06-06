"use client";

import { useEffect, useRef } from "react";

export function HomeThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    async function startScene() {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0.4, 8.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      const ambient = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambient);

      const goldLight = new THREE.PointLight(0xd6c78c, 16, 18);
      goldLight.position.set(-3.4, 3.2, 4.2);
      scene.add(goldLight);

      const blueLight = new THREE.PointLight(0x6fb7ff, 10, 16);
      blueLight.position.set(4.2, -1.8, 3.4);
      scene.add(blueLight);

      const panelMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0x111111,
        metalness: 0.12,
        roughness: 0.18,
        transparent: true,
        opacity: 0.22,
        transmission: 0.35,
        thickness: 0.55
      });
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xd6c78c,
        emissive: 0x3a2f0e,
        metalness: 0.66,
        roughness: 0.24
      });
      const blueMaterial = new THREE.MeshStandardMaterial({
        color: 0x2354ff,
        emissive: 0x081d6d,
        metalness: 0.46,
        roughness: 0.28
      });

      const panelGeometry = new THREE.BoxGeometry(1.92, 1.16, 0.05);
      const panelEdges = new THREE.EdgesGeometry(panelGeometry);
      const panelPositions = [
        [-2.65, 1.38, -0.9],
        [0.05, 1.62, -1.38],
        [2.65, 1.12, -0.85],
        [-1.25, -1.18, -1.15],
        [1.55, -1.32, -0.98]
      ];

      panelPositions.forEach(([x, y, z], index) => {
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(x, y, z);
        panel.rotation.set(0.16 - index * 0.05, -0.36 + index * 0.18, 0.03 * index);
        panel.userData = { spin: 0.0018 + index * 0.00035 };
        group.add(panel);

        const edges = new THREE.LineSegments(panelEdges, edgeMaterial);
        edges.position.copy(panel.position);
        edges.rotation.copy(panel.rotation);
        edges.userData = { follow: panel };
        group.add(edges);
      });

      const ringGeometry = new THREE.TorusGeometry(1.65, 0.018, 12, 120);
      const scoreRing = new THREE.Mesh(ringGeometry, goldMaterial);
      scoreRing.position.set(0.2, 0.05, -1.8);
      scoreRing.rotation.set(1.18, 0.3, -0.14);
      group.add(scoreRing);

      const secondRing = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.012, 12, 140), blueMaterial);
      secondRing.position.set(0.1, 0.03, -2.12);
      secondRing.rotation.set(1.12, -0.24, 0.24);
      group.add(secondRing);

      const dotGeometry = new THREE.SphereGeometry(0.052, 18, 18);
      for (let i = 0; i < 54; i += 1) {
        const angle = (i / 54) * Math.PI * 2;
        const radius = 2.15 + Math.sin(i * 1.7) * 0.16;
        const dot = new THREE.Mesh(dotGeometry, i % 4 === 0 ? goldMaterial : blueMaterial);
        dot.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55, -1.9 + Math.sin(angle * 2) * 0.2);
        dot.userData = { angle, radius, speed: 0.0008 + (i % 7) * 0.00012 };
        group.add(dot);
      }

      const satGroup = new THREE.Group();
      const blockGeometry = new THREE.BoxGeometry(0.42, 0.62, 0.08);
      ["S", "A", "T"].forEach((letter, index) => {
        const block = new THREE.Mesh(blockGeometry, index === 1 ? goldMaterial : panelMaterial);
        block.position.set(index * 0.56 - 0.56, 0, 0);
        block.userData = { letter };
        satGroup.add(block);
      });
      satGroup.position.set(0.05, -0.02, 0.4);
      satGroup.rotation.set(0.15, -0.18, 0.03);
      group.add(satGroup);

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };

      const handlePointer = (event: PointerEvent) => {
        target.x = (event.clientX / window.innerWidth - 0.5) * 2;
        target.y = (event.clientY / window.innerHeight - 0.5) * 2;
      };

      const resize = () => {
        if (!mountRef.current) return;
        const { width, height } = mountRef.current.getBoundingClientRect();
        renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
        camera.aspect = Math.max(width, 1) / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };

      window.addEventListener("pointermove", handlePointer, { passive: true });
      window.addEventListener("resize", resize);
      resize();

      let frame = 0;
      let animationId = 0;
      const animate = () => {
        frame += 1;
        pointer.x += (target.x - pointer.x) * 0.04;
        pointer.y += (target.y - pointer.y) * 0.04;

        group.rotation.y = pointer.x * 0.16;
        group.rotation.x = -pointer.y * 0.07;
        scoreRing.rotation.z += 0.0028;
        secondRing.rotation.z -= 0.0018;
        satGroup.rotation.y = -0.2 + Math.sin(frame * 0.012) * 0.08;
        satGroup.position.y = Math.sin(frame * 0.018) * 0.08;

        group.children.forEach((child) => {
          const follow = child.userData.follow;
          if (follow) {
            child.position.copy(follow.position);
            child.rotation.copy(follow.rotation);
            return;
          }
          if (child.userData.spin) {
            child.rotation.y += child.userData.spin;
          }
          if (typeof child.userData.angle === "number") {
            child.userData.angle += child.userData.speed;
            child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
            child.position.y = Math.sin(child.userData.angle) * child.userData.radius * 0.55;
          }
        });

        renderer.render(scene, camera);
        animationId = window.requestAnimationFrame(animate);
      };
      animate();

      cleanup = () => {
        window.cancelAnimationFrame(animationId);
        window.removeEventListener("pointermove", handlePointer);
        window.removeEventListener("resize", resize);
        renderer.dispose();
        panelGeometry.dispose();
        panelEdges.dispose();
        ringGeometry.dispose();
        dotGeometry.dispose();
        blockGeometry.dispose();
        panelMaterial.dispose();
        edgeMaterial.dispose();
        goldMaterial.dispose();
        blueMaterial.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    }

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <div className="home-three-scene" ref={mountRef} aria-hidden="true" />;
}
