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

function displayProfile(user, repos) {
  const score = calculateProfileScore(user, repos);
  const scoreColorClass = getScoreColor(score);

  resultContainer.innerHTML = `
    <div id="profileSection" class="flex flex-col md:flex-row gap-6 items-center bg-gradient-to-r from-purple-900 via-black to-gray-900 p-8 rounded-3xl shadow-2xl border border-pink-600 relative">
      
      <!-- Profile Score Badge -->
      <div class="absolute top-4 right-4 flex flex-col items-center">
        <div class="w-16 h-16 rounded-full border-4 ${scoreColorClass} flex items-center justify-center bg-black/50 shadow-lg backdrop-blur-sm">
          <span class="text-xl font-bold ${scoreColorClass.split(' ')[0]}">${score}</span>
        </div>
        <span class="text-xs text-gray-400 mt-1 font-semibold uppercase tracking-wider">Score</span>
      </div>

      <img
        src="${user.avatar_url}"
        alt="${user.login}"
        class="w-28 h-28 rounded-full border-4 border-pink-500 shadow-lg"
      />
      <div class="flex-1">
        <h2
          class="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
        >
           ${user.name || user.login}
        </h2>
        <p class="italic text-pink-300 mt-3 text-lg">${
          user.bio || "No bio available"
        }</p>
        <p class="mt-4 text-pink-400 flex items-center gap-2 text-lg font-semibold">
          📍
          <span>${user.location || "Unknown"}</span>
        </p>
        <div class="mt-6 flex flex-wrap gap-8 text-white font-semibold text-base">
          <div class="bg-rose-700 bg-opacity-30 rounded-2xl px-6 py-3 shadow-md">
            ⭐ Repos: ${user.public_repos}
          </div>
          <div class="bg-pink-700 bg-opacity-30 rounded-2xl px-6 py-3 shadow-md">
            👥 Followers: ${user.followers}
          </div>
          <div class="bg-pink-700 bg-opacity-30 rounded-2xl px-6 py-3 shadow-md">
            🤝 Following: ${user.following}
          </div>
        </div>
        <div class="flex flex-wrap gap-4 mt-6">
          <a
            href="${user.html_url}"
            target="_blank"
            class="inline-block px-6 py-2 rounded-xl bg-gray-800 text-pink-500 border border-pink-500 font-semibold hover:bg-pink-500 hover:text-white transition"
          >View Profile</a>
          
        </div>
      </div>
    </div>
  `;
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

function displayRepos(repos) {
  const repoGrid = document.getElementById("repoGrid");
  if (!repoGrid) return;

  if (!repos.length) {
    repoGrid.innerHTML = `<p class="text-center text-gray-400 col-span-full text-lg">No matching repositories.</p>`;
    return;
  }

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
      // Staggered animation delay
      const delay = index * 0.1; 
      
      // Note: We use a button or div instead of 'a' tag to prevent default navigation, 
      // but we'll keep 'a' with preventDefault for semantics or just use div for the card.
      // Let's use a div that looks like a card and handle click.
      return `
      <div
        onclick="openModal('${repo.name}')"
        class="repo-card tooltip block p-6 bg-gradient-to-r from-purple-900 via-gray-900 to-black rounded-3xl shadow-2xl border border-purple-700 hover:border-pink-500 cursor-pointer relative overflow-hidden group"
        style="animation-delay: ${delay}s;"
        data-tilt
        data-tilt-glare
        data-tilt-max-glare="0.3"
        data-tilt-scale="1.02"
      >
        <h3 class="text-white font-extrabold text-xl mb-2 group-hover:text-pink-400 transition-colors">${repo.name}</h3>
        <p class="text-gray-400 line-clamp-3 mb-4">${
          repo.description || "No description."
        }</p>
        <div class="flex flex-wrap items-center gap-4 text-sm text-pink-400 font-semibold">
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
        <span class="tooltiptext">Last updated: ${lastUpdated}</span>
      </div>
      `;
    })
    .join("");

  repoGrid.innerHTML = html;

  // Initialize Vanilla Tilt on new elements
  if (typeof VanillaTilt !== "undefined") {
    VanillaTilt.init(document.querySelectorAll(".repo-card"), {
      max: 15,
      speed: 400,
      glare: true,
      "max-glare": 0.2,
    });
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
