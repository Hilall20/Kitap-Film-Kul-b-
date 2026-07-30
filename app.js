// SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://rvawesmvmuqpapjyhxzc.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEPjRXV73A4FmIY2gnPgCw_ykXgFYmo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM ELEMENTLERİ
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
    loadPosts(currentCategory);

    if (btnLogin) btnLogin.addEventListener("click", handleLogin);
    if (btnSignup) btnSignup.addEventListener("click", handleSignUp);
    if (postForm) postForm.addEventListener("submit", handlePostSubmit);

    initStarRating();
});

// ==================== SAYFA / GÖRÜNÜM GEÇİŞLERİ ====================

window.switchView = function(view) {
    if (view === 'home') {
        if (feedSection) feedSection.classList.remove("hidden");
        if (postFormSection) postFormSection.classList.add("hidden");
        if (!currentUser && authSection) authSection.classList.add("hidden"); // Ana sayfada giriş formu gizlensin
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
        if (authSection) authSection.classList.add("hidden");
    }
};

window.filterCategory = function(category) {
    currentCategory = category;
    if (feedSection) feedSection.classList.remove("hidden");
    if (postFormSection) postFormSection.classList.add("hidden");
    if (authSection) authSection.classList.add("hidden");

    if (category === 'kitap') {
        feedTitle.innerText = "Kitap İncelemeleri";
    } else if (category === 'film') {
        feedTitle.innerText = "Film İncelemeleri";
    } else {
        feedTitle.innerText = "Tüm İncelemeler";
    }

    loadPosts(category);
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
                <span>👤 <strong>${currentUsername}</strong></span>
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
}

async function handleSignUp() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const username = document.getElementById("username").value.trim();

    if (!email || !password || !username) {
        alert("Lütfen e-posta, şifre ve kullanıcı adı alanlarını doldurun!");
        return;
    }

    const { data: existingUser } = await supabaseClient
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

    if (existingUser) {
        alert("Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı seçin!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: { data: { username: username } }
    });

    if (error) {
        alert("Kayıt hatası: " + error.message);
        return;
    }

    if (data?.user) {
        await supabaseClient.from("profiles").insert([
            { id: data.user.id, username: username }
        ]);
    }

    alert("Kayıt başarılı! Oturum açılıyor...");
    checkUserSession();
    switchView('home');
}

async function handleLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Lütfen e-posta ve şifre alanlarını doldurun!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Giriş hatası: " + error.message);
    } else {
        checkUserSession();
        switchView('home');
    }
}

window.handleLogout = async function() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentUsername = "Hilal";
    checkUserSession();
    switchView('home');
};

// ==================== FORM YÖNETİMİ VE YILDIZLAR ====================

window.switchFormType = function(type) {
    document.getElementById("post-type").value = type;

    const tabBook = document.getElementById("tab-book");
    const tabMovie = document.getElementById("tab-movie");
    const lblTitle = document.getElementById("lbl-title");
    const lblDate = document.getElementById("lbl-date");

    if (type === 'kitap') {
        tabBook.classList.add("active");
        tabMovie.classList.remove("active");
        lblTitle.innerText = "Kitap Adı";
        lblDate.innerText = "Okuma Tarihi";
    } else {
        tabMovie.classList.add("active");
        tabBook.classList.remove("active");
        lblTitle.innerText = "Film Adı";
        lblDate.innerText = "İzleme Tarihi";
    }
};

function initStarRating() {
    const starRatingContainer = document.getElementById("star-rating");
    const ratingInput = document.getElementById("post-rating");
    const ratingDisplay = document.getElementById("rating-value-display");

    if (!starRatingContainer) return;

    starRatingContainer.addEventListener("mousemove", (e) => {
        const stars = starRatingContainer.querySelectorAll(".star");
        let val = 0;

        stars.forEach((star, index) => {
            const rect = star.getBoundingClientRect();
            const starWidth = rect.width;
            const mouseX = e.clientX - rect.left;

            if (mouseX > starWidth / 2 && mouseX <= starWidth) {
                val = index + 1;
            } else if (mouseX <= starWidth / 2 && mouseX >= 0) {
                val = index + 0.5;
            }
        });

        if (val > 0) updateStarsUI(val);
    });

    starRatingContainer.addEventListener("mouseleave", () => {
        const currentVal = parseFloat(ratingInput.value) || 5;
        updateStarsUI(currentVal);
    });

    starRatingContainer.addEventListener("click", (e) => {
        const stars = starRatingContainer.querySelectorAll(".star");
        let val = 0;

        stars.forEach((star, index) => {
            const rect = star.getBoundingClientRect();
            const starWidth = rect.width;
            const mouseX = e.clientX - rect.left;

            if (mouseX > starWidth / 2 && mouseX <= starWidth) {
                val = index + 1;
            } else if (mouseX <= starWidth / 2 && mouseX >= 0) {
                val = index + 0.5;
            }
        });

        if (val > 0) {
            ratingInput.value = val;
            ratingDisplay.innerText = val.toFixed(1);
            updateStarsUI(val);
        }
    });
}

function updateStarsUI(val) {
    const stars = document.querySelectorAll("#star-rating .star");
    stars.forEach((star, index) => {
        const starVal = index + 1;
        star.classList.remove("full", "half");

        if (val >= starVal) {
            star.classList.add("full");
            star.style.background = "none";
            star.style.webkitTextFillColor = "#f39c12";
        } else if (val >= starVal - 0.5) {
            star.classList.add("half");
            star.style.background = "linear-gradient(90deg, #f39c12 50%, #ddd 50%)";
            star.style.webkitBackgroundClip = "text";
            star.style.webkitTextFillColor = "transparent";
        } else {
            star.style.background = "none";
            star.style.webkitTextFillColor = "#ddd";
        }
    });
}

// ==================== POST VE ETKİLEŞİM İŞLEMLERİ ====================

async function handlePostSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("post-title").value;
    const type = document.getElementById("post-type").value;
    const rating = parseFloat(document.getElementById("post-rating").value);
    const comment = document.getElementById("post-comment").value;
    const watchedReadDate = document.getElementById("post-date").value;
    const fileInput = document.getElementById("post-image-file");
    const file = fileInput ? fileInput.files[0] : null;

    let imageUrl = "";

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from('post-imagess')
            .upload(fileName, file);

        if (uploadError) {
            alert("Fotoğraf yükleme hatası: " + uploadError.message);
            return;
        }

        const { data: publicUrlData } = supabaseClient
            .storage
            .from('post-imagess')
            .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabaseClient
        .from("posts")
        .insert([{
            user_id: currentUser ? currentUser.id : null,
            username: currentUsername,
            type: type,
            title: title,
            rating: rating,
            comment: comment,
            image_url: imageUrl,
            watched_read_date: watchedReadDate,
            likes_count: 0
        }]);

    if (error) {
        alert("Paylaşım eklenirken hata oluştu: " + error.message);
    } else {
        postForm.reset();
        switchFormType('kitap');
        document.getElementById("post-rating").value = 5;
        document.getElementById("rating-value-display").innerText = "5.0";
        updateStarsUI(5);
        alert("Paylaşım başarıyla eklendi!");
        switchView('home');
    }
}

async function loadPosts(category = 'all') {
    if (!currentUser) {
        postsContainer.innerHTML = "<p class='loading-text' style='color: #e74c3c;'>🔒 Gönderileri ve incelemeleri görmek için lütfen giriş yapın.</p>";
        if (authSection) authSection.classList.remove("hidden");
        return;
    }

    postsContainer.innerHTML = "<p class='loading-text'>Yükleniyor...</p>";

    let query = supabaseClient
        .from("posts")
        .select(`*, comments (*)`)
        .order("created_at", { ascending: false });

    if (category !== 'all') {
        query = query.eq("type", category);
    }

    const { data: posts, error } = await query;

    if (error) {
        postsContainer.innerHTML = `<p>Paylaşımlar yüklenemedi: ${error.message}</p>`;
        return;
    }

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = "<p>Bu kategoride henüz paylaşım yapılmamış.</p>";
        return;
    }

    postsContainer.innerHTML = "";

    posts.forEach(post => {
        const ratingVal = post.rating || 0;
        const fullStars = Math.floor(ratingVal);
        const hasHalf = (ratingVal % 1) !== 0;
        const emptyStars = 5 - Math.ceil(ratingVal);

        const starsHtml = "★".repeat(fullStars) + (hasHalf ? "⯨" : "") + "☆".repeat(emptyStars);
        const imgTag = post.image_url ? `<img src="${post.image_url}" class="post-image" alt="${post.title}">` : '';

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
        postCard.innerHTML = `
            ${imgTag}
            <div class="post-content">
                <div class="post-header">
                    <span style="cursor: pointer; color: #3498db; font-weight: 600;" onclick="loadUserProfile('${post.user_id}', '${post.username || 'Anonim'}')">
                        👤 ${post.username || 'Anonim'}
                    </span>
                    <span>${post.type === 'kitap' ? '📚 Kitap' : '🎬 Film'}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <div class="post-rating" style="color: #f39c12;">${starsHtml} (${ratingVal}/5)</div>
                <p class="post-comment">${post.comment || ''}</p>
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
        postsContainer.appendChild(postCard);
    });
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

// Belirli bir kullanıcının profil sayfasını ve gönderilerini yükler
window.loadUserProfile = async function(userId, username) {
    if (!currentUser) {
        alert("Profilleri ve paylaşımları görmek için lütfen giriş yapın!");
        return;
    }

    if (feedSection) feedSection.classList.remove("hidden");
    if (postFormSection) postFormSection.classList.add("hidden");
    if (authSection) authSection.classList.add("hidden");

    feedTitle.innerText = `${username} Kullanıcısının Paylaşımları`;
    postsContainer.innerHTML = "<p class='loading-text'>Yükleniyor...</p>";

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select(`*, comments (*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        postsContainer.innerHTML = `<p>Paylaşımlar yüklenemedi: ${error.message}</p>`;
        return;
    }

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `<p>${username} henüz herhangi bir paylaşım yapmamış.</p>`;
        return;
    }

    postsContainer.innerHTML = "";

    posts.forEach(post => {
        const ratingVal = post.rating || 0;
        const fullStars = Math.floor(ratingVal);
        const hasHalf = (ratingVal % 1) !== 0;
        const emptyStars = 5 - Math.ceil(ratingVal);

        const starsHtml = "★".repeat(fullStars) + (hasHalf ? "⯨" : "") + "☆".repeat(emptyStars);
        const imgTag = post.image_url ? `<img src="${post.image_url}" class="post-image" alt="${post.title}">` : '';

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
        postCard.innerHTML = `
            ${imgTag}
            <div class="post-content">
              <div class="post-header">
    <span style="cursor: pointer; color: #3498db; font-weight: 600;" onclick="loadUserProfile('${post.user_id}', '${post.username || 'Anonim'}')">
        👤 ${post.username || 'Anonim'}
    </span>
    <span>${post.type === 'kitap' ? '📚 Kitap' : '🎬 Film'}</span>
</div>
                <h3 class="post-title">${post.title}</h3>
                <div class="post-rating" style="color: #f39c12;">${starsHtml} (${ratingVal}/5)</div>
                <p class="post-comment">${post.comment || ''}</p>
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
        postsContainer.appendChild(postCard);
    });
};
// GÜNCELLENMİŞ loadUserProfile FONKSİYONU
window.loadUserProfile = async function(userId, username) {
    if (!currentUser) {
        alert("Profilleri görmek için lütfen giriş yapın!");
        return;
    }

    // Görünürlük ayarları: Sadece profil alanı ve o kişinin gönderileri görünsün
    if (feedSection) feedSection.classList.remove("hidden");
    if (postFormSection) postFormSection.classList.add("hidden");
    if (authSection) authSection.classList.add("hidden");
    
    // Profil kartı elementlerini seç (HTML'e eklediğimiz yapı)
    const profileSection = document.getElementById("profile-section");
    if (profileSection) profileSection.classList.remove("hidden");

    feedTitle.innerText = `${username} Kullanıcısının Paylaşımları`;
    postsContainer.innerHTML = "<p class='loading-text'>Yükleniyor...</p>";

    // 1. Kullanıcının profil bilgilerini (Bio, Avatar) çek
    const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("bio, avatar_url, username")
        .eq("id", userId)
        .single();

    const bioText = profileData?.bio || "Henüz bir biyografi eklenmemiş.";
    const avatarImg = profileData?.avatar_url || "https://via.placeholder.com/100";

    document.getElementById("profile-username-display").innerText = profileData?.username || username;
    document.getElementById("profile-bio-display").innerText = bioText;
    document.getElementById("profile-avatar-display").src = avatarImg;

    // Eğer bakan kişi kendi profiliyse, düzenleme formunu aç
    const editContainer = document.getElementById("profile-edit-container");
    if (currentUser.id === userId) {
        if (editContainer) editContainer.classList.remove("hidden");
        document.getElementById("profile-bio-input").value = profileData?.bio || "";
    } else {
        if (editContainer) editContainer.classList.add("hidden");
    }

    // 2. Kullanıcının gönderilerini yükle (Aynı mantık)
    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select(`*, comments (*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        postsContainer.innerHTML = `<p>Paylaşımlar yüklenemedi: ${error.message}</p>`;
        return;
    }

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `<p>${username} henüz herhangi bir paylaşım yapmamış.</p>`;
        return;
    }

    postsContainer.innerHTML = "";
    // Gönderi kartlarını basma döngüsü buraya gelecek (Önceki kodlardaki posts.forEach yapısının aynısı)
    // ...
};

// PROFİL GÜNCELLEME İŞLEMİ
document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentUser) return;

            const newBio = document.getElementById("profile-bio-input").value;
            const fileInput = document.getElementById("profile-avatar-file");
            const file = fileInput ? fileInput.files[0] : null;

            let avatarUrl = document.getElementById("profile-avatar-display").src;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `avatar_${currentUser.id}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabaseClient
                    .storage
                    .from('post-imagess') // Veya 'avatars' bucket'ı açtıysan burayı 'avatars' yapabilirsin
                    .upload(fileName, file, { upsert: true });

                if (uploadError) {
                    alert("Avatar yükleme hatası: " + uploadError.message);
                    return;
                }

                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from('post-imagess')
                    .getPublicUrl(fileName);

                avatarUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabaseClient
                .from("profiles")
                .update({ bio: newBio, avatar_url: avatarUrl })
                .eq("id", currentUser.id);

            if (error) {
                alert("Profil güncellenemedi: " + error.message);
            } else {
                alert("Profiliniz başarıyla güncellendi!");
                loadUserProfile(currentUser.id, currentUsername);
            }
        });
    }
});

