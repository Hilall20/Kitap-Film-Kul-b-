// ==================== SUPABASE BAĞLANTISI ====================
const SUPABASE_URL = "https://rvawesmvmuqpapjyhxzc.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEPjRXV73A4FmIY2gnPgCw_ykXgFYmo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== DOM ELEMENTLERİ ====================
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const authSection = document.getElementById("auth-section");
const postFormSection = document.getElementById("post-form-section");
const feedSection = document.getElementById("feed-section");
const userInfoDiv = document.getElementById("user-info");
const postForm = document.getElementById("post-form");
const postsContainer = document.getElementById("posts-container");
const navBtnAdd = document.getElementById("nav-btn-add");
const feedTitle = document.getElementById("feed-title");

// Aktif Kullanıcı ve Filtre Bilgileri
let currentUser = null;
let currentUsername = "Hilal";
let currentCategory = 'all'; // 'all', 'kitap', 'film'

// SAYFA YÜKLENDİĞİNDE BAŞLAT
document.addEventListener("DOMContentLoaded", () => {
    checkUserSession();

    const btnLogin = document.getElementById("btn-login");
    const btnSignup = document.getElementById("btn-signup");

    if (btnLogin) {
        btnLogin.addEventListener("click", async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    if (btnSignup) {
        btnSignup.addEventListener("click", async (e) => {
            e.preventDefault();
            await handleSignUp();
        });
    }

    // Yeni Gönderi Formu Dinleyicisi
    if (postForm) {
        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleCreatePost();
        });
    }

    // Yıldız Puanlama Mantığı
    setupStarRating();
});

// ==================== SAYFA / GÖRÜNÜM GEÇİŞLERİ ====================

window.switchView = function(view) {
    const profileSection = document.getElementById("profile-section");

    if (view === 'home') {
        if (feedSection) feedSection.classList.remove("hidden");
        if (postFormSection) postFormSection.classList.add("hidden");
        if (profileSection) profileSection.classList.add("hidden");
        if (!currentUser && authSection) authSection.classList.remove("hidden");
        loadPosts(currentCategory);
    } else if (view === 'add') {
        if (!currentUser) {
            alert("İçerik paylaşmak için lütfen giriş yapın!");
            if (authSection) authSection.classList.remove("hidden");
            if (feedSection) feedSection.classList.add("hidden");
            return;
        }
        if (postFormSection) postFormSection.classList.remove("hidden");
        if (feedSection) feedSection.classList.add("hidden");
        if (profileSection) profileSection.classList.add("hidden");
        if (authSection) authSection.classList.add("hidden");
    } else if (view === 'profile') {
        if (feedSection) feedSection.classList.add("hidden");
        if (postFormSection) postFormSection.classList.add("hidden");
        if (profileSection) profileSection.classList.remove("hidden");
        if (authSection) authSection.classList.add("hidden");
    }
};

window.filterCategory = function(category) {
    currentCategory = category;
    switchView('home');

    if (category === 'kitap') {
        feedTitle.innerText = "Kitap İncelemeleri";
    } else if (category === 'film') {
        feedTitle.innerText = "Film İncelemeleri";
    } else {
        feedTitle.innerText = "Tüm İncelemeler";
    }

    loadPosts(category);
};

// Kitap / Film Form Türü Değiştirme
window.switchFormType = function(type) {
    const postTypeInput = document.getElementById("post-type");
    const lblTitle = document.getElementById("lbl-title");
    const lblDate = document.getElementById("lbl-date");
    const tabBook = document.getElementById("tab-book");
    const tabMovie = document.getElementById("tab-movie");

    if (postTypeInput) postTypeInput.value = type;

    if (type === 'kitap') {
        if (lblTitle) lblTitle.innerText = "Kitap Adı";
        if (lblDate) lblDate.innerText = "Okuma Tarihi";
        if (tabBook) { tabBook.className = "btn btn-primary active"; }
        if (tabMovie) { tabMovie.className = "btn btn-secondary"; }
    } else {
        if (lblTitle) lblTitle.innerText = "Film Adı";
        if (lblDate) lblDate.innerText = "İzleme Tarihi";
        if (tabMovie) { tabMovie.className = "btn btn-primary active"; }
        if (tabBook) { tabBook.className = "btn btn-secondary"; }
    }
};

// ==================== AUTH (KULLANICI) İŞLEMLERİ ====================

async function checkUserSession() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;

    if (user) {
        if (authSection) authSection.classList.add("hidden");
        if (navBtnAdd) navBtnAdd.classList.remove("hidden");

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

        currentUsername = profile?.username || user.user_metadata?.username || user.email.split('@')[0];

        if (userInfoDiv) {
            userInfoDiv.innerHTML = `
                <span onclick="loadUserProfile('${user.id}', '${currentUsername}')" style="cursor: pointer;" title="Profilime Git">👤 <strong>${currentUsername}</strong></span>
                <button onclick="handleLogout()" class="btn btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">Çıkış</button>
            `;
        }
    } else {
        if (authSection) authSection.classList.remove("hidden");
        if (postFormSection) postFormSection.classList.add("hidden");
        if (navBtnAdd) navBtnAdd.classList.add("hidden");
        if (userInfoDiv) userInfoDiv.innerHTML = "";
        currentUsername = "Hilal";
    }

    if (typeof loadPosts === "function") {
        loadPosts(currentCategory);
    }
}

async function handleLogin() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
        alert("Lütfen e-posta ve şifrenizi girin.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Giriş başarısız: " + error.message);
    } else {
        alert("Başarıyla giriş yapıldı!");
        window.location.reload();
    }
}

async function handleSignUp() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const usernameInput = document.getElementById("username");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const username = usernameInput ? usernameInput.value.trim() : "Kullanici";

    if (!email || !password) {
        alert("Lütfen e-posta ve şifrenizi girin.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { username: username }
        }
    });

    if (error) {
        alert("Kayıt olma başarısız: " + error.message);
    } else {
        alert("Kayıt başarılı! Giriş yapabilirsiniz.");
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        alert("Çıkış yapılırken hata oluştu: " + error.message);
    } else {
        window.location.reload();
    }
}

// ==================== YENİ GÖNDERİ OLUŞTURMA ====================

function setupStarRating() {
    const stars = document.querySelectorAll(".star-rating .star");
    const ratingInput = document.getElementById("post-rating");
    const ratingDisplay = document.getElementById("rating-value-display");

    stars.forEach((star, index) => {
        star.addEventListener("click", () => {
            const val = index + 1;
            if (ratingInput) ratingInput.value = val;
            if (ratingDisplay) ratingDisplay.innerText = val + ".0";

            stars.forEach((s, i) => {
                if (i <= index) {
                    s.style.color = "#f39c12";
                } else {
                    s.style.color = "#ccc";
                }
            });
        });
    });
}

async function handleCreatePost() {
    if (!currentUser) {
        alert("Paylaşım yapmak için giriş yapmalısınız!");
        return;
    }

    const type = document.getElementById("post-type")?.value || "kitap";
    const title = document.getElementById("post-title")?.value.trim();
    const rating = parseFloat(document.getElementById("post-rating")?.value || "5");
    const comment = document.getElementById("post-comment")?.value.trim();
    const watchedReadDate = document.getElementById("post-date")?.value;
    const imageFile = document.getElementById("post-image-file")?.files[0];

    if (!title) {
        alert("Lütfen eser adını girin.");
        return;
    }

    let imageUrl = null;
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Math.random()}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('posts-images')
            .upload(filePath, imageFile);

        if (uploadError) {
            alert("Görsel yüklenemedi: " + uploadError.message);
            return;
        }

        const { data: publicURLData } = supabaseClient.storage
            .from('posts-images')
            .getPublicUrl(filePath);

        imageUrl = publicURLData.publicUrl;
    }

    const { error } = await supabaseClient
        .from("posts")
        .insert([{
            user_id: currentUser.id,
            username: currentUsername,
            type: type,
            title: title,
            rating: rating,
            comment: comment,
            watched_read_date: watchedReadDate,
            image_url: imageUrl,
            likes_count: 0
        }]);

    if (error) {
        alert("Paylaşım kaydedilemedi: " + error.message);
    } else {
        alert("Başarıyla paylaşıldı!");
        document.getElementById("post-form").reset();
        switchView('home');
    }
}

// ==================== POST VE ETKİLEŞİM İŞLEMLERİ ====================

async function loadPosts(category = 'all') {
    if (!currentUser) {
        if (postsContainer) postsContainer.innerHTML = "<p class='loading-text' style='color: #e74c3c;'>🔒 Gönderileri ve incelemeleri görmek için lütfen giriş yapın.</p>";
        if (authSection) authSection.classList.remove("hidden");
        return;
    }

    if (postsContainer) postsContainer.innerHTML = "<p class='loading-text'>Yükleniyor...</p>";

    let query = supabaseClient
        .from("posts")
        .select(`*, comments (*)`)
        .order("created_at", { ascending: false });

    if (category !== 'all') {
        query = query.eq("type", category);
    }

    const { data: posts, error } = await query;

    if (error) {
        if (postsContainer) postsContainer.innerHTML = `<p>Paylaşımlar yüklenemedi: ${error.message}</p>`;
        return;
    }

    if (!posts || posts.length === 0) {
        if (postsContainer) postsContainer.innerHTML = "<p>Bu kategoride henüz paylaşım yapılmamış.</p>";
        return;
    }

    if (postsContainer) postsContainer.innerHTML = "";

    posts.forEach(post => {
        renderPostCard(post, postsContainer);
    });
}

function renderPostCard(post, container) {
    const ratingVal = post.rating || 0;
    const fullStars = Math.floor(ratingVal);
    const hasHalf = (ratingVal % 1) !== 0;
    const emptyStars = 5 - Math.ceil(ratingVal);

    const starsHtml = "★".repeat(fullStars) + (hasHalf ? "⯨" : "") + "☆".repeat(emptyStars);
    const imgTag = post.image_url ? `<img src="${post.image_url}" class="post-image" alt="${post.title}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">` : '';

    const commentsList = (post.comments || []).map(c => `
        <div class="comment-item" style="font-size: 0.85rem; margin-bottom: 4px;">
            <strong>👤 ${c.username}:</strong> <span>${c.comment_text}</span>
        </div>
    `).join('');

    const isOwner = currentUser && post.user_id === currentUser.id;
    const deleteButtonHtml = isOwner 
        ? `<button onclick="deletePost('${post.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background-color: #dc3545; color:white;">🗑️ Sil</button>`
        : '';

    const postCard = document.createElement("div");
    postCard.className = "post-card";
    postCard.style.cssText = "background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);";
    postCard.innerHTML = `
        ${imgTag}
        <div class="post-content">
            <div class="post-header" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="cursor: pointer; color: #3498db; font-weight: 600;" onclick="loadUserProfile('${post.user_id}', '${post.username || 'Anonim'}')">
                    👤 ${post.username || 'Anonim'}
                </span>
                <span>${post.type === 'kitap' ? '📚 Kitap' : '🎬 Film'}</span>
            </div>
            <h3 class="post-title" style="margin-bottom:5px;">${post.title}</h3>
            <div class="post-rating" style="color: #f39c12; margin-bottom:5px;">${starsHtml} (${ratingVal}/5)</div>
            <p class="post-comment" style="margin-bottom:8px;">${post.comment || ''}</p>
            <small style="color:#777;">📅 ${post.watched_read_date || ''}</small>
            
            <hr style="margin: 10px 0; opacity: 0.3;">

            <div class="post-actions" style="display: flex; gap: 10px;">
                <button onclick="likePost('${post.id}', ${post.likes_count || 0})" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background-color: #e74c3c; color:white;">
                    ❤️ Beğen (<span id="like-count-${post.id}">${post.likes_count || 0}</span>)
                </button>
                ${deleteButtonHtml}
            </div>

            <div class="comments-section" style="margin-top: 15px;">
                <h4 style="font-size:0.9rem; margin-bottom:5px;">Yorumlar (${post.comments ? post.comments.length : 0})</h4>
                <div class="comments-list" style="max-height: 120px; overflow-y: auto; margin-bottom: 10px; background:#f9f9f9; padding:5px; border-radius:5px;">
                    ${commentsList || '<p style="font-size: 11px; color: #777;">Henüz yorum yok.</p>'}
                </div>
                
                <div class="add-comment-box" style="display: flex; gap: 5px;">
                    <input type="text" id="comment-input-${post.id}" placeholder="Yorum yaz..." style="flex:1; padding: 5px; font-size:0.85rem;">
                    <button onclick="addComment('${post.id}')" class="btn btn-primary" style="padding: 5px 10px; font-size:0.85rem;">Gönder</button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(postCard);
}

window.likePost = async function(postId, currentLikes) {
    if (!currentUser) {
        alert("Beğeni yapmak için lütfen giriş yapın!");
        return;
    }

    const userId = currentUser.id;

    const { data: existingLike } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();

    if (existingLike) {
        alert("Bu gönderiyi zaten beğendiniz!");
        return;
    }

    const { error: insertError } = await supabaseClient
        .from("likes")
        .insert([{ user_id: userId, post_id: postId }]);

    if (insertError) {
        alert("Beğeni işlemi başarısız: " + insertError.message);
        return;
    }

    const newLikes = currentLikes + 1;
    const likeSpan = document.getElementById(`like-count-${postId}`);
    if (likeSpan) likeSpan.innerText = newLikes;

    await supabaseClient
        .from("posts")
        .update({ likes_count: newLikes })
        .eq("id", postId);
};

window.deletePost = async function(postId) {
    const confirmDelete = confirm("Bu gönderiyi silmek istediğinizden emin misiniz?");
    if (!confirmDelete) return;

    const { error } = await supabaseClient
        .from("posts")
        .delete()
        .eq("id", postId);

    if (error) {
        alert("Silme hatası: " + error.message);
    } else {
        alert("Gönderi başarıyla silindi.");
        loadPosts(currentCategory);
    }
};

window.addComment = async function(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const commentText = input ? input.value.trim() : "";

    if (!commentText) {
        alert("Lütfen bir yorum yazın!");
        return;
    }

    const { error } = await supabaseClient
        .from("comments")
        .insert([{
            post_id: postId,
            username: currentUsername,
            comment_text: commentText
        }]);

    if (error) {
        alert("Yorum eklenirken hata oluştu: " + error.message);
    } else {
        input.value = "";
        loadPosts(currentCategory);
    }
};

// ==================== PROFİL İŞLEMLERİ ====================

window.loadUserProfile = async function(userId, username) {
    if (!currentUser) {
        alert("Profilleri görmek için lütfen giriş yapın!");
        return;
    }

    switchView('profile');

    document.getElementById("profile-username-display").textContent = username;
    document.getElementById("profile-bio-display").textContent = "Yükleniyor...";
    document.getElementById("profile-avatar-display").src = "https://via.placeholder.com/100";

    const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("bio, avatar_url, username")
        .eq("id", userId)
        .single();

    const bioText = profileData?.bio || "Henüz bir biyografi eklenmemiş.";
    const avatarImg = profileData?.avatar_url || "https://via.placeholder.com/100";

    document.getElementById("profile-username-display").textContent = profileData?.username || username;
    document.getElementById("profile-bio-display").textContent = bioText;
    document.getElementById("profile-avatar-display").src = avatarImg;

    const editBtn = document.getElementById("toggle-edit-btn");
    const editContainer = document.getElementById("profile-edit-container");

    if (editContainer) editContainer.classList.add("hidden");

    if (currentUser && currentUser.id === userId) {
        if (editBtn) editBtn.style.display = "inline-block";
        document.getElementById("profile-bio-input").value = profileData?.bio || "";
        
        const usernameInput = document.getElementById("edit-username-input");
        if (usernameInput) usernameInput.value = profileData?.username || username;
    } else {
        if (editBtn) editBtn.style.display = "none";
    }

    // Profil altındaki container'ı profile-posts-container olarak ayarlıyoruz
    let profilePostsContainer = document.getElementById("profile-posts-container");
    if (!profilePostsContainer) {
        // Eğer HTML'de bu ID yoksa profil altına dinamik ekleyelim
        const profileSection = document.getElementById("profile-section");
        profilePostsContainer = document.createElement("div");
        profilePostsContainer.id = "profile-posts-container";
        profileSection.appendChild(profilePostsContainer);
    }

    profilePostsContainer.innerHTML = "<p class='loading-text'>Yükleniyor...</p>";

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select(`*, comments (*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        profilePostsContainer.innerHTML = `<p>Paylaşımlar yüklenemedi: ${error.message}</p>`;
        return;
    }

    if (!posts || posts.length === 0) {
        profilePostsContainer.innerHTML = `<p>${username} henüz herhangi bir paylaşım yapmamış.</p>`;
        return;
    }

    profilePostsContainer.innerHTML = "";
    posts.forEach(post => {
        renderPostCard(post, profilePostsContainer);
    });
};

window.toggleEditForm = function() {
    const editContainer = document.getElementById("profile-edit-container");
    if (editContainer) {
        editContainer.classList.toggle("hidden");
    }
};

// ==================== PROFİL VE ŞİFRE GÜNCELLEME İŞLEMLERİ ====================

const profileInfoForm = document.getElementById("profile-info-form");
if (profileInfoForm) {
    profileInfoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const newUsername = document.getElementById("edit-username-input")?.value.trim();
        const newBio = document.getElementById("profile-bio-input")?.value.trim();
        const avatarFile = document.getElementById("profile-avatar-file")?.files[0];

        let avatarUrl = null;

        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${currentUser.id}_${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('posts-images')
                .upload(filePath, avatarFile);

            if (uploadError) {
                alert("Fotoğraf yüklenirken hata oluştu: " + uploadError.message);
                return;
            }

            const { data: publicURLData } = supabaseClient.storage
                .from('posts-images')
                .getPublicUrl(filePath);
                
            avatarUrl = publicURLData.publicUrl;
        }

        const updateData = {};
        if (newBio !== undefined) updateData.bio = newBio;
        if (newUsername) updateData.username = newUsername;
        if (avatarUrl) updateData.avatar_url = avatarUrl;

        const { error: profileError } = await supabaseClient
            .from("profiles")
            .update(updateData)
            .eq("id", currentUser.id);

        if (profileError) {
            alert("Profil güncellenirken hata: " + profileError.message);
            return;
        }

        alert("Profil bilgileriniz başarıyla güncellendi!");
        window.location.reload();
    });
}

const passwordChangeForm = document.getElementById("password-change-form");
if (passwordChangeForm) {
    passwordChangeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const oldPassword = document.getElementById("old-password-input")?.value.trim();
        const newPassword = document.getElementById("new-password-input")?.value.trim();

        if (!oldPassword || !newPassword) {
            alert("Lütfen hem eski hem de yeni şifrenizi girin.");
            return;
        }

        if (newPassword.length < 6) {
            alert("Yeni şifre en az 6 karakter olmalıdır!");
            return;
        }

        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: oldPassword
        });

        if (signInError) {
            alert("Eski şifrenizi yanlış girdiniz: " + signInError.message);
            return;
        }

        const { error: updateError } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            alert("Şifre güncellenemedi: " + updateError.message);
            return;
        }

        alert("Şifreniz başarıyla değiştirildi!");
        document.getElementById("old-password-input").value = "";
        document.getElementById("new-password-input").value = "";
    });
}