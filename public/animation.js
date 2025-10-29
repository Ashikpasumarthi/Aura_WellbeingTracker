
        // Background canvas
        const canvas = document.getElementById('bgCanvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size
        function setCanvasSize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Particle system
        const particles = [];
        const particleCount = 80;
        const maxDistance = 150;

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
            });
        }

        // Hexagons
        const hexagons = [];
        const hexagonCount = 8;

        for (let i = 0; i < hexagonCount; i++) {
            hexagons.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 40 + 30,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
            });
        }

        // Draw hexagon
        function drawHexagon(x, y, size, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = size * Math.cos(angle);
                const hy = size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(hx, hy);
                } else {
                    ctx.lineTo(hx, hy);
                }
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Animation loop
        function animate() {
            // Clear canvas with dark blue background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach((particle, i) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
                ctx.fill();

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    const other = particles[j];
                    const dx = particle.x - other.x;
                    const dy = particle.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(other.x, other.y);
                        const opacity = (1 - distance / maxDistance) * 0.5;
                        ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            });

            // Draw hexagons
            hexagons.forEach((hex) => {
                hex.rotation += hex.rotationSpeed;
                drawHexagon(hex.x, hex.y, hex.size, hex.rotation);
            });

            // Draw glowing orbs
            const time = Date.now() * 0.001;

            // Large orb (top right area)
            const orb1X = canvas.width * 0.85;
            const orb1Y = canvas.height * 0.2;
            const gradient1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, 200);
            gradient1.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
            gradient1.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)');
            gradient1.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.beginPath();
            ctx.arc(orb1X, orb1Y, 200, 0, Math.PI * 2);
            ctx.fillStyle = gradient1;
            ctx.fill();

            // Medium orb (animated)
            const orb2X = canvas.width * 0.3 + Math.sin(time * 0.5) * 100;
            const orb2Y = canvas.height * 0.7 + Math.cos(time * 0.5) * 50;
            const gradient2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, 120);
            gradient2.addColorStop(0, 'rgba(147, 51, 234, 0.3)');
            gradient2.addColorStop(0.5, 'rgba(0, 229, 255, 0.15)');
            gradient2.addColorStop(1, 'rgba(147, 51, 234, 0)');
            ctx.beginPath();
            ctx.arc(orb2X, orb2Y, 120, 0, Math.PI * 2);
            ctx.fillStyle = gradient2;
            ctx.fill();

            requestAnimationFrame(animate);
        }

        animate();

        
        document.getElementById('auraForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const goal = document.getElementById('age').value;
            const activity = document.getElementById('activity-level').value;
            const gender = document.getElementById('gender').value;
            const officeShift = document.getElementById('office-shift').value;

            const officeHours = document.getElementById('office-hours').value;



            if (name && goal && activity) {
                alert(`✨ Your AURA is radiating!\n\nWelcome ${name}! Let's achieve your health goals together.`);

                // Reset form
                this.reset();
            }
        });
