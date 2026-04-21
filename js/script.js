// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    document.getElementById('backToTop').classList.toggle('show', window.scrollY > 400);
});

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ===== BACK TO TOP =====
document.getElementById('backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== AOS-LIKE SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.aosDelay || 0;
            setTimeout(() => entry.target.classList.add('aos-animate'), delay);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

// ===== COUNTER ANIMATION =====
const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = +el.dataset.count;
            const duration = 1800;
            const start = performance.now();
            const animate = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(eased * target).toLocaleString('pt-BR') + (target === 1000 ? '+' : '');
                if (progress < 1) requestAnimationFrame(animate);
                else el.textContent = target.toLocaleString('pt-BR') + (target === 1000 ? '+' : '');
            };
            requestAnimationFrame(animate);
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

// ===== INFINITE TESTIMONIALS MARQUEE =====
const marqueeTrack = document.getElementById('marqueeTrack');
if (marqueeTrack) {
    const originals = Array.from(marqueeTrack.children);
    originals.forEach(card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        marqueeTrack.appendChild(clone);
    });
}

// ===== CONTACT FORM =====
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach(f => {
        if (!f.value.trim()) {
            f.style.borderColor = '#e74c3c';
            valid = false;
        } else {
            f.style.borderColor = '';
        }
    });
    if (!valid) return;

    formSuccess.classList.add('show');
    form.reset();
    setTimeout(() => formSuccess.classList.remove('show'), 5000);
});

// Phone mask
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    else if (v.length > 0) v = v.replace(/^(\d{0,2}).*/, '($1');
    e.target.value = v;
});

// Newsletter
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input.value.trim()) {
        const btn = e.target.querySelector('button');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        input.value = '';
        setTimeout(() => btn.innerHTML = '<i class="fas fa-paper-plane"></i>', 2500);
    }
});

// Active section highlight
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 150;
    sections.forEach(section => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
            navLinks.forEach(l => l.classList.remove('active'));
            const active = document.querySelector(`.nav-menu a[href="#${section.id}"]`);
            if (active) active.classList.add('active');
        }
    });
});
