// Family Pulse Logic
// Variables TOKEN and UID are injected by the HTML Shell

let appData = null; let lastTs = 0; let selectedMood = 'happy'; let isBattling = false; let isPinned = false; let logoutTime = 300; let firstLoad = true; let rewardQueue = []; let prevDailyState = false; let deferredPrompt = null; let pendingVoteId = null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// ... rest of your code ...

        function playSound(type) {
            if (audioCtx.state === 'suspended') { audioCtx.resume(); }
            const t = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);

            if (type === 'click') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1); osc.start(t); osc.stop(t + 0.1);
            } 
            else if (type === 'coin') {
                osc.type = 'square'; gain.gain.value = 0.1; osc.frequency.setValueAtTime(987, t); osc.frequency.setValueAtTime(1318, t + 0.08); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5); osc.start(t); osc.stop(t + 0.5);
            } 
            else if (type === 'hit') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.2); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); osc.start(t); osc.stop(t + 0.2);
            }
            else if (type === 'win') {
                playNote(523.25, t, 0.1, 'triangle'); playNote(659.25, t + 0.1, 0.1, 'triangle'); playNote(783.99, t + 0.2, 0.1, 'triangle'); playNote(1046.50, t + 0.3, 0.4, 'square');
            }
            else if (type === 'lose') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(100, t + 0.6); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.6); osc.start(t); osc.stop(t + 0.6);
            }
        }
        function playNote(freq, time, dur, type) {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); osc.type = type; osc.frequency.setValueAtTime(freq, time); gain.gain.setValueAtTime(0.1, time); gain.gain.exponentialRampToValueAtTime(0.01, time + dur); osc.start(time); osc.stop(time + dur);
        }
        
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('installBanner').style.display='flex'; });
        function installPWA(){ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.then((c)=>{ if(c.outcome==='accepted'){console.log('Accepted');} deferredPrompt=null; document.getElementById('installBanner').style.display='none'; }); } }
        function getApiBase() { let path = window.location.pathname; let base = path.substring(0, path.lastIndexOf('/')); return window.location.origin + base; }
        function doLogout() { window.location.href = getApiBase() + "/logout?access_token=" + TOKEN; }

        function fetchData(force) {
            if(isBattling) return;
            let url = `\${getApiBase()}/api/data?access_token=\${TOKEN}&uid=\${UID}&_t=\${new Date().getTime()}`;
            if(firstLoad) url += "&init=true";
            fetch(url).then(r => r.json()).then(data => {
                if(data && (data.ts > lastTs || firstLoad || force)) {
                    appData = data; lastTs = data.ts;
                    let currentDaily = appData.me.dailys.collected;
                    if(!firstLoad && appData.me.dailys.collected === true && prevDailyState === false) { showReward(15, 5, "Dailys Complete!", "All tasks finished!"); }
                    prevDailyState = currentDaily; renderAll();
                    if(firstLoad) { checkWelcome(); firstLoad = false; }
                    if(appData.me.pendingFarm !== null && appData.me.pendingFarm !== undefined) {
                        document.getElementById('farmModal').style.display='none';
                        if(appData.me.pendingFarm) showReward(50, 10, "Worked Hard!", "Great job!"); else showReward(0, 0, "Slacked Off...", "Lazy Chicken!");
                        fetch(`\${getApiBase()}/cmd/clearReward?access_token=\${TOKEN}&uid=\${UID}`);
                    }
                }
            }).catch(e => { console.error("Poll Error", e); });
        }
        function renderAll() {
            if(!appData) return;
            if(appData.me.isAdmin) { document.getElementById('admin-pin').classList.remove('hidden'); document.getElementById('admin-close-poll').classList.remove('hidden'); }
            if(appData.me.dashboardUrl) { document.getElementById('dash-chip').classList.remove('hidden'); }
            checkVisibility('NewFeatures'); renderAnnouncement(); renderStoryBar(); renderFeed(); renderLeaderboards(); renderBulletin(); renderHabits(); renderPoll(); checkVisibility('Leaderboard'); checkVisibility('Bulletin');
        }
        function renderPoll() {
            let container = document.getElementById('pollContainer'); if(!appData.poll) { container.style.display = 'none'; return; }
            container.style.display = 'block'; let p = appData.poll; let html = `<div class="poll-q">\${p.question}</div>`;
            if(p.open && p.myVote === 0) {
                p.options.forEach(o => { html += `<div class="poll-opt" onclick="openVoteConfirm(\${o.id})"><span>\${o.text}</span><i class="far fa-circle"></i></div>`; });
            } else {
                if(!p.open) html += `<div class="poll-closed-badge">CLOSED</div>`;
                p.options.forEach(o => {
                    let pct = (p.total > 0) ? Math.round((o.count / p.total) * 100) : 0; let isMy = (p.myVote === o.id); let cls = isMy ? "poll-opt voted" : "poll-opt"; let icon = isMy ? "<i class='fa fa-check-circle'></i>" : "";
                    html += `<div class="poll-res-row"><div class="poll-res-txt"><span>\${o.text} \${icon}</span><span>\${pct}% (\${o.count})</span></div><div class="poll-bar-bg"><div class="poll-bar-fill" style="width:\${pct}%"></div></div></div>`;
                });
                html += `<div style="font-size:10px; color:#999; margin-top:5px; text-align:right;">Total Votes: \${p.total}</div>`;
            }
            container.innerHTML = html;
        }
        function renderHabits() {
            if(!appData.me.dailys) return; let d = appData.me.dailys;
            document.getElementById('h-post').checked = d.post;
            document.getElementById('h-reply').checked = d.reply;
            document.getElementById('h-like').checked = d.like;
            document.getElementById('h-battle').checked = d.battle;
            document.getElementById('h-adventure').checked = d.adventure; document.getElementById('h-shop').checked = d.shop;
            document.getElementById('h-login').checked = d.login;
            document.getElementById('h-hospital').checked = d.hospital;
            if(d.collected) document.getElementById('habitRewardBanner').style.display='block'; else document.getElementById('habitRewardBanner').style.display='none';
            let ap = appData.me.advProgress || {wilds:0, spooky:0, crazy:0, boss1:false, boss2:false, boss3:false, bossFarmer:false};
            
            let wHtml = (ap.wilds >= 3) ? `<div>Wilds Hunter (3 Wins) ✅</div><div style='color:#f1c40f;'>20xp 10coin</div>` : `<div>Wilds Hunter (3 Wins)</div><div>\${ap.wilds}/3</div>`;
            document.getElementById('goal-wilds').innerHTML = wHtml;
            let sHtml = (ap.spooky >= 3) ? `<div>Spooky Hunter (3 Wins) ✅</div><div style='color:#f1c40f;'>20xp 10coin</div>` : `<div>Spooky Hunter (3 Wins)</div><div>\${ap.spooky}/3</div>`;
            document.getElementById('goal-spooky').innerHTML = sHtml;
            let cHtml = (ap.crazy >= 6) ? `<div>Crazy House Master (6 Wins) ✅</div><div style='color:#f1c40f;'>40xp 20coin</div>` : `<div>Crazy House Master (6 Wins)</div><div>\${ap.crazy || 0}/6</div>`;
            document.getElementById('goal-crazy').innerHTML = cHtml;
            let b1Html = (ap.boss1) ? `<div>Boss: Raven ✅</div><div style='color:#f1c40f;'>50xp 50coin</div>` : `<div>Boss: Raven</div><div style='font-size:10px;'></div>`;
            document.getElementById('goal-boss1').innerHTML = b1Html;
            let b2Html = (ap.boss2) ? `<div>Boss: Owl ✅</div><div style='color:#f1c40f;'>50xp 50coin</div>` : `<div>Boss: Owl</div><div style='font-size:10px;'></div>`;
            document.getElementById('goal-boss2').innerHTML = b2Html;
            let b3Html = (ap.boss3) ? `<div>Boss: Skeleton ✅</div><div style='color:#f1c40f;'>100xp 100coin</div>` : `<div>Boss: Skeleton</div><div style='font-size:10px;'></div>`;
            document.getElementById('goal-boss3').innerHTML = b3Html;
            let bfHtml = (ap.bossFarmer) ? `<div>Boss: Crazy Farmer ✅</div><div style='color:#f1c40f;'>200xp 200coin + Items</div>` : `<div>Boss: Crazy Farmer</div><div style='font-size:10px;'></div>`;
            document.getElementById('goal-boss-farmer').innerHTML = bfHtml;
        }
        function renderLeaderboards() {
            function buildList(list, type) {
                let h = "";
                list.slice(0, 5).forEach((u, idx) => {
                    let sub = "";
                    if(type === 'chicken') sub = `Lvl \${u.level} | \${u.wins}W - \${u.loss}L`;
                    if(type === 'coins') sub = `\${u.coins} Coins`;
                    if(type === 'pulse') sub = `\${u.count} Actions | \${u.likes} Likes`;
                    if(type === 'adventure') sub = `\${u.wins} Wins | \${u.loss} Losses`;
                    h += `<div class="lb-row"><div class="lb-rank">#\${idx+1}</div><div class="lb-info"><div class="lb-name">\${u.chicken || u.user}</div><div class="lb-sub">\${sub}</div></div><div style="font-size:18px;">\${u.avatar}</div></div>`;
                });
                return h || "<div style='padding:10px; opacity:0.7; font-size:12px;'>No data yet</div>";
            }
            document.getElementById('lbChicken').innerHTML = buildList(appData.lbChicken, 'chicken');
            document.getElementById('lbCoins').innerHTML = buildList(appData.lbCoins, 'coins');
            document.getElementById('lbPulse').innerHTML = buildList(appData.lbPulse, 'pulse');
            document.getElementById('lbAdv').innerHTML = buildList(appData.lbAdventure, 'adventure');
        }
        function renderBulletin() {
            let area = document.getElementById('bulletinArea'); if(!appData.bulletin) { area.innerHTML = ""; return; }
            let p = appData.bulletin; let u = getUser(p.uid);
            let moodIcon = ""; if(p.mood) { const moods = {happy:'😄',excited:'🤩',tired:'😴',sad:'😢',sick:'🤢',relaxed:'😌',angry:'😡',silly:'🤪'}; moodIcon = moods[p.mood] || ''; }
            let myReact = p.reactions.find(r => r.uid == UID); let reactColor = myReact ? "#FF6B6B" : "#999"; let reactIcon = myReact ? myReact.emote : "<i class='far fa-heart'></i>";
            let delBtn = (appData.me.isAdmin) ? `<div class="action-item" style="margin-left:auto; color:#ff6b6b;" onclick="clearBulletin()"><i class="fa fa-trash"></i> Unpin</div>` : "";
            let hideBtn = `<div class="visibility-toggle" style="position:absolute; top:15px; right:15px; z-index:20; font-weight:bold; font-size:11px;" onclick="toggleVisibility('Bulletin')"><i class="fa fa-eye-slash"></i> Hide</div>`;
            let html = `<div class="card" style="border:2px solid #d35400; background:#fffdf5; position:relative;">
                \${hideBtn}
                <div style="position:absolute; top:-10px; right:-10px; background:#d35400; color:white; padding:5px 10px; border-radius:15px; font-size:10px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);"><i class="fa fa-thumbtack"></i> BULLETIN</div><div class="feed-header"><div class="feed-avatar">\${u.avatar}</div><div class="feed-meta"><h4>\${u.name}</h4><span>\${timeSince(p.ts)} \${moodIcon}</span></div></div><div class="feed-body">\${p.msg}</div><div class="action-row"><div class="action-item" onclick="this.querySelector('.emote-picker').classList.toggle('show')"><span style="color:\${reactColor};">\${reactIcon} \${p.reactions ? p.reactions.length : 0}</span><div class="emote-picker"><span class="emote-opt" onclick="react('\${p.id}', '👍')">👍</span><span class="emote-opt" onclick="react('\${p.id}', '❤️')">❤️</span><span class="emote-opt" onclick="react('\${p.id}', '😂')">😂</span><span class="emote-opt" onclick="react('\${p.id}', '😢')">😢</span><span class="emote-opt" onclick="react('\${p.id}', '😡')">😡</span></div></div><div class="action-item" onclick="toggleReply('\${p.id}')"><i class="far fa-comment"></i> Reply</div>\${delBtn}</div>\${renderReplies(p)}<div id="reply-box-\${p.id}" style="display:none; margin-top:10px; margin-left:54px;"><input id="reply-input-\${p.id}" class="composer" style="width:100%; padding:10px; border:1px solid #eee; border-radius:10px;" placeholder="Write a reply..."><button class="btn" style="margin-top:5px; width:auto; padding:5px 15px; font-size:12px;" onclick="doReply('\${p.id}')">Send</button></div></div>`;
            area.innerHTML = html;
        }
        function renderFeed() {
            let html = "";
            if(appData.posts.length === 0) html = "<div style='text-align:center; padding:20px; color:#ccc;'>No posts yet!</div>";
            appData.posts.forEach(p => {
                let u = getUser(p.uid); let isSys = (p.type === 'system' || p.type === 'event_farmer'); let sysCls = isSys ? 'border-left:4px solid #FF8E53; background:#fffcf9;' : '';
                let delBtn = (appData.me.isAdmin || p.uid == UID) ? `<div class="action-item" style="margin-left:auto; color:#ff6b6b;" onclick="deletePost('\${p.id}')"><i class="fa fa-trash"></i></div>` : "";
                let moodIcon = ""; if(p.mood) { const moods = {happy:'😄',excited:'🤩',tired:'😴',sad:'😢',sick:'🤢',relaxed:'😌',angry:'😡',silly:'🤪'}; moodIcon = moods[p.mood] || ''; }
                let feedBtn = "";
                if(p.type === 'event_farmer') {
                     let eatenStatus = (p.eaters && p.eaters[UID]) ? p.eaters[UID] : null;
                    if (eatenStatus) {
                         if(eatenStatus === 'won') feedBtn = `<button class="btn" style="margin-top:10px; background:#2ecc71; cursor:default;" disabled>Yum! (+10 XP)</button>`;
                        else feedBtn = `<button class="btn" style="margin-top:10px; background:#7f8c8d; cursor:default;" disabled>Rotten! (0 XP)</button>`;
                    } else { feedBtn = `<button id="btn-farmer-\${p.id}" class="btn" style="margin-top:10px; background:#e67e22;" onclick="eatFarmerFeed('\${p.id}')">🌽 Let Chicken Eat</button>`; }
                }
                
                let msgHtml = p.msg;
                if (isSys && msgHtml.includes("bday-btn")) {
                     let tempDiv = document.createElement('div'); tempDiv.innerHTML = msgHtml;
                     let btn = tempDiv.querySelector('.bday-btn');
                     if(btn) {
                         let owner = parseInt(btn.getAttribute('data-owner'));
                         if(owner === UID) { btn.style.display = 'block'; } else { btn.style.display = 'none'; }
                         msgHtml = tempDiv.innerHTML;
                    }
                }
                
                let myReact = p.reactions.find(r => r.uid == UID); let reactColor = myReact ? "#FF6B6B" : "#999"; let reactIcon = myReact ? myReact.emote : "<i class='far fa-heart'></i>";
                let msgFormatted = msgHtml.replace(/\\n/g, '<br>');
                html += `<div class="card" style="\${sysCls}"><div class="feed-header"><div class="feed-avatar">\${u.avatar}</div><div class="feed-meta"><h4>\${u.name}</h4><span>\${timeSince(p.ts)} \${moodIcon}</span></div></div><div class="feed-body">\${msgFormatted} \${feedBtn}</div><div class="action-row"><div class="action-item" onclick="this.querySelector('.emote-picker').classList.toggle('show')"><span style="color:\${reactColor};">\${reactIcon} \${p.reactions ? p.reactions.length : 0}</span><div class="emote-picker"><span class="emote-opt" onclick="react('\${p.id}', '👍')">👍</span><span class="emote-opt" onclick="react('\${p.id}', '❤️')">❤️</span><span class="emote-opt" onclick="react('\${p.id}', '😂')">😂</span><span class="emote-opt" onclick="react('\${p.id}', '😢')">😢</span><span class="emote-opt" onclick="react('\${p.id}', '😡')">😡</span></div></div><div class="action-item" onclick="toggleReply('\${p.id}')"><i class="far fa-comment"></i> Reply</div>\${delBtn}</div>\${renderReplies(p)}<div id="reply-box-\${p.id}" style="display:none; margin-top:10px; margin-left:54px;"><input id="reply-input-\${p.id}" class="composer" style="width:100%; padding:10px; border:1px solid #eee; border-radius:10px;" placeholder="Write a reply..."><button class="btn" style="margin-top:5px; width:auto; padding:5px 15px; font-size:12px;" onclick="doReply('\${p.id}')">Send</button></div></div>`;
            });
            document.getElementById('feed-container').innerHTML = html;
        }
        function renderReplies(p) {
            if(!p.replies || p.replies.length === 0) return "";
            let h = "<div class='replies'>";
            p.replies.forEach(r => {
                let u = getUser(r.uid);
                let upCount = r.reactions ? r.reactions.filter(x=>x.type=='up').length : 0; let downCount = r.reactions ? r.reactions.filter(x=>x.type=='down').length : 0;
                let myAct = r.reactions ? r.reactions.find(x=>x.uid==UID) : null;
                let upCls = (myAct && myAct.type=='up') ? 'active up' : ''; let downCls = (myAct && myAct.type=='down') ? 'active down' : '';
                let delRep = (appData.me.isAdmin || r.uid == UID) ? `<i class="fa fa-trash" style="margin-left:10px; cursor:pointer; color:#ff6b6b; font-size:10px;" onclick="deleteReply('\${p.id}', '\${r.ts}')"></i>` : "";
                h += `<div class="reply-item"><div style="display:flex; justify-content:space-between;"><div><b>\${u.name}</b> <span style="font-weight:normal">\${r.msg}</span></div>\${delRep}</div><div class="reply-actions"><span class="reply-btn \${upCls}" onclick="reactReply('\${p.id}','\${r.ts}','up')">👍 \${upCount||''}</span><span class="reply-btn \${downCls}" onclick="reactReply('\${p.id}','\${r.ts}','down')">🚽 \${downCount||''}</span></div></div>`;
            });
            return h + "</div>";
        }

function openAdventure(){
            if(appData.me.isWounded) { document.getElementById('unconsciousModal').style.display = 'block'; return; }
            let t = appData.me.advTokens; let maxE = (appData.me.chicken.level>=10)?10:(appData.me.chicken.level>=5?8:6);
            document.getElementById('advTokens').innerText = t + "/" + maxE;
            let p = appData.me.advProgress || {wilds:0, spooky:0, crazy:0, boss1:false, boss2:false, boss3:false, bossFarmer:false};
            document.getElementById('prog-wilds').innerText = `Wins: \${p.wilds}/3`; document.getElementById('prog-spooky').innerText = `Wins: \${p.spooky}/3`; document.getElementById('prog-crazy').innerText = `Wins: \${p.crazy || 0}/6`;
            
            let b1 = document.getElementById('zone-boss1');
            if(p.boss1) { b1.classList.add('completed-boss'); b1.classList.remove('locked'); b1.querySelector('p').innerText = "✅ Defeated"; } 
            else if(p.boss1Att) { b1.classList.add('locked'); b1.querySelector('p').innerText = "Too afraid to Fight"; } 
            else if(p.wilds >= 3) { b1.classList.remove('locked'); b1.classList.remove('completed-boss'); b1.querySelector('p').innerText = "Cost: 0 Energy"; } 
            else { b1.classList.add('locked'); b1.querySelector('p').innerText = `Locked (Need 3 Wilds Wins)`; }
            
            let b2 = document.getElementById('zone-boss2');
            if(p.boss2) { b2.classList.add('completed-boss'); b2.classList.remove('locked'); b2.querySelector('p').innerText = "✅ Defeated"; } 
            else if(p.boss2Att) { b2.classList.add('locked'); b2.querySelector('p').innerText = "Too afraid to Fight"; } 
            else if(p.spooky >= 3) { b2.classList.remove('locked'); b2.classList.remove('completed-boss'); b2.querySelector('p').innerText = "Cost: 0 Energy"; } 
            else { b2.classList.add('locked'); b2.querySelector('p').innerText = `Locked (Need 3 Spooky Wins)`; }
            
            let b3 = document.getElementById('zone-boss3');
            if(p.boss3) { b3.classList.add('completed-boss'); b3.classList.remove('locked'); b3.querySelector('p').innerText = "✅ Defeated"; } 
            else if(p.boss3Att) { b3.classList.add('locked'); b3.querySelector('p').innerText = "Too afraid to Fight"; } 
            else if(p.boss1 && p.boss2) { b3.classList.remove('locked'); b3.querySelector('p').innerText = "Cost: 0 Energy"; } 
            else { b3.classList.add('locked'); b3.querySelector('p').innerText = "Locked (Defeat Raven & Owl)"; }
            
            let sp = document.getElementById('zone-spooky');
            if(appData.me.chicken.level < 5) { sp.classList.add('locked'); sp.querySelector('p').innerText = "Locked (Need Level 5+)"; } else { sp.classList.remove('locked'); sp.querySelector('p').innerText = `Wins: \${p.spooky}/3`; }
            
            let cz = document.getElementById('zone-crazy');
            if(appData.me.chicken.level < 10) { cz.classList.add('locked'); cz.querySelector('p').innerText = "Locked (Need Level 10)"; } else { cz.classList.remove('locked'); cz.querySelector('p').innerText = `Wins: \${p.crazy || 0}/6`; }

            let bf = document.getElementById('zone-boss-farmer');
            let att = p.bossFarmerAtt || 0;
            if(p.bossFarmer) { bf.classList.add('completed-boss'); bf.classList.remove('locked'); bf.querySelector('p').innerText = "✅ Defeated"; } 
            else if(att >= 2) { bf.classList.add('locked'); bf.querySelector('p').innerText = "Attempts Exhausted (2/2)"; } 
            else if((p.crazy || 0) >= 6 && p.boss1 && p.boss2 && p.boss3) { bf.classList.remove('locked'); bf.querySelector('p').innerText = "Cost: 0 Energy"; } 
            else { bf.classList.add('locked'); bf.querySelector('p').innerText = "Locked (Need 6 Crazy Wins + All Bosses)"; }

            let diff = (appData.me.advReset || 0) - appData.serverTime;
            if(diff > 0) { let h = Math.floor(diff/3600000); let m = Math.floor((diff%3600000)/60000); document.getElementById('advTimer').innerText = `Restocking in: \${h}h \${m}m`; document.getElementById('advTimer').style.display='block'; } else { document.getElementById('advTimer').style.display='none'; }
            
            let zDiff = appData.me.dailyResetWait || 0;
            if(zDiff > 0) { let h = Math.floor(zDiff/3600000); let m = Math.floor((zDiff%3600000)/60000); document.getElementById('zoneResetTimer').innerText = `Zone Reset in: \${h}h \${m}m`; document.getElementById('zoneResetTimer').style.display = 'block'; } else { document.getElementById('zoneResetTimer').style.display = 'none'; }
            document.getElementById('adventureModal').style.display='flex';
        }
        function exploreAdventure(zone) {
            if(appData.me.isWounded) { document.getElementById('unconsciousModal').style.display = 'block'; return; }
            if((zone == 'wilds' || zone == 'spooky' || zone == 'crazy_house') && appData.me.advTokens <= 0) { document.getElementById('energyModal').style.display = 'block'; return; }
            closeModal(); isBattling = true;
            document.getElementById('battleContent').innerHTML = `<div style="padding:20px; text-align:center;"><i class="fa fa-circle-notch fa-spin" style="font-size:30px;"></i><br><br>Searching...</div>`;
            document.getElementById('battleModal').style.display='flex';
            fetch(`\${getApiBase()}/cmd/adventure/explore?access_token=\${TOKEN}&uid=\${UID}&zone=\${zone}`).then(r => r.json()).then(d => {
                if(d.status == 'error') { alert(d.msg); closeModal(); return; }
                let area = document.getElementById('battleContent'); let myIcon = appData.me.chicken.icon; let max = d.maxHp;
                area.innerHTML = `<div style="display:flex; justify-content:space-between; padding:15px; background:#eee; border-radius:10px; margin-bottom:10px;"><div id="p1-icon" style="text-align:center; font-size:30px; transition:transform 0.1s;">\${myIcon}</div><div style="font-size:20px; font-weight:bold;">VS</div><div id="p2-icon" style="text-align:center; font-size:30px; transition:transform 0.1s;">\${d.enemyIcon}</div></div><div style="margin-bottom:5px; font-weight:bold; font-size:12px; display:flex; justify-content:space-between;"><span>Me</span> <span id="hp-txt-p1">100/100</span></div><div style="background:#ddd; height:8px; border-radius:4px; margin-bottom:10px;"><div id="p1-bar" style="width:100%; height:100%; background:#2ecc71;"></div></div><div style="margin-bottom:5px; font-weight:bold; font-size:12px; display:flex; justify-content:space-between;"><span>\${d.enemyName}</span> <span id="hp-txt-p2">100/100</span></div><div style="background:#ddd; height:8px; border-radius:4px; margin-bottom:10px;"><div id="p2-bar" style="width:100%; height:100%; background:#e74c3c;"></div></div><div id="bLog" style="height:150px; overflow-y:auto; background:#f9f9f9; padding:10px; font-size:11px; border:1px solid #eee;"><b>\${d.introText}</b></div><button class="btn" style="margin-top:10px; display:none;" id="battleCloseBtn" onclick="closeModal()">Run Away</button>`;
                let turns = d.turns; let i=0; 
                function play() {
                    if(!isBattling) return; 
                    if(i < turns.length) {
                        let t = turns[i]; let msg = t.msg.replace(/Wins!/g, "<b style='color:#2ecc71'>Wins!</b>").replace(/Critical!/g, "<b style='color:#f1c40f'>Critical!</b>");
                        let log = document.getElementById('bLog'); if(log) { log.innerHTML += `<div>\${msg}</div>`; log.scrollTop = log.scrollHeight; }
                        if(t.attHp !== undefined) {
                              document.getElementById('p1-bar').style.width = Math.max(0, (t.attHp/max.att)*100) + "%"; document.getElementById('p2-bar').style.width = Math.max(0, (t.defHp/max.def)*100) + "%";
                              document.getElementById('hp-txt-p1').innerText = `\${Math.floor(t.attHp)}/\${max.att}`; document.getElementById('hp-txt-p2').innerText = `\${Math.floor(t.defHp)}/\${max.def}`;
                        }
                        let p1 = document.getElementById('p1-icon'); let p2 = document.getElementById('p2-icon');
                        if (i > 0) {
                             playSound('hit');
                             if (i % 2 !== 0) {
                                 if(t.event === 'crush') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-crush'); } else if(t.event === 'crit') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-hit'); p2.style.filter = "drop-shadow(0 0 5px red)"; } else if(t.event === 'miss') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-miss'); } else { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-hit'); }
                             } else {
                                 if(t.event === 'crush') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-crush'); } else if(t.event === 'crit') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-hit'); p1.style.filter = "drop-shadow(0 0 5px red)"; } else if(t.event === 'miss') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-miss'); } else { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-hit'); }
                             }
                             setTimeout(() => { if(p1) { p1.className = ''; p1.style.filter = ''; p2.className = ''; p2.style.filter = ''; } }, 350);
                        }
                        i++; setTimeout(play, 800);
                    } else {
                        isBattling = false; fetchData(true);
                        let btn = document.getElementById('battleCloseBtn'); btn.style.display = 'block'; btn.innerText = "Close";
                        if(d.won) { 
                            playSound('win'); btn.style.background="#2ecc71"; btn.innerText="Victory!"; showToast("You Won!"); 
                            let r = d.reward || {};
                            if(d.bossDefeated) {
                                let sub = d.bossDefeated === 'raven' ? "The Skies are Clear!" : (d.bossDefeated === 'owl' ? "The Night is Safe!" : (d.bossDefeated === 'farmer' ? "The Barn is Ours!" : "The Legend is Born!"));
                                document.getElementById('bossSubTxt').innerText = sub; document.getElementById('bossOverlay').style.display = 'flex';
                            }
                            showReward(r.xp || 20, r.coins || 5, r.title || "Victory!", r.sub || "Battle Won");
                        } else { 
                            playSound('lose'); document.getElementById('lossModal').style.display='block';
                            if(d.losses >= 2) { document.getElementById('lossMsg').innerText="You have been knocked Unconscious! (2 Losses)";
                            } else { document.getElementById('lossMsg').innerText="Be careful, 2 losses = Unconscious."; }
                        }
                    }
                }
                play();
            });
        }

function healChicken() { apiCall('hospital/heal', {uid:UID}); closeModal(); let pop = document.getElementById('revivePopup'); if(pop) { pop.style.display = 'block'; setTimeout(() => { pop.style.display = 'none'; }, 3000); } }
        function buyItem(item) { apiCall('shop/buy', {uid:UID, item:item}, (d) => { if(d.status == 'success') { showToast(d.msg); closeModal(); fetchData(true); } else { alert(d.msg); } }); }  
        function openShop(){ 
            apiCall('shop/visit', {uid:UID}); let coins = appData.me.chicken.coins; document.getElementById('shopCoins').innerText = coins; 
            let b1 = document.getElementById('buy-feed'); let bSuper = document.getElementById('buy-super-feed'); let b2 = document.getElementById('buy-steroid'); let bEnergy = document.getElementById('buy-energy');
            let bHormone = document.getElementById('buy-hormone'); let bBox = document.getElementById('buy-box'); let bSword = document.getElementById('buy-sword'); let bShield = document.getElementById('buy-shield');
            let curEnergy = appData.me.advTokens;
            if(appData.me.dailyFeeds >= 2) { b1.disabled = true; b1.innerText = "Sold Out"; } else if(coins < 20) { b1.disabled = true; b1.innerText = "Need 20 💰"; } else { b1.disabled = false; b1.innerText = "20 💰"; }
            let sFeedCount = (appData.me.chicken.inventory && appData.me.chicken.inventory.super_feed) ? appData.me.chicken.inventory.super_feed : 0;
            if(appData.me.dailySuperFeeds >= 2) { bSuper.disabled = true; bSuper.innerText = "Sold Out"; } else if(sFeedCount >= 4) { bSuper.disabled = true; bSuper.innerText = "Full (Max 4)"; } else if(coins < 200) { bSuper.disabled = true; bSuper.innerText = "Need 200 💰"; } else { bSuper.disabled = false; bSuper.innerText = "200 💰"; }
            if(appData.me.dailyShots >= 2) { b2.disabled = true; b2.innerText = "Sold Out"; } else if(coins < 50) { b2.disabled = true; b2.innerText = "Need 50 💰"; } else { b2.disabled = false; b2.innerText = "50 💰"; }
            if(appData.me.dailyEnergy >= 2) { bEnergy.disabled = true; bEnergy.innerText = "Sold Out"; } else if(curEnergy > 0) { bEnergy.disabled = true; bEnergy.innerText = "Unavailable"; } else if(coins < 15) { bEnergy.disabled = true; bEnergy.innerText = "Need 15 💰"; } else { bEnergy.disabled = false; bEnergy.innerText = "15 💰"; }
            if(appData.me.chicken.level >= 10) { bHormone.disabled = true; bHormone.innerText = "Max Lvl"; } else if(appData.me.dailyHormones >= 5) { bHormone.disabled = true; bHormone.innerText = "Sold Out"; } else if(coins < 100) { bHormone.disabled = true; bHormone.innerText = "Need 100 💰"; } else { bHormone.disabled = false; bHormone.innerText = "100 💰"; }
            if(coins < 150) { bBox.disabled = true; bBox.innerText = "Need 150 💰"; } else { bBox.disabled = false; bBox.innerText = "150 💰"; }
            let hasSword = (appData.me.chicken.inventory && appData.me.chicken.inventory.chicken_sword) ? 1 : 0;
            if (hasSword) { bSword.disabled = true; bSword.innerText = "Owned"; } else if (appData.me.chicken.level < 10) { bSword.disabled = true; bSword.innerText = "Lvl 10 Req"; } else if (coins < 1000) { bSword.disabled = true; bSword.innerText = "Need 1000 💰"; } else { bSword.disabled = false; bSword.innerText = "1000 💰"; }
            let hasShield = (appData.me.chicken.inventory && appData.me.chicken.inventory.chicken_shield) ? 1 : 0;
            if (hasShield) { bShield.disabled = true; bShield.innerText = "Owned"; } else if (appData.me.chicken.level < 10) { bShield.disabled = true; bShield.innerText = "Lvl 10 Req"; } else if (coins < 1000) { bShield.disabled = true; bShield.innerText = "Need 1000 💰"; } else { bShield.disabled = false; bShield.innerText = "1000 💰"; }
			let bLure = document.getElementById('buy-lure'); if(appData.me.dailyBossLures >= 2) { bLure.disabled = true; bLure.innerText = "Sold Out"; } else if(coins < 150) { bLure.disabled = true; bLure.innerText = "Need 150 💰"; } else { bLure.disabled = false; bLure.innerText = "150 💰"; }
            document.getElementById('shopModal').style.display='flex';
        }
        function openCoop() { 
            let c = appData.me.chicken; let chickenIcon = c.icon || "🐔"; let inv = c.inventory || {}; let feedCount = inv.feed || 0; let sFeedCount = inv.super_feed || 0;
            let tiredHtml = appData.me.isTired ? "<span class='tired-tag'>TIRED</span>" : ""; let woundedHtml = appData.me.isWounded ? "<span class='tired-tag' style='background:#c0392b;'>UNCONSCIOUS</span>" : "";
            let cur = c.currentHp !== undefined ? c.currentHp : c.stats.hp; let max = c.stats.hp; let hpPct = Math.min(100, (cur/max)*100); let hpColor = (cur < (max*0.3)) ? "#e74c3c" : "#2ecc71";
            let xpPct = (c.level >= 10) ? 100 : (c.xp/c.xpToNext)*100; let xpText = (c.level >= 10) ? "MAX LEVEL" : `\${c.xp} / \${c.xpToNext} XP`;
            let hasSword = (inv.chicken_sword) ? 1 : 0; let hasShield = (inv.chicken_shield) ? 1 : 0;
            let atkSuff = hasSword ? "<span style='color:#e74c3c; font-size:11px; font-weight:bold;'> (+100)</span>" : ""; let defSuff = hasShield ? "<span style='color:#e74c3c; font-size:11px; font-weight:bold;'> (+100)</span>" : ""; let critSuff = hasSword ? "<span style='color:#e74c3c; font-size:11px; font-weight:bold;'> (+10%)</span>" : "";
            let gearHtml = ""; if(hasSword) gearHtml += `<span title="Chicken Sword (+100 ATK, +10% Crit)" style="font-size:20px; margin-right:5px;">⚔️</span>`; if(hasShield) gearHtml += `<span title="Chicken Shield (+100 DEF)" style="font-size:20px;">🛡️</span>`; if(gearHtml === "") gearHtml = "<span style='font-size:10px; color:#aaa;'>No Gear</span>";
            let html = `<div class="coop-help-icon" onclick="openCoopHelp()"><i class="fa fa-question-circle"></i></div>
                <div class="chicken-header"><div class="chicken-icon">\${chickenIcon}</div><div><h2 style="margin:0; color:#d35400; cursor:pointer;" onclick="renameChicken()">\${c.name} \${tiredHtml} \${woundedHtml} <i class="fa fa-pencil" style="font-size:12px; color:#999;"></i></h2><span style="font-size:12px; font-weight:bold; color:#e67e22;">LEVEL \${c.level}</span></div></div>
                <div style="margin-bottom:5px; font-size:11px; font-weight:bold; color:#555; display:flex; justify-content:space-between;"><span>Health</span><span>\${cur} / \${max}</span></div>
                <div style="background:#ddd; height:12px; border-radius:10px; overflow:hidden; margin-bottom:15px; border:1px solid #ccc;"><div style="width:\${hpPct}%; background:\${hpColor}; height:100%;"></div></div>
                <div style="background:#eee; height:10px; border-radius:10px; overflow:hidden;"><div style="width:\${xpPct}%; background:#3498db; height:100%;"></div></div>
                <div style="display:flex; justify-content:center; font-size:11px; color:#666; margin-top:3px;"><span>\${xpText}</span></div>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <div style="flex:1; background:rgba(255,255,255,0.6); padding:10px; border-radius:10px; display:flex; flex-direction:column; align-items:center; gap:2px; font-size:12px;"><div style="font-weight:bold; color:#777;">Supplies</div><div><i class="fa fa-coins" style="color:#f1c40f;"></i> <b>\${c.coins}</b> | 🌽 <b>\${feedCount}</b> | 🌟 <b>\${sFeedCount}</b></div></div>
                    <div style="flex:1; background:rgba(255,255,255,0.6); padding:10px; border-radius:10px; display:flex; flex-direction:column; align-items:center; gap:2px; font-size:12px;"><div style="font-weight:bold; color:#777;">Gear</div><div>\${gearHtml}</div></div>
                </div>
                <div style="margin-top:15px; font-weight:800; color:#d35400;">STATS <span id='coop-pts-wrapper' style='color:red; display:\${c.pts > 0 ? "inline" : "none"}'> (+<span id='coop-pts'>\${c.pts}</span>)</span></div>
                <div class="stat-grid">\${renderStatBtn('hp', c.stats.hp, c.pts, '')} \${renderStatBtn('atk', c.stats.atk, c.pts, atkSuff)} \${renderStatBtn('def', c.stats.def, c.pts, defSuff)} \${renderStatBtn('crit', c.stats.crit, c.pts, critSuff)}</div>
                <button class="btn" style="margin-top:15px; background:linear-gradient(135deg, #e67e22, #d35400);" onclick="closeModal(); openBattleMenu()">⚔️ ENTER ARENA</button>`; 
            document.getElementById('coopContent').innerHTML = html; document.getElementById('coopModal').style.display = 'flex'; 
        }
        function renderStatBtn(lbl, val, pts) { let btn = pts > 0 ? `<span id="btn-train-\${lbl}" class="tr-btn" onclick="train('\${lbl}')">+</span>` : ""; return `<div class="stat-box"><div class="stat-val"><span id="sv-\${lbl}">\${val}</span> \${btn}</div><div class="stat-lbl">\${lbl}</div></div>`; }
        function openBattleMenu() {
            let h = `<h3 style="margin:0 0 10px 0;">Battle Arena</h3>`; let now = appData.serverTime;
            appData.users.forEach(u => {
                if(u.id != UID) {
                    let cd = appData.me.cooldowns[u.id]; let locked = cd ? true : false; let isWounded = u.isWounded;
                    let cls = (locked || isWounded) ? "opacity:0.5; cursor:default;" : "cursor:pointer;"; let txt = "Fight!"; let btnStyle = "";
                    if (isWounded) { txt = "Unconscious"; btnStyle = "background:#95a5a6; cursor:default;"; locked = true; } 
                    else if (locked) { let diff = cd - now; let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); txt = `\${hours}h \${minutes}m`; btnStyle = "background:#ccc; cursor:default;"; }
                    let curHp = u.hp !== undefined ? u.hp : 100; let maxHp = u.maxHp !== undefined ? u.maxHp : 100; let pct = Math.min(100, Math.max(0, (curHp/maxHp)*100));
                    h += `<div style="padding:10px; border:1px solid #eee; margin-bottom:5px; border-radius:10px; \${cls}" onclick="\${locked?'':'startBattle('+u.id+')'}"><div style="display:flex; justify-content:space-between; align-items:center;"><div>\${u.icon||'🐔'} <b>\${u.name}</b></div><button class="btn" style="width:auto; padding:5px 10px; font-size:12px; \${btnStyle}">\${txt}</button></div><div style="font-size:10px; color:#777; margin-top:2px;">HP: \${curHp} / \${maxHp}</div><div class="hp-mini-bar"><div class="hp-mini-fill" style="width:\${pct}%"></div></div></div>`;
                }
            });
            let fLocked = !appData.me.farmAvailable; let waitMsg = ""; let btnStyle = "";
            if(appData.me.isWounded) { waitMsg = "🚑 Unconscious (Go to Hospital)"; btnStyle = "background:#c0392b; border-bottom:5px solid #922b21; cursor:default; opacity:0.8;"; fLocked = true;
            } else if(appData.me.isTired) { waitMsg = "😴 Chicken Tired (Battled Too Much)"; btnStyle = "background:#95a5a6; border-bottom:5px solid #7f8c8d; cursor:default; opacity:0.8;"; fLocked = true;
            } else if(fLocked) { let farmWait = appData.me.farmWait; if(farmWait > 0) { let s = Math.floor(farmWait / 1000); let h = Math.floor(s/3600); waitMsg = `⏳ Farm Locked (\${h}h)`; } btnStyle = "opacity:0.5; cursor:default;"; } 
            else { waitMsg = "🚜 Farm (+50XP, +10 Coins)"; }
            h += `<button class="farm-btn" style="\${btnStyle}" onclick="\${fLocked?'':'goFarm()'}">\${waitMsg}</button>`;
            h += `<button class="btn" style="margin-top:10px; background:#95a5a6;" onclick="closeModal()">Leave Arena</button>`;
            document.getElementById('battleContent').innerHTML = h; document.getElementById('battleModal').style.display = 'flex';
        }
        function startBattle(targetId) {
            if(appData.me.isWounded) { document.getElementById('unconsciousModal').style.display = 'block'; return; }
            isBattling = true;
            let targetUser = appData.users.find(u => u.id == targetId); let targetName = targetUser ? (targetUser.chicken || "Unknown") : "Unknown";
            let area = document.getElementById('battleContent');
            area.innerHTML = `<div style="display:flex; justify-content:space-between; padding:15px; background:#eee; border-radius:10px; margin-bottom:10px;"><div id="p1-icon" style="text-align:center; font-size:30px; transition:transform 0.1s;">\${appData.me.chicken.icon}</div><div style="font-size:20px; font-weight:bold;">VS</div><div id="p2-icon" style="text-align:center; font-size:30px; transition:transform 0.1s;">\${targetUser.icon}</div></div><div style="margin-bottom:5px; font-weight:bold; font-size:12px; display:flex; justify-content:space-between;"><span>Me</span> <span id="hp-txt-p1">100/100</span></div><div style="background:#ddd; height:8px; border-radius:4px; margin-bottom:10px;"><div id="p1-bar" style="width:100%; height:100%; background:#2ecc71;"></div></div><div style="margin-bottom:5px; font-weight:bold; font-size:12px; display:flex; justify-content:space-between;"><span>\${targetName}</span> <span id="hp-txt-p2">100/100</span></div><div style="background:#ddd; height:8px; border-radius:4px; margin-bottom:10px;"><div id="p2-bar" style="width:100%; height:100%; background:#e74c3c;"></div></div><div id="battleLog" style="height:150px; overflow-y:auto; background:#f4f4f4; padding:10px; font-size:12px; border:1px solid #eee;">Battle Started!</div><button class="btn" onclick="closeModal()">Run Away</button>`;
            fetch(`\${getApiBase()}/cmd/chicken/battle?access_token=\${TOKEN}&uid=\${UID}&target=\${targetId}`).then(r => r.json()).then(d => {
                let log = document.getElementById('battleLog'); if(d.status == 'error') { log.innerHTML = d.msg; return; }
                let turns = d.turns; let maxHp = d.maxHp; let i = 0;
                function playTurn() {
                   if(!isBattling) return;
                   if(i < turns.length) {
                        let t = turns[i]; let msg = t.msg.replace(/Wins!/g, "<span class='log-win'>Wins!</span>"); log.innerHTML += `<div>\${msg}</div>`; log.scrollTop = log.scrollHeight;
                        if(t.attHp !== undefined) {
                            document.getElementById('p1-bar').style.width = Math.max(0, (t.attHp / maxHp.att) * 100) + "%"; document.getElementById('p2-bar').style.width = Math.max(0, (t.defHp / maxHp.def) * 100) + "%";
                            document.getElementById('hp-txt-p1').innerText = `\${Math.floor(t.attHp)}/\${maxHp.att}`; document.getElementById('hp-txt-p2').innerText = `\${Math.floor(t.defHp)}/\${maxHp.def}`;
                        }
                        let p1 = document.getElementById('p1-icon'); let p2 = document.getElementById('p2-icon');
                        if (i > 0) {
                             playSound('hit');
                             if (i % 2 !== 0) {
                                 if(t.event === 'crush') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-crush'); } else if(t.event === 'crit') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-hit'); p2.style.filter="drop-shadow(0 0 5px red)"; } else if(t.event === 'miss') { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-miss'); } else { p1.classList.add('anim-lunge-r'); p2.classList.add('anim-hit'); }
                             } else {
                                 if(t.event === 'crush') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-crush'); } else if(t.event === 'crit') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-hit'); p1.style.filter="drop-shadow(0 0 5px red)"; } else if(t.event === 'miss') { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-miss'); } else { p2.classList.add('anim-lunge-l'); p1.classList.add('anim-hit'); }
                             }
                             setTimeout(() => { if(p1) { p1.className = ''; p1.style.filter=''; p2.className = ''; p2.style.filter=''; } }, 350);
                        }
                        i++; setTimeout(playTurn, 1000);
                    } else { isBattling = false; fetchData(true); if(document.getElementById('p1-bar').style.width != "0%") { playSound('win'); showReward(20, 5, "Victory!"); } else { playSound('lose'); showReward(0, 0, "Defeat"); } }
                }
                playTurn();
            });
        }
        function openHospitalHelp(){document.getElementById('helpModalHospital').style.display='flex';}
        function openAdventureHelp(){document.getElementById('helpModalAdventure').style.display='flex';}
        function openForageHelp(){document.getElementById('helpModalForage').style.display='flex';}
        function eatFarmerFeed(pid) { apiCall('farmer/eat', {uid:UID, pid:pid}); }
        function showReward(xp, coins, title, sub) { rewardQueue.push({xp:xp, coins:coins, title:title, sub:sub}); if(document.getElementById('rewardModal').style.display !== 'flex') { processNextReward(); } }
        function processNextReward() { 
            if(rewardQueue.length === 0) return; let r = rewardQueue.shift(); if(r.xp > 0 || r.coins > 0) playSound('coin');
            let xpHtml = (r.xp > 0) ? `<div style="color:#2ecc71; font-weight:bold;">+ \${r.xp} XP</div>` : ''; let coinHtml = (r.coins > 0) ? `<div style="color:#e67e22; font-weight:bold;">+ \${r.coins} Coins</div>` : '';
            let h = `<div class="reward-icon">🏆</div><h2 style="color:#f1c40f; margin:0;">\${r.title || 'Victory!'}</h2><div style="font-size:12px; color:#777;">\${r.sub || ''}</div><div style="margin-top:20px; font-size:18px;">\${xpHtml}\${coinHtml}</div>`; 
            document.getElementById('rewardContent').innerHTML = h; document.getElementById('rewardModal').style.display = 'flex';
        }
        function closeRewardModal() { document.getElementById('rewardModal').style.display = 'none'; if(rewardQueue.length > 0) { setTimeout(processNextReward, 300); } }
        function getUser(uid) { if(uid==0)return{name:"Home",avatar:"🏠"}; let u=appData.users.find(x=>x.id==uid); return u?u:{name:"Unknown",avatar:"?"}; }
        function timeSince(d){let s=Math.floor((new Date()-d)/1000); if(s<60)return"Just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return"Old";}
        function apiCall(cmd, params, callback) { 
            let q = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
            fetch(`\${getApiBase()}/cmd/\${cmd}?access_token=\${TOKEN}&\${q}`).then(r => r.json()).then(d => { 
                if(callback) callback(d);
                if(d.status === 'success') { if(d.xp && !cmd.includes('farm') && !cmd.includes('farmer') && !cmd.includes('poll') && !cmd.includes('birthday') && !cmd.includes('tithe')) showToast(`+ \${d.xp} XP`); } else { if(d.msg) alert(d.msg); } fetchData(true); 
            });
        }
        function doPost(){ let m=document.getElementById('txtPost').value; if(!m)return; let p = {uid:UID, msg:m, mood:selectedMood}; if(isPinned) p.pinned = "true"; apiCall('post', p); document.getElementById('txtPost').value=""; if(isPinned) togglePin(); }
        function doMoodOnly() { apiCall('updateMood', {uid:UID, mood:selectedMood}); showToast("Mood Updated!"); }
        function handleQuickStatus(sel) { let val = sel.value; if(!val) return; apiCall('post', {uid:UID, msg:val, mood:selectedMood}); sel.value = ""; }
        function doReply(pid){let m=document.getElementById('reply-input-'+pid).value; if(!m)return; apiCall('reply',{uid:UID,postId:pid,msg:m});}
        function deletePost(pid){if(confirm("Delete post?"))apiCall('deletePost',{postId:pid});}
        function deleteReply(pid, ts){ if(confirm("Delete this reply?")) apiCall('deleteReply', {postId:pid, ts:ts}); }
        function react(pid,em){apiCall('react',{uid:UID,postId:pid,emoji:em});}
        function reactReply(pid,ts,type){apiCall('reactReply',{uid:UID,postId:pid,ts:ts,type:type});}
        function train(stat){ if(appData.me.chicken.pts <= 0) return; appData.me.chicken.pts--; let valEl = document.getElementById('sv-'+stat); if(valEl) valEl.innerText = parseInt(valEl.innerText) + (stat=='hp'?10:1); let ptsEl = document.getElementById('coop-pts'); if(ptsEl) ptsEl.innerText = appData.me.chicken.pts;
        if(appData.me.chicken.pts <= 0) { document.getElementById('coop-pts-wrapper').style.display = 'none'; document.querySelectorAll('.tr-btn').forEach(b => b.style.display = 'none'); } apiCall('chicken/train',{uid:UID,stat:stat}); }
        function toggleReply(pid){let e=document.getElementById('reply-box-'+pid); e.style.display=(e.style.display=='block')?'none':'block';}
        function closeModal(){ document.querySelectorAll('.modal').forEach(m=>m.style.display='none'); isBattling = false; }
        function checkWelcome() { 
            let w = appData.me.welcome; let hasContent = (w.newPosts > 0 || w.gotBonus || w.notifs.length > 0); let h = "";
            if(!hasContent) { h = "<div style='text-align:center; padding:20px; color:#999; font-size:14px;'>Nothing new happened while you were away.</div>"; } 
            else { h = `<div style='font-size:13px; color:#555;'>We missed you! Here is what happened:</div><div style='margin-top:15px;'>`; h += `<div class='welcome-metric'><div class='wm-icon'>📰</div><div class='wm-text'>New Posts</div><div class='wm-val'>\${w.newPosts}</div></div>`;
            if(w.gotBonus) h += `<div class='welcome-metric'><div class='wm-icon'>🎁</div><div class='wm-text'>Daily Bonus</div><div class='wm-val'>+5 Coins</div></div>`;
            w.notifs.forEach(n => { h += `<div class='welcome-metric'><div class='wm-icon'>🔔</div><div class='wm-text' style='font-size:11px; font-weight:normal;'>\${n}</div></div>`; }); h += `</div>`; }
            document.getElementById('welcomeContent').innerHTML = h; document.getElementById('welcomeModal').style.display='flex';
        }
        function setMood(m){selectedMood=m; document.querySelectorAll('.mood-opt').forEach(e=>e.classList.remove('selected')); document.getElementById('m-'+m).classList.add('selected');}
        function clearBulletin(){if(confirm("Clear bulletin?"))apiCall('clearBulletin',{});}
        function openAvatarModal(){ renderAvatarModal(); }
        function updateAvatar(e) { apiCall('avatar', {uid:UID, emoji:e}); closeModal(); }
        function renameChicken(){ document.getElementById('renameModal').style.display = 'flex'; document.getElementById('chkNameInput').value = appData.me.chicken.name; }
        function confirmRename() { let n = document.getElementById('chkNameInput').value; if(n) { apiCall('chicken/rename', {uid:UID, name:n}); document.getElementById('renameModal').style.display = 'none'; } }
        function resetHabits() { if(confirm("Reset Dailys?")) { apiCall('habit/reset', {uid:UID}); prevDailyState = false; } }
        function resetCooldowns(){ if(confirm("Reset all cooldowns?")) apiCall('resetCooldowns',{}); }
        function doFarmConfirm() { document.getElementById('farmConfirmModal').style.display = 'none'; document.getElementById('battleModal').style.display = 'none'; document.getElementById('farmModal').style.display='flex'; document.getElementById('farmScene1').style.display='flex'; document.getElementById('farmManualFinish').innerText = "Let The Chicken Work"; apiCall('chicken/farm', {uid:UID}); }
        function finishFarmEarly() { document.getElementById('farmModal').style.display='none'; }
        function goFarm() { document.getElementById('farmConfirmModal').style.display = 'flex'; }
        function togglePin() { isPinned = !isPinned; let btn = document.getElementById('admin-pin'); let postBtn = document.getElementById('btnPost'); if(isPinned) { btn.classList.add('active'); btn.innerHTML='<i class="fa fa-thumbtack"></i> Pinned!'; postBtn.innerText = 'Post Bulletin'; } else { btn.classList.remove('active'); btn.innerHTML='<i class="fa fa-thumbtack"></i> Pin as Bulletin'; postBtn.innerText = 'Share Update'; } }
        function toggleVisibility(key) { let k = 'fp_hide_'+key; let hideUntil = new Date().getTime() + 86400000; let stored = localStorage.getItem(k); if(stored && parseInt(stored) > new Date().getTime()) { localStorage.removeItem(k); } else { localStorage.setItem(k, hideUntil.toString()); } checkVisibility(key); }
        function checkVisibility(key) { let k = 'fp_hide_'+key; let stored = localStorage.getItem(k); let hide = false; if(stored && parseInt(stored) > new Date().getTime()) hide = true;
        let contentId = (key=='Leaderboard') ? 'sideColContent' : (key=='Bulletin'?'bulletinArea':'newFeatureCard'); let phId = (key=='Leaderboard') ? 'sideColPlaceholder' : (key=='Bulletin'?'bulletinPlaceholder':'newFeaturesPlaceholder');
        if(document.getElementById(contentId)) document.getElementById(contentId).style.display = hide ? 'none' : 'block'; if(document.getElementById(phId)) document.getElementById(phId).style.display = hide ? 'block' : 'none';
        }
        function toggleLb(id, iconId) { let el = document.getElementById(id); let ico = document.getElementById(iconId); if(el.style.display=='block') { el.style.display='none'; ico.className='fa fa-chevron-right'; } else { el.style.display='block'; ico.className='fa fa-chevron-down'; } }
        function renderAvatarModal() { let emojis = ["😀","😂","😎","😍","🤔","😴","🤯","🥶","🤠","👻","👽","🤖","💩","👿","👶","👵","👮","🕵️","🧜","🐶","🐱","🦊","🦁","🐯","🦄","🐸","🐢","🦖","🦋","🐙","🦈","🦉","🐷","🐵","🍎","🍕","🌮","🍔","🍺","⚽","🏀","🏈","🎾","🎮","🏆","🚀","✈️","⚓","🚗","💡","📷","💊","🦠","🌈","🔥","❤️","💔","💯","👑"]; let h = ""; emojis.forEach(e => { h += `<div class="grid-item" onclick="updateAvatar('\${e}')">\${e}</div>` }); document.getElementById('avatarGrid').innerHTML = h; document.getElementById('avatarModal').style.display = 'flex'; }
        function renderAnnouncement() { let fc = document.getElementById('newFeatureCard'); if(appData.announcement) { fc.classList.remove('hidden'); let a = appData.announcement; let msgFormatted = a.msg.replace(/\\n/g, '<br>'); fc.innerHTML = `<div class="visibility-toggle" style="position:absolute; top:10px; right:10px;" onclick="toggleVisibility('NewFeatures')"><i class="fa fa-eye-slash"></i> Hide</div><b>🚀 New Features:</b><br>\${msgFormatted}`; } else { fc.classList.add('hidden'); } }
        function renderStoryBar() { 
            let html = ""; let users = [{id:0, name:"Home", avatar:"🏠"}].concat(appData.users); 
            users.forEach(u => { 
                let isMe = (u.id == UID); let crown = (u.id == appData.leaderId) ? "<div class='crown-badge'><i class='fa fa-crown'></i></div>" : ""; let hBadge = ""; if(appData.holiday === "halloween") hBadge = `<div class="holiday-badge">🎃</div>`; if(appData.birthdays && appData.birthdays.includes(u.id)) hBadge = '<div class="holiday-badge">🥳</div>';
                let cls = (isMe || u.id == 0) ? "story-item active" : "story-item"; let lastSeen = u.lastSeen || 0; let isOnline = (u.id == 0) || ((appData.serverTime - lastSeen) < 5*60*1000); 
                let onlineHtml = isOnline ? `<div class="online-badge is-online"></div>` : ""; let adminHtml = (u.id == 1) ? `<div class="admin-badge"><i class="fa fa-shield-alt"></i></div>` : ""; 
                let mood = appData.userMoods[u.id]; let moodBadge = ""; if(mood) { const moods = {happy:'😄',excited:'🤩',tired:'😴',sad:'😢',sick:'🤢',relaxed:'😌',angry:'😡',silly:'🤪'}; moodBadge = moods[mood] || ''; }
                let farmerHtml = (u.isFarmer) ? `<div class="farmer-badge">👨‍🌾</div>` : ""; let moodHtml = moodBadge ? `<div class="mood-badge">\${moodBadge}</div>` : "";
                let action = isMe && u.id != 0 ? "openAvatarModal()" : ""; let pencil = isMe && u.id != 0 ? `<div class="edit-badge"><i class="fa fa-pencil"></i></div>` : "";
                html += `<div class="\${cls}" onclick="\${action}">\${crown}<div class="avatar-ring">\${hBadge}<div class="avatar">\${u.avatar}</div>\${onlineHtml}\${moodHtml}\${pencil}\${adminHtml}\${farmerHtml}</div><div class="story-name">\${u.name}</div></div>`; 
            }); document.getElementById('story-bar-container').innerHTML = html;
        }
        function showToast(msg) { let t = document.getElementById('toast'); t.innerText = msg; t.style.opacity = 1; setTimeout(() => { t.style.opacity = 0; }, 2000); }
        function resetTimer() { logoutTime = 300; }
        setInterval(() => { logoutTime--; let m = Math.floor(logoutTime / 60); let s = logoutTime % 60; document.getElementById('logoutTimer').innerText = `\${m}:\${s < 10 ? '0'+s : s}`; if(logoutTime <= 0) doLogout(); }, 1000);
        function openDashboard(){ if(appData.me.dashboardUrl) window.open(appData.me.dashboardUrl, '_blank'); }
        function openVoteConfirm(id) { pendingVoteId = id; document.getElementById('voteConfirmModal').style.display='flex'; }
        function closeVoteModal() { document.getElementById('voteConfirmModal').style.display='none'; pendingVoteId = null; }
        function confirmVote() {
            if(pendingVoteId) {
                apiCall('poll/vote', {uid:UID, vote:pendingVoteId}, (d) => { if(d.status == 'success') showReward(d.xp, d.coins, "Voted!", "Community Voice"); });
                closeVoteModal();
            }
        }
        function doClosePoll() { if(confirm("Close poll?")) apiCall('poll/close', {uid:UID}); }
        function openForaging() {
            if(appData.me.isWounded) { document.getElementById('unconsciousModal').style.display='block'; return; }
            let t = appData.me.advTokens; let maxE = (appData.me.chicken.level>=10)?10:(appData.me.chicken.level>=5?8:6);
            document.getElementById('forageTokens').innerText = t + "/" + maxE;
            let diff = (appData.me.advReset || 0) - appData.serverTime;
            if(diff > 0) { let h = Math.floor(diff/3600000); let m = Math.floor((diff%3600000)/60000); document.getElementById('forageTimer').innerText = `Restocking in: \${h}h \${m}m`; document.getElementById('forageTimer').style.display='block'; } else { document.getElementById('forageTimer').style.display='none'; }
            document.getElementById('foragingModal').style.display='flex';
        }
        function doForage() {
            if(appData.me.advTokens <= 0) { document.getElementById('foragingModal').style.display='none'; document.getElementById('energyModal').style.display='block'; return; }
            fetch(`\${getApiBase()}/cmd/foraging/explore?access_token=\${TOKEN}&uid=\${UID}`).then(r=>r.json()).then(d=>{
                if(d.status=='error') { alert(d.msg); return; }
                document.getElementById('foragingModal').style.display='none';
                showReward(d.result.xp, d.result.coins, d.result.title, d.result.sub); fetchData(true);
            });
        }
        function openHospital() {
            apiCall('hospital/visit', {uid:UID}); let isWounded = appData.me.isWounded; let c = appData.me.chicken; let h = "";
            if(isWounded) {
                let btnText = (c.coins >= 20) ? "Pay 20 Coins" : "Need 20 Coins"; let disabled = (c.coins >= 20) ? "" : "disabled";
                let wTime = appData.me.woundedTime || 0; let endTime = wTime + 21600000; let diff = endTime - appData.serverTime;
                let timerHtml = "";
                if (diff > 0) { let hrs = Math.floor(diff / 3600000); let mins = Math.floor((diff % 3600000) / 60000); timerHtml = `<div style="font-weight:bold; color:#e74c3c; margin-top:5px; font-size:14px;">Revives in: \${hrs}h \${mins}m</div>`; }
                h = `<div style="text-align:center;"><h3 style="color:#e74c3c;">You are Unconscious!</h3><p style="font-size:12px; color:#555;">You cannot battle or farm.</p><div style="background:#fff0f0; padding:15px; border-radius:10px; border:1px solid #ffcccc; margin-bottom:10px;\"><div style="font-size:30px; margin-bottom:5px;">🤕</div><div>Auto-heal in 6 hours.</div>\${timerHtml}</div><button class="btn" style="background:#e74c3c;" onclick="healChicken()" \${disabled}>\${btnText}</button></div>`;
            } else { h = `<div style="text-align:center; padding:20px;"><div style="font-size:50px; margin-bottom:10px;">💖</div><h3 style="color:#2ecc71; margin:0;">Healthy!</h3><p style="color:#777; font-size:12px;">Your chicken is in top shape.</p></div>`; }
            document.getElementById('hospitalContent').innerHTML = h; document.getElementById('hospitalModal').style.display='flex';
        }
        function openPresent(pid, uid) {
             apiCall('birthday/open', {uid:uid, pid:pid}, (d) => {
                 if(d.status == 'success') { showReward(d.xp, d.coins, "Happy Birthday!", "Open your gift!"); playSound('win'); } else { showToast(d.msg); }
             });
        }
		function triggerSportEvent(type, msg, mood) {
        apiCall('sportEvent', {uid: UID, eventType: type, msg: msg, mood: mood}, (d) => { if (d.status === 'success') { showReward(d.xp, d.coins, d.title, d.sub); } });
        }
        function openPulseHelp(){document.getElementById('helpModalPulse').style.display='flex';}
        function openCoopHelp(){document.getElementById('helpModalCoop').style.display='flex';}
        function openShopHelp(){document.getElementById('helpModalShop').style.display='flex';}
        function openAdventureHelp(){document.getElementById('helpModalAdventure').style.display='flex';}
        function openForageHelp(){document.getElementById('helpModalForage').style.display='flex';}
        function openHospitalHelp(){document.getElementById('helpModalHospital').style.display='flex';}
        function openChurchHelp() { document.getElementById('helpModalChurch').style.display='flex'; }
        
        function openChurch() {
            let quote = (appData && appData.churchQuote) ? appData.churchQuote : "Faith moves mountains.";
            document.getElementById('churchQuoteText').innerText = quote;
            if(appData && appData.me && appData.me.chicken) {
                document.getElementById('churchCoins').innerText = appData.me.chicken.coins;
            }
            document.getElementById('churchModal').style.display = 'flex';
        }
        
        function tithe() {
            apiCall('church/tithe', {uid:UID}, (d) => {
                if(d.status == 'success') {
                    document.getElementById('churchCoins').innerText = d.coins;
                    if(d.won) {
                        playSound('win');
                        showReward(0, 0, "Divine Blessing!", d.msg);
                    } else {
                        showToast(d.msg);
                    }
                } else {
                    showToast(d.msg);
                }
            });
        }

        fetchData();
        setInterval(fetchData, 15000);