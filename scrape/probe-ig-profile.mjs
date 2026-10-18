const url = "https://www.instagram.com/grossstadt_interior/embed/";
const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  "accept-language": "ru-RU,ru;q=0.9",
};

const res = await fetch(url, { headers });
const text = await res.text();

const metas = text.match(/<meta[^>]+>/g) ?? [];
for (const m of metas) {
  if (/description|title|image/i.test(m)) console.log(m.replace(/\s+/g, " ").slice(0, 400));
}

const og = text.match(/"og_description":"(.*?)"/);
console.log("og_description:", og ? og[1] : "none");

const nameIdx = text.indexOf("grossstadt_interior");
console.log("ctx:", text.slice(Math.max(0, nameIdx - 200), nameIdx + 400).replace(/\s+/g, " "));
