let allRepos = [];
let currentModalRepo = null;

const form = document.getElementById("searchForm");
const usernameInput = document.getElementById("usernameInput");
const resultContainer = document.getElementById("resultContainer");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;

  resultContainer.innerHTML = `<p class="text-center text-gray-400 text-lg">Loading...</p>`;

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

    displayProfile(userData);
    displayFilterBar();
    displayRepos(allRepos);
  } catch (err) {
    resultContainer.innerHTML = `<p class="text-center text-red-500 font-semibold text-lg">❌ ${err.message}</p>`;
  }
});

function displayProfile(user) {
  resultContainer.innerHTML = `
    <div id="profileSection" class="flex flex-col md:flex-row gap-6 items-center bg-gradient-to-r from-purple-900 via-black to-gray-900 p-8 rounded-3xl shadow-2xl border border-pink-600">
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
        <a
          href="${user.html_url}"
          target="_blank"
          class="inline-block mt-6 text-pink-500 underline font-semibold hover:text-pink-400 transition"
        >View Profile on GitHub</a>
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
        class="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3 rounded-3xl text-white w-[120px] placeholder-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-500/80 transition"
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
