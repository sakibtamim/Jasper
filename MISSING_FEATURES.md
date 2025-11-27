# Missing Features Found

## 🚨 **CRITICAL MISSING FEATURES**

### 1. **Worker Cards - "Now Playing" Requester Info** ❌
**Legacy:** Shows who requested the song with avatar
**React:** Missing completely

**Location:** Lines 224-232 in `public/index.js`
```html
<span class="text-[10px] uppercase tracking-wider opacity-70">Req by</span>
<span class="text-[10px] font-medium truncate max-w-[80px]">{requester.displayName}</span>
<img src="{requester.avatarUrl}" class="w-4 h-4 rounded-full">
```

**Fix Needed:** Add requester info to Workers page now playing section

---

### 2. **Worker Cards - "Jump to Queue" Button** ❌  
**Legacy:** Shows button on busy workers to scroll to their queue
**React:** Missing completely

**Location:** Lines 250-256 in `public/index.js`
```html
<button onclick="scroll to queue">
  Jump to Queue
</button>
```

**Fix Needed:** Add "Jump to Queue" button for busy workers

---

## ⚠️ **MINOR MISSING FEATURES**

### 3. **Smooth Scroll Behavior**
**Legacy:** `scroll-behavior: smooth` on html element
**React:** Not set

**Fix:** Add to CSS

---

### 4. **HTML Title**
**Legacy:** "Jasper - Heavenly Council Dashboard"
**React:** "Jasper Dashboard"

**Fix:** Update title in `web/index.html`

---

## ✅ **Confirmed Working**

All other features match between legacy and React:
- All page layouts
- Live update intervals
- Pagination
- Dark mode
- Icons
- Styling
- API calls

---

## **Priority Fixes**

1. ✅ HIGH: Add requester info to worker now playing
2. ✅ HIGH: Add "Jump to Queue" button to workers
3. ⚠️ MEDIUM: Update HTML title
4. ⚠️ LOW: Add smooth scroll CSS

These should be addressed before considering feature parity complete.
