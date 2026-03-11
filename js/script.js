document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Carousel Logic (Simple)
    const carouselContainer = document.querySelector('.carousel-container');
    const slides = document.querySelectorAll('.carousel-slide');
    if (carouselContainer && slides.length > 0) {
        let currentSlide = 0;
        const totalSlides = slides.length;

        setInterval(() => {
            currentSlide = (currentSlide + 1) % totalSlides;
            carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        }, 5000);
    }

    // Scroll Animations
    const scrollElements = document.querySelectorAll('[data-scroll]');
    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('visible');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });
    };

    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });
    handleScrollAnimation(); // Initial check

    // RSS News Fetching
    const newsContainer = document.getElementById('news-container');
    const rssFeeds = [
        'https://www.gazetadopovo.com.br/rss/',
        'https://www.poder360.com.br/feed/',
        'https://revistaoeste.com/feed/',
        'https://jovempan.com.br/feed',
        'https://pleno.news/feed',
        'https://www.metropoles.com/coluna/igor-gadelha/feed',
        'https://www.cnnbrasil.com.br/politica/feed/'
    ];

    if (newsContainer) {
        // Use a small delay to ensure everything is settled
        setTimeout(loadAllFeeds, 100);
    }

    async function loadAllFeeds() {
        if (!newsContainer) return;
        
        // Show loading state
        newsContainer.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 3rem; background: #f9f9f9; border-radius: 10px; border: 1px dashed #ddd;">
                <i class="fas fa-sync fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"></i>
                <p>Sincronizando com as fontes de notícias...</p>
                <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Isso pode levar alguns segundos devido à alta demanda.</p>
            </div>
        `;

        try {
            let allItems = [];
            
            // Fetch feeds sequentially with a small delay to avoid rate limiting (422 errors)
            // We use a slightly more robust URL construction
            for (const feed of rssFeeds) {
                let success = false;
                let retries = 1; // Reduced retries to speed up overall loading
                
                while (!success && retries >= 0) {
                    try {
                        // Using a different approach: no extra params unless retry
                        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}${retries === 0 ? '&nocache=1' : ''}`;
                        const response = await fetch(url);
                        
                        if (response.status === 422) {
                            retries--;
                            if (retries >= 0) {
                                await new Promise(resolve => setTimeout(resolve, 800));
                                continue;
                            }
                            break;
                        }

                        if (!response.ok) break;

                        const result = await response.json();
                        if (result && result.status === 'ok' && Array.isArray(result.items)) {
                            // Add source info to each item
                            const itemsWithSource = result.items.map(item => ({
                                ...item,
                                sourceName: result.feed?.title || 'Fonte'
                            }));
                            allItems = allItems.concat(itemsWithSource);
                            success = true;
                        } else {
                            break;
                        }
                    } catch (err) {
                        break;
                    }
                }
                // Small pause between different feeds
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            if (allItems.length === 0) {
                newsContainer.innerHTML = `
                    <div style="text-align: center; grid-column: 1/-1; padding: 3rem; background: #fff5f5; border-radius: 10px; border: 1px solid #feb2b2;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e53e3e; margin-bottom: 1rem;"></i>
                        <p style="font-weight: 600;">Não foi possível carregar as notícias automaticamente.</p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">O serviço de integração está temporariamente instável. Por favor, utilize os links diretos na lateral.</p>
                        <button onclick="location.reload()" class="btn" style="margin-top: 1.5rem; cursor: pointer; background: #e53e3e;">Tentar Novamente</button>
                    </div>
                `;
                return;
            }

            // Sort by date (most recent first)
            allItems.sort((a, b) => {
                const dateA = new Date(a.pubDate || a.pubdate || 0);
                const dateB = new Date(b.pubDate || b.pubdate || 0);
                return dateB - dateA;
            });

            // Remove duplicates based on title
            const uniqueItems = [];
            const titles = new Set();
            for (const item of allItems) {
                const cleanTitle = (item.title || '').trim().toLowerCase();
                if (cleanTitle && !titles.has(cleanTitle)) {
                    titles.add(cleanTitle);
                    uniqueItems.push(item);
                }
            }

            // Detect if we are on the news page
            const isNewsPage = window.location.pathname.includes('noticias') || document.title.toLowerCase().includes('notícias');
            const limit = isNewsPage ? 20 : 6;
            
            renderNews(uniqueItems.slice(0, limit));
        } catch (error) {
            console.error('Erro geral ao carregar feeds:', error);
            newsContainer.innerHTML = `
                <div style="text-align: center; grid-column: 1/-1; padding: 2rem;">
                    <p>Ocorreu um erro inesperado ao processar as notícias.</p>
                    <button onclick="location.reload()" class="btn" style="margin-top: 1rem; cursor: pointer;">Recarregar</button>
                </div>
            `;
        }
    }

    function renderNews(news) {
        if (!newsContainer) return;
        newsContainer.innerHTML = '';
        
        news.forEach(item => {
            // Clean summary (remove HTML tags and limit to 120 chars)
            let rawDescription = item.description || item.content || '';
            let summary = rawDescription.replace(/<[^>]*>?/gm, '').trim();
            
            if (!summary || summary.length < 10) {
                summary = 'Clique para ler a notícia completa no site original e acompanhar todos os detalhes deste fato.';
            }

            if (summary.length > 140) {
                summary = summary.substring(0, 137) + '...';
            }

            // Fallback image if not present
            let image = item.thumbnail || item.enclosure?.link;
            
            if (!image && rawDescription.includes('<img')) {
                const m = rawDescription.match(/src="([^"]+)"/);
                if (m) image = m[1];
            }

            if (!image) {
                const seed = encodeURIComponent(item.title || 'news');
                image = `https://picsum.photos/seed/${seed}/800/450`;
            }

            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <div class="news-image-container" style="height: 180px; overflow: hidden; position: relative;">
                    <img src="${image}" alt="${item.title || 'Notícia'}" style="width: 100%; height: 100%; object-fit: cover;" referrerPolicy="no-referrer" onerror="this.src='https://picsum.photos/seed/politics/800/450'">
                    <span style="position: absolute; bottom: 0; left: 0; background: var(--primary); color: white; padding: 2px 8px; font-size: 0.7rem; font-weight: 600;">${item.sourceName || 'Notícia'}</span>
                </div>
                <div class="news-card-content">
                    <h3 style="font-size: 1rem; margin-bottom: 0.5rem; line-height: 1.3; height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.title || 'Sem título'}</h3>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 1rem; height: 3.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${summary}</p>
                    <a href="${item.link}" target="_blank" class="btn" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; width: 100%; text-align: center;">Ler na íntegra</a>
                </div>
            `;
            newsContainer.appendChild(card);
        });
    }

    // Copiar chave Pix



    // Contact Form Simulation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mensagem enviada com sucesso!');
            contactForm.reset();
        });
    }
});


function copiarPix(){

let chave = document.getElementById("pixKey")

chave.select()
chave.setSelectionRange(0,99999)

navigator.clipboard.writeText(chave.value)

document.getElementById("pixMsg").innerText =
"Chave Pix copiada com sucesso!"
}