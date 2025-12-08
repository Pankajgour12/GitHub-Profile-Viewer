let allRepos = [];
let currentModalRepo = null;
let isBattleMode = false;

const form = document.getElementById("searchForm");
const usernameInput = document.getElementById("usernameInput");
const usernameInput2 = document.getElementById("usernameInput2");
const resultContainer = document.getElementById("resultContainer");
const battleContainer = document.getElementById("battleContainer");
const battleModeBtn = document.getElementById("battleModeBtn");

// Toggle Battle Mode
battleModeBtn.addEventListener("click", () => {
  isBattleMode = !isBattleMode;
  if (isBattleMode) {
    battleModeBtn.innerHTML = `<span>⚔️</span> Battle Mode: ON`;
    battleModeBtn.classList.add("bg-purple-600", "text-white");
    usernameInput2.classList.remove("hidden");
    resultContainer.classList.add("hidden");
    battleContainer.classList.remove("hidden");
    form.classList.add("max-w-4xl");
    form.classList.remove("max-w-xl");
  } else {
    battleModeBtn.innerHTML = `<span>⚔️</span> Battle Mode: OFF`;
    battleModeBtn.classList.remove("bg-purple-600", "text-white");
    usernameInput2.classList.add("hidden");
    resultContainer.classList.remove("hidden");
    battleContainer.classList.add("hidden");
    form.classList.remove("max-w-4xl");
    form.classList.add("max-w-xl");
    battleContainer.innerHTML = "";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user1 = usernameInput.value.trim();
  const user2 = usernameInput2.value.trim();

  if (!user1) return;

  if (isBattleMode) {
    if (!user2) return;
    startBattle(user1, user2);
  } else {
    fetchAndDisplayUser(user1);
  }
});

async function fetchAndDisplayUser(username) {
  resultContainer.innerHTML = `<p class="text-center text-gray-400 text-lg">Loading...</p>`;
  resultContainer.classList.remove("hidden");
  battleContainer.classList.add("hidden");

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
      ),
    ]);

    if (userRes.status === 403 || reposRes.status === 403) {
      throw new Error("API Rate Limit Exceeded. Please wait a while or use a VPN.");
    }
    if (!userRes.ok) throw new Error("User not found");

    const userData = await userRes.json();
    const reposData = await reposRes.json();
    allRepos = reposData;

    displayProfile(userData, allRepos);
    displayFilterBar();
    displayRepos(allRepos);
  } catch (err) {
    resultContainer.innerHTML = `<p class="text-center text-red-500 font-semibold text-lg">❌ ${err.message}</p>`;
  }
}

async function startBattle(u1, u2) {
  battleContainer.innerHTML = `<p class="text-center text-gray-400 text-lg">⚔️ Battling...</p>`;
  
  try {
    const [res1, res2] = await Promise.all([
      fetch(`https://api.github.com/users/${u1}`),
      fetch(`https://api.github.com/users/${u2}`)
    ]);

    if (res1.status === 403 || res2.status === 403) {
      throw new Error("API Rate Limit Exceeded. Please wait a while.");
    }
    if(!res1.ok || !res2.ok) throw new Error("One or both users not found");

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Fetch repos for score calculation (optional, but good for accuracy)
    // For speed in battle, we might just use public_repos count for score approximation
    // or fetch them if needed. Let's fetch to be consistent with score algo.
    const [repos1Res, repos2Res] = await Promise.all([
       fetch(data1.repos_url + "?per_page=100"),
       fetch(data2.repos_url + "?per_page=100")
    ]);
    const repos1 = await repos1Res.json();
    const repos2 = await repos2Res.json();

    displayBattleResults(data1, repos1, data2, repos2);

  } catch (err) {
    battleContainer.innerHTML = `<p class="text-center text-red-500 font-semibold text-lg">❌ ${err.message}</p>`;
  }
}

function calculateProfileScore(user, repos) {
  let score = 0;

  // 1. Bio, Location, Blog (5 pts each)
  if (user.bio) score += 5;
  if (user.location) score += 5;
  if (user.blog) score += 5;

  // 2. Followers (1 pt per 10 followers)
  score += Math.floor(user.followers / 10);

  // 3. Public Repos (2 pts per repo)
  score += user.public_repos * 2;

  // 4. Account Age (10 pts per year)
  const createdYear = new Date(user.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  score += (currentYear - createdYear) * 10;

  // 5. Stars & Forks (from fetched repos)
  if (repos && repos.length > 0) {
    const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
    const totalForks = repos.reduce((acc, r) => acc + r.forks_count, 0);
    
    score += Math.floor(totalStars / 5); // 1 pt per 5 stars
    score += Math.floor(totalForks / 10); // 1 pt per 10 forks
  }

  return score;
}

function getScoreColor(score) {
  // Adjusted thresholds for the new uncapped score
  if (score < 50) return "text-red-500 border-red-500";
  if (score < 150) return "text-yellow-400 border-yellow-400";
  return "text-green-400 border-green-400";
}

function generateBadges(user, repos) {
  const badges = [];

  // 1. Code Machine
  if (user.public_repos > 20) {
    badges.push({ icon: "🤖", label: "Code Machine", color: "text-yellow-300 border-yellow-500 bg-yellow-500/20" });
  }

  // 2. Rising Star
  if (user.followers > 50) {
    badges.push({ icon: "🔥", label: "Rising Star", color: "text-orange-400 border-orange-500 bg-orange-500/20" });
  }

  // 3. Veteran
  const createdYear = new Date(user.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  if (currentYear - createdYear >= 3) {
    badges.push({ icon: "🛡️", label: "Veteran", color: "text-blue-300 border-blue-500 bg-blue-500/20" });
  }

  // 4. Open to Work
  if (user.hireable) {
    badges.push({ icon: "💼", label: "Open to Work", color: "text-green-300 border-green-500 bg-green-500/20" });
  }

  return badges;
}

function displayProfile(user, repos) {
  const score = calculateProfileScore(user, repos);
  
  // --- Metrics Calculation ---
  const fame = Math.min((user.followers / 200) * 100, 100);
  const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
  const impact = Math.min((totalStars / 50) * 100, 100);
  const quantity = Math.min((user.public_repos / 50) * 100, 100);
  const createdYear = new Date(user.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsActive = currentYear - createdYear;
  const activity = Math.min((yearsActive / 10) * 100, 100);

  resultContainer.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-enter">
      
      <!-- Card 1: Main Profile (Span 1 col on desktop for better balance) -->
      <div class="holo-card lg:col-span-1 rounded-2xl p-8 flex flex-col items-center text-center relative overflow-visible">
        
        <div class="relative mb-6 group">
          <div class="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <img src="${user.avatar_url}" alt="${user.login}" class="relative w-48 h-48 rounded-full border-4 border-black shadow-2xl object-cover z-10">
          <div class="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-black rounded-full z-20" title="Online"></div>
        </div>

        <h2 class="text-4xl font-bold text-white tracking-tight font-space mb-2">${user.name || user.login}</h2>
        <a href="${user.html_url}" target="_blank" class="text-cyan-400 hover:text-white transition font-mono text-sm mb-6 block">@${user.login}</a>
        
        <p class="text-gray-400 leading-relaxed mb-8 font-light text-sm">${user.bio || "No bio available."}</p>
        
        <div class="w-full grid grid-cols-2 gap-4 mb-8">
            <div class="bg-white/5 rounded-lg p-3">
                <div class="text-2xl font-bold text-white font-space">${user.followers}</div>
                <div class="text-[10px] text-gray-500 uppercase tracking-widest">Followers</div>
            </div>
            <div class="bg-white/5 rounded-lg p-3">
                <div class="text-2xl font-bold text-white font-space">${user.following}</div>
                <div class="text-[10px] text-gray-500 uppercase tracking-widest">Following</div>
            </div>
        </div>

        <div class="flex flex-wrap justify-center gap-2 w-full">
            ${user.location ? `<span class="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-300 border border-white/10">📍 ${user.location}</span>` : ''}
            ${user.company ? `<span class="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-300 border border-white/10">🏢 ${user.company}</span>` : ''}
            <span class="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-300 border border-white/10">📅 ${createdYear}</span>
        </div>

      </div>

      <!-- Card 2: Stats & Analysis (Span 2 cols) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Key Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="holo-card p-5 rounded-xl flex flex-col items-center justify-center">
                <span class="text-3xl font-bold text-white mb-1 font-space">${user.public_repos}</span>
                <span class="text-xs text-cyan-400 uppercase tracking-widest">Repos</span>
            </div>
            <div class="holo-card p-5 rounded-xl flex flex-col items-center justify-center">
                <span class="text-3xl font-bold text-white mb-1 font-space">${totalStars}</span>
                <span class="text-xs text-fuchsia-400 uppercase tracking-widest">Stars</span>
            </div>
            <div class="holo-card p-5 rounded-xl flex flex-col items-center justify-center">
                <span class="text-3xl font-bold text-white mb-1 font-space">${score}</span>
                <span class="text-xs text-green-400 uppercase tracking-widest">Score</span>
            </div>
            <div class="holo-card p-5 rounded-xl flex flex-col items-center justify-center">
                <span class="text-3xl font-bold text-white mb-1 font-space">${yearsActive}</span>
                <span class="text-xs text-yellow-400 uppercase tracking-widest">Years</span>
            </div>
        </div>

        <!-- Radar Chart -->
        <div class="holo-card rounded-xl p-6 h-[400px] flex items-center justify-center relative">
            <h3 class="absolute top-6 left-6 text-lg font-bold text-white font-space">Dev Profile Analysis</h3>
            <div class="w-full h-full">
                <canvas id="skillsChart"></canvas>
            </div>
        </div>
        
        <!-- Badges -->
        <div class="flex flex-wrap gap-3">
             ${generateBadges(user, repos).map(badge => `
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition cursor-default">
                <span>${badge.icon}</span> ${badge.label}
              </div>
            `).join('')}
        </div>

      </div>

    </div>
  `;

  // Initialize Chart.js (Neon Theme)
  const ctx = document.getElementById('skillsChart').getContext('2d');
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Fame', 'Impact', 'Quantity', 'Activity'],
      datasets: [{
        label: 'Stats',
        data: [fame, impact, quantity, activity],
        backgroundColor: 'rgba(6, 182, 212, 0.2)', // Cyan alpha
        borderColor: '#06b6d4', // Cyan
        borderWidth: 2,
        pointBackgroundColor: '#000',
        pointBorderColor: '#d946ef', // Magenta
        pointHoverBackgroundColor: '#d946ef',
        pointHoverBorderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: {
            color: '#94a3b8', 
            font: { size: 12, family: "'Space Grotesk', sans-serif", weight: 'bold' }
          },
          ticks: { display: false, maxTicksLimit: 5, backdropColor: 'transparent' },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#06b6d4',
          bodyColor: '#fff',
          borderColor: '#d946ef',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          titleFont: { family: "'Space Grotesk', sans-serif" },
          bodyFont: { family: "'Outfit', sans-serif" }
        }
      }
    }
  });

  // Initialize Aura
  initAura(user.public_repos);
}

function initAura(repoCount) {
  const canvas = document.getElementById('auraCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let width, height;
  
  // Set canvas size
  const resize = () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  };
  resize();
  // window.addEventListener('resize', resize); // Optional: if container resizes

  const particles = [];
  const particleCount = Math.min(50 + repoCount, 150); // Cap at 150 particles
  const speedMultiplier = Math.min(1 + (repoCount * 0.01), 3); // Speed based on repos

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.5,
      angle: Math.random() * Math.PI * 2,
      speed: (Math.random() * 0.5 + 0.1) * speedMultiplier,
      orbitRadius: Math.random() * (width / 2 - 20) + 20,
      color: Math.random() > 0.5 ? '#06b6d4' : '#d946ef'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // Center point
    const cx = width / 2;
    const cy = height / 2;

    particles.forEach(p => {
      // Update angle
      p.angle += p.speed * 0.01;
      
      // Calculate position based on orbit
      p.x = cx + Math.cos(p.angle) * p.orbitRadius;
      p.y = cy + Math.sin(p.angle) * p.orbitRadius;
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      
      // Draw connection lines (optional, keep it simple for performance)
    });

    requestAnimationFrame(animate);
  }
  
  animate();
}

function displayFilterBar() {
  const filterHTML = `
    <div id="filterBar" class="flex flex-wrap gap-4 items-center justify-between bg-gradient-to-r from-pink-700 via-purple-900 to-black p-5 rounded-3xl shadow-xl border border-pink-600 mb-12 text-white font-semibold shadow-md hover:scale-[1.01] transition">
      <input
        id="repoSearch"
        type="text"
        placeholder="🔍 Filter Repositories by name..."
        class="flex-grow min-w-[180px] bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3 rounded-3xl text-white placeholder-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-500/80 transition"
      />
      <select
        id="languageFilter"
        class="bg-gradient-to-r from-rose-900 to-gray-800 text-white px-5 py-3 rounded-3xl min-w-[140px] focus:outline-none focus:ring-4 focus:ring-pink-500/80 transition"
      >
        <option value="All" class="text-black">All Languages</option>
        <option value="JavaScript" class="text-black">JavaScript</option>
        <option value="HTML" class="text-black">HTML</option>
        <option value="CSS" class="text-black">CSS</option>
        <option value="Python" class="text-black">Python</option>
        <option value="TypeScript" class="text-black">TypeScript</option>
        <option value="Shell" class="text-black">Shell</option>
        <option value="Other" class="text-black">Other</option>
      </select>
      <input
        id="minStars"
        type="number"
        min="0"
        placeholder="⭐ Min Stars"
        class="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3 rounded-3xl text-white min-w-[150px] placeholder-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-500/80 transition"
      />
      <button id="clearFilters" class="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-3 rounded-3xl font-bold hover:scale-105 transition transform">
        ✖ Clear Filters
      </button>
    </div>
    <div id="repoGrid" class="grid sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8"></div>
  `;

  resultContainer.insertAdjacentHTML("beforeend", filterHTML);

  // Attach filter event listeners
  document.getElementById("repoSearch").addEventListener("input", applyFilters);
  document
    .getElementById("languageFilter")
    .addEventListener("change", applyFilters);
  document.getElementById("minStars").addEventListener("input", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("repoSearch").value = "";
    document.getElementById("languageFilter").value = "All";
    document.getElementById("minStars").value = "";
    applyFilters();
  });
}

function displayBattleResults(u1, r1, u2, r2) {
  const score1 = calculateProfileScore(u1, r1);
  const score2 = calculateProfileScore(u2, r2);
  
  const winner = score1 > score2 ? 1 : score2 > score1 ? 2 : 0; // 0 = tie

  const card1Class = winner === 1 ? "border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]" : "border border-gray-700";
  const card2Class = winner === 2 ? "border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]" : "border border-gray-700";

  battleContainer.innerHTML = `
    <div class="grid md:grid-cols-2 gap-8">
      <!-- User 1 -->
      <div class="bg-gray-900 p-8 rounded-3xl ${card1Class} flex flex-col items-center text-center relative transition-all duration-500">
        ${winner === 1 ? '<div class="absolute -top-6 bg-green-500 text-black font-bold px-4 py-1 rounded-full shadow-lg animate-bounce">WINNER 👑</div>' : ''}
        <img src="${u1.avatar_url}" class="w-32 h-32 rounded-full border-4 border-purple-500 mb-4 shadow-xl">
        <h2 class="text-3xl font-bold text-white mb-2">${u1.name || u1.login}</h2>
        <div class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-6">${score1}</div>
        
        <div class="w-full space-y-3">
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Followers</span>
            <span class="font-bold text-white">${u1.followers}</span>
          </div>
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Public Repos</span>
            <span class="font-bold text-white">${u1.public_repos}</span>
          </div>
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Total Stars</span>
            <span class="font-bold text-white">${r1.reduce((a,b)=>a+b.stargazers_count,0)}</span>
          </div>
        </div>
      </div>

      <!-- User 2 -->
      <div class="bg-gray-900 p-8 rounded-3xl ${card2Class} flex flex-col items-center text-center relative transition-all duration-500">
        ${winner === 2 ? '<div class="absolute -top-6 bg-green-500 text-black font-bold px-4 py-1 rounded-full shadow-lg animate-bounce">WINNER 👑</div>' : ''}
        <img src="${u2.avatar_url}" class="w-32 h-32 rounded-full border-4 border-purple-500 mb-4 shadow-xl">
        <h2 class="text-3xl font-bold text-white mb-2">${u2.name || u2.login}</h2>
        <div class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-6">${score2}</div>
        
        <div class="w-full space-y-3">
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Followers</span>
            <span class="font-bold text-white">${u2.followers}</span>
          </div>
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Public Repos</span>
            <span class="font-bold text-white">${u2.public_repos}</span>
          </div>
          <div class="flex justify-between bg-gray-800 p-3 rounded-xl">
            <span class="text-gray-400">Total Stars</span>
            <span class="font-bold text-white">${r2.reduce((a,b)=>a+b.stargazers_count,0)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function fetchLanguages(owner, repo, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
        if (!res.ok) return;
        const data = await res.json();
        
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        if (total === 0) {
            container.innerHTML = '<div class="w-full h-full bg-gray-700"></div>';
            return;
        }

        // Top 3 languages + others
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const top3 = sorted.slice(0, 3);
        
        let html = '';
        let legendHtml = '';

        top3.forEach(([lang, bytes]) => {
            const percent = ((bytes / total) * 100).toFixed(1);
            const color = getLanguageColor(lang);
            
            // Bar Segment
            html += `
                <div class="h-full" style="width: ${percent}%; background-color: ${color};"></div>
            `;

            // Legend Item
            legendHtml += `
                <div class="flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${color};"></span>
                    <span class="text-gray-300">${lang} <span class="text-gray-500">(${percent}%)</span></span>
                </div>
            `;
        });

        container.innerHTML = html;
        
        // Populate Legend
        const legendContainer = document.getElementById(`tech-stack-legend-${repo}`);
        if (legendContainer) {
            legendContainer.innerHTML = legendHtml;
        }
    } catch (e) {
        console.error("Failed to fetch languages", e);
    }
}

async function toggleFileBrowser(repo, owner, branch, containerId) {
    const container = document.getElementById(containerId);
    if (container.classList.contains("hidden")) {
        container.classList.remove("hidden");
        // Only fetch if not already loaded (check if it has file-tree class or specific content)
        if (!container.querySelector(".file-tree")) {
            await fetchRepoContents(owner, repo, "", container);
        }
    } else {
        container.classList.add("hidden");
    }
}

async function fetchRepoContents(owner, repo, path, container) {
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        // Sort: Folders first, then files
        const sorted = data.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "dir" ? -1 : 1;
        });

        renderFileTree(sorted, container, owner, repo);
    } catch (e) {
        container.innerHTML = `<div class="text-red-400 text-center">Error loading files</div>`;
    }
}

function renderFileTree(files, container, owner, repo) {
    const ul = document.createElement("ul");
    ul.className = "file-tree space-y-1 pl-2";
    
    files.forEach(file => {
        const li = document.createElement("li");
        li.className = "file-tree-item";
        
        if (file.type === "dir") {
            li.innerHTML = `
                <div class="flex items-center gap-2 cursor-pointer hover:text-white group" onclick="toggleFolder(this, '${owner}', '${repo}', '${file.path}')">
                    <span class="text-yellow-400">📁</span>
                    <span class="group-hover:underline">${file.name}</span>
                </div>
                <div class="folder-content hidden ml-4 border-l border-gray-700 pl-2"></div>
            `;
        } else {
            li.innerHTML = `
                <div class="flex items-center gap-2 text-gray-400 hover:text-white">
                    <span class="text-gray-500">📄</span>
                    <span>${file.name}</span>
                </div>
            `;
        }
        ul.appendChild(li);
    });

    // If container is the main container, clear loading text
    if (container.id && container.id.startsWith("browser-")) {
        container.innerHTML = "";
    }
    container.appendChild(ul);
}

async function toggleFolder(element, owner, repo, path) {
    const contentDiv = element.nextElementSibling;
    if (contentDiv.classList.contains("hidden")) {
        contentDiv.classList.remove("hidden");
        if (contentDiv.innerHTML === "") {
            contentDiv.innerHTML = `<div class="text-gray-500 text-xs pl-2">Loading...</div>`;
            await fetchRepoContents(owner, repo, path, contentDiv);
            // Remove loading text if fetchRepoContents appends ul, or clear it inside fetchRepoContents
            // Actually fetchRepoContents appends to container. We should clear loading before appending in renderFileTree or here.
            // Let's adjust renderFileTree to clear container if it was just loading text.
             const loader = contentDiv.querySelector(".text-gray-500");
             if(loader) loader.remove();
        }
    } else {
        contentDiv.classList.add("hidden");
    }
}

// --- Modal Logic ---

const modal = document.getElementById("repoModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalRepoLink = document.getElementById("modalRepoLink");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalFooterBtn = document.getElementById("closeModalFooterBtn");

// Close modal events
[closeModalBtn, closeModalFooterBtn, modalBackdrop].forEach(el => {
  if(el) el.addEventListener("click", closeModal);
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

async function openModal(repoName) {
  const repo = allRepos.find(r => r.name === repoName);
  if (!repo) return;

  currentModalRepo = repo;
  
  // Show Modal
  modal.classList.remove("hidden");
  // Small delay to allow display:block to apply before adding opacity classes for transition
  requestAnimationFrame(() => {
    modal.classList.add("modal-open");
  });

  // Set Header Info
  modalTitle.textContent = repo.name;
  modalRepoLink.href = repo.html_url;

  // Reset Body to Loading
  modalBody.innerHTML = `
    <div class="flex flex-col items-center justify-center h-60 text-gray-400">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mb-4"></div>
      <p class="text-lg animate-pulse">Fetching README...</p>
    </div>
  `;

  // Fetch README
  try {
    // Try main branch first, then master
    let readmeContent = null;
    const branches = [repo.default_branch, "main", "master"];
    
    for (const branch of branches) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${branch}/README.md`);
        if (res.ok) {
          readmeContent = await res.text();
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (readmeContent) {
      // Parse Markdown
      modalBody.innerHTML = marked.parse(readmeContent);
    } else {
      throw new Error("No README found");
    }
  } catch (err) {
    modalBody.innerHTML = `
      <div class="flex flex-col items-center justify-center h-60 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg">No README.md available for this repository.</p>
        <p class="text-sm text-gray-500 mt-2">(${err.message || "404 Not Found"})</p>
      </div>
    `;
  }
}

function closeModal() {
  modal.classList.remove("modal-open");
  setTimeout(() => {
    modal.classList.add("hidden");
    currentModalRepo = null;
  }, 300); // Wait for transition
}

function getLanguageColor(lang) {
  if (!lang) return "#ff6666ff";
  const colors = {
    JavaScript: "#f7df1e",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    TypeScript: "#2b7489",
    Shell: "#89e051",
  };
  return colors[lang] || "#821919ff";
}

function applyFilters() {
  const searchTerm = document
    .getElementById("repoSearch")
    .value.trim()
    .toLowerCase();
  const selectedLang = document.getElementById("languageFilter").value;
  const minStars = Number(document.getElementById("minStars").value) || 0;

  const filtered = allRepos.filter((repo) => {
    const matchesName = repo.name.toLowerCase().includes(searchTerm);
    const matchesLang =
      selectedLang === "All"
        ? true
        : selectedLang === "Other"
        ? ![
            "JavaScript",
            "Python",
            "HTML",
            "CSS",
            "TypeScript",
            "Shell",
          ].includes(repo.language)
        : repo.language === selectedLang;
    const matchesStars = repo.stargazers_count >= minStars;

    return matchesName && matchesLang && matchesStars;
  });

  displayRepos(filtered);
}

function displayRepos(repos) {
  // Initialize Intersection Observer for Tech Stack
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const repoName = entry.target.dataset.repoName;
        const owner = entry.target.dataset.owner;
        const barId = `tech-stack-${repoName}`;
        // Only fetch if empty (not already fetched)
        if (document.getElementById(barId).innerHTML === "") {
           fetchLanguages(owner, repoName, barId);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const html = repos
    .map((repo, index) => {
      const langColor = getLanguageColor(repo.language);
      const lastUpdated = new Date(repo.updated_at).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
      const delay = index * 0.1; 
      
      
      return `
      <div
        class="repo-card block p-6 bg-gradient-to-r from-purple-900 via-gray-900 to-black rounded-3xl shadow-2xl border border-purple-700 hover:border-pink-500 relative overflow-hidden group transition-all duration-300"
        style="animation-delay: ${delay}s;"
        data-tilt
        data-tilt-glare
        data-tilt-max-glare="0.3"
        data-tilt-scale="1.02"
        data-repo-name="${repo.name}"
        data-owner="${repo.owner.login}"
        data-owner="${repo.owner.login}"
      >
        <div onclick="openModal('${repo.name}')" class="cursor-pointer">
            <h3 class="text-white font-extrabold text-xl mb-2 group-hover:text-pink-400 transition-colors">${repo.name}</h3>
            <p class="text-gray-400 line-clamp-3 mb-4">${
            repo.description || "No description."
            }</p>
            <div class="flex flex-wrap items-center gap-4 text-sm text-pink-400 font-semibold mb-4">
            <div class="flex items-center gap-1">
                ⭐ ${repo.stargazers_count}
            </div>
            <div class="flex items-center gap-1">
                🍴 ${repo.forks_count}
            </div>
            <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full" style="background-color: ${langColor};"></span>
                <span>${repo.language || "Unknown"}</span>
            </div>
            <div class="ml-auto text-xs text-gray-400 italic">${lastUpdated}</div>
            </div>
        </div>

        <!-- Tech Stack Bar -->
        <div id="tech-stack-${repo.name}" class="w-full h-3 rounded-full bg-gray-800 overflow-hidden flex mb-2"></div>
        <!-- Tech Stack Legend -->
        <div id="tech-stack-legend-${repo.name}" class="flex flex-wrap gap-3 text-xs font-semibold mb-4"></div>

        <!-- Code Browser Button -->
        <button 
            onclick="toggleFileBrowser('${repo.name}', '${repo.owner.login}', '${repo.default_branch}', 'browser-${repo.name}')"
            class="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
            <span>📂</span> Browse Files
        </button>

        <!-- File Browser Container -->
        <div id="browser-${repo.name}" class="hidden mt-4 p-4 bg-black/50 rounded-xl border border-gray-700 text-sm text-gray-300 max-h-60 overflow-y-auto custom-scrollbar">
            <div class="text-center text-gray-500 italic">Loading files...</div>
        </div>
      </div>
      `;
    })
    .join("");

  const repoGrid = document.getElementById("repoGrid");
  if (!repoGrid) return;

  repoGrid.innerHTML = html;

  // Observe new cards
  document.querySelectorAll(".repo-card").forEach(card => observer.observe(card));

  // Initialize Vanilla Tilt (Desktop Only)
  if (window.innerWidth > 768 && typeof VanillaTilt !== "undefined") {
    VanillaTilt.init(document.querySelectorAll(".repo-card"), {
      max: 15,
      speed: 400,
      glare: true,
      "max-glare": 0.2,
    });
  }
}

// --- Galaxy Modal Logic ---
const galaxyModal = document.getElementById("galaxyModal");
const closeGalaxyBtn = document.getElementById("closeGalaxyBtn");

if (closeGalaxyBtn) {
  closeGalaxyBtn.addEventListener("click", () => {
    galaxyModal.classList.add("hidden");
  });
}

async function openGalaxyModal(username) {
  galaxyModal.classList.remove("hidden");
  const container = document.getElementById("network-graph");
  container.innerHTML = '<div class="flex items-center justify-center h-full text-cyan-400 font-mono animate-pulse">Initializing Physics Simulation...</div>';

  try {
    // Fetch User and Followers
    const [userRes, followersRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/followers?per_page=20`)
    ]);

    const user = await userRes.json();
    const followers = await followersRes.json();

    // Create Nodes
    const nodes = new vis.DataSet([
      { id: 0, label: user.login, image: user.avatar_url, shape: "circularImage", size: 40, color: "#06b6d4" },
      ...followers.map((f, i) => ({
        id: i + 1,
        label: f.login,
        image: f.avatar_url,
        shape: "circularImage",
        size: 20,
        color: "#d946ef"
      }))
    ]);

    // Create Edges
    const edges = new vis.DataSet(
      followers.map((f, i) => ({ from: 0, to: i + 1, color: { color: "#d946ef", opacity: 0.6 } }))
    );

    // Network Data
    const data = { nodes, edges };

    // Options
    const options = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 4,
        color: {
          border: '#06b6d4',
          background: '#000000'
        },
        font: { color: '#ffffff', face: 'Space Grotesk' }
      },
      physics: {
        stabilization: false,
        barnesHut: {
          gravitationalConstant: -8000,
          springConstant: 0.04,
          springLength: 95
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    };

    // Initialize Network
    container.innerHTML = ""; // Clear loading text
    new vis.Network(container, data, options);

  } catch (err) {
    container.innerHTML = `<div class="flex items-center justify-center h-full text-red-500 font-mono">Failed to load Galaxy: ${err.message}</div>`;
  }
}
// --- Matrix Rain Effect ---
function initMatrixRain() {
  const canvas = document.getElementById("matrixCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width, height;

  const resize = () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const columns = Math.floor(width / 20);
  const drops = Array(columns).fill(1);
  
  const chars = "01PANKAJGOUR";

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#06b6d4"; // Cyan
    ctx.font = "15px 'Space Grotesk'";

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * 20, drops[i] * 20);

      if (drops[i] * 20 > height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Initialize Matrix Rain on Load
document.addEventListener("DOMContentLoaded", initMatrixRain);




// Update displayRepos to include sound and 3D props



