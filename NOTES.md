# সপ্তসুর — প্রজেক্ট নোটস

## ক্লাবের পরিচয়
- **নাম:** সপ্তসুর (Soptosur)
- **ধরন:** বিশ্ববিদ্যালয় সংগীত ক্লাব
- **থিম:** Minimal botanical, warm brown/cream palette
- **ভাষা:** বাংলা

## ওয়েবসাইট
- **Live URL:** https://soptosur.vercel.app/
- **GitHub:** https://github.com/rezwanahmed399/soptosur
- **Hosting:** Vercel (GitHub এ push করলে auto-deploy হয়)

## ডিজাইন
- **Color:** `--brown-dark: #3D1F0A`, `--cream: #FAF6F0`, accent `#8B5E3C`
- **Fonts:** Hind Siliguri (body), Tiro Bangla (headings/logo)
- **Logo:** SVG ফাইল — `assets/images/saptasur-logo.svg` (তানপুরা সহ বাংলা ক্যালিগ্রাফি, রঙ `#8B3A0F`)
- **Style:** Glassmorphism elements, scroll animations, botanical SVG decorations

## ফাইল স্ট্রাকচার
```
niharika-club/          ← local folder এর নাম (PC তে)
├── index.html          ← সব content এখানে
├── style.css           ← সব design
├── script.js           ← animations, form, navbar
├── README.md
├── .gitignore
└── assets/
    └── images/
        ├── saptasur-logo.svg   ← আসল SVG লোগো
        ├── saptasur-logo.png   ← backup PNG
        └── logo.png
```

## ওয়েবসাইটের সেকশন
1. **Navigation** — লোগো + মেনু (আমাদের সম্পর্কে, সংবাদ, উদ্যোগ, অনুষ্ঠান, যোগ দিন)
2. **Hero** — বড় লোগো + tagline "বিশ্ববিদ্যালয় সংগীত ক্লাব"
3. **About** — ক্লাবের পরিচয় + stats (৩০০+ সদস্য, ৮০+ পরিবেশনা, ২২+ বছর, ৩৫ পুরস্কার)
4. **News** — ৪টি সংবাদ কার্ড (featured + ৩টি ছোট)
5. **Initiatives** — ৬টি উদ্যোগ কার্ড (রিহার্সাল, গুরু-শিষ্য, মৌলিক সংগীত, প্রতিযোগিতা, থেরাপি, সুর সন্ধ্যা)
6. **Events** — ৪টি আসন্ন অনুষ্ঠান
7. **Gallery Strip** — auto-scroll decorative gallery
8. **Join Form** — নাম, ইমেইল, বিভাগ, সংগীতের ধরন (৮টি option)
9. **Footer** — লোগো, দ্রুত লিঙ্ক, যোগাযোগ, social media

## Developer Info
- **GitHub Username:** rezwanahmed399
- **Email:** rezwanahmed399@gmail.com
- **Local Path (PC):** `C:\Users\RIZWAN AHMED\.gemini\antigravity-ide\scratch\niharika-club`

## Update করার নিয়ম
আমি (AI) ফাইল edit করার পর এই commands চালাই:
```powershell
git add .
git commit -m "পরিবর্তনের বিবরণ"
git push
```
Push হলে Vercel ৩০ সেকেন্ডে auto-deploy করে।

## নতুন PC তে কাজ শুরু করতে হলে
```powershell
git clone https://github.com/rezwanahmed399/soptosur.git
cd soptosur
```
তারপর এই NOTES.md ফাইলটা AI কে দেখালেই সব context পাবে।
