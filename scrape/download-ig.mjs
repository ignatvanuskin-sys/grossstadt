import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "scrape", "raw", "ig");
await mkdir(OUT, { recursive: true });

const items = [
  ["ig_progress_office", "C61BTfZIcob", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.82787-15/649215954_17939346831156573_8488247731720435628_n.webp?_nc_cat=104&_nc_map=urlgen_bucketless&ig_cache_key=MzM2NTYwMjAxNDUxNzE4MTExMQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTAwNC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=wOLssJaucvAQ7kNvwGTL1Dc&_nc_oc=AdpUbKXFyatoSJCkqAhgOfBGer0b0NFv24I1pfuvxd4hwvUcQuZajckMAGj77p4P1hE&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=U7UMieAXuGGZ-WInA-UeKA&_nc_ss=78a8c&oh=00_AQP3m0ZQeClOp-8a7_8LXlTtrXXBTTvmWXmCQBRk1JAs2g&oe=6AD94384"],
  ["ig_kobenhavn", "C71c5agiS3Y", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.82787-15/658455575_18078467015133967_4814510612652902332_n.webp?_nc_cat=105&_nc_map=urlgen_bucketless&ig_cache_key=MzM4MzczNzc3MDE2OTcxMjA4OA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTI3OC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=FxKJ2a7YH-QQ7kNvwF6BTPl&_nc_oc=AdrUm6Xmu4bDugsGkffSPWpid3KDKXV4XX3vSnBV_TjwAIXHzPXydWupOYGKUt04rYg&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=WsIrPEKBfzGli7QwIu5GUA&_nc_ss=78a8c&oh=00_AQNmYW8m_s46aGOUuhuCJ1pMgD6IvJ-ZFivu56UlU44fkw&oe=6AD934FE"],
  ["ig_vela_one", "DHGQ3MZoKOX", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.75761-15/483372489_18486637219057189_9052956466133226133_n.webp?_nc_cat=102&_nc_map=urlgen_bucketless&ig_cache_key=MzU4NjYyODI5Mzg4OTM0NDAzNg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTQ0MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=xEQDR9ggaREQ7kNvwFzty0O&_nc_oc=AdoLUohW5vdDR84Nbj5nj6nTuQzYVJrDVu6Bnz9CbkyRQ9bJDG6mdOd4XQ7458DGixo&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=Cya07Z6Rfjo5F2My2w1yrA&_nc_ss=78a8c&oh=00_AQMs0HPEFxnV93S5b5Rm66z9pgg_UUDWek-YoFX54EArDQ&oe=6AD95E2B"],
  ["ig_pablo_centro", "DVeQBuCiGL4", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.82787-15/641890281_18561413101057189_6955518733423675807_n.webp?_nc_cat=110&_nc_map=urlgen_bucketless&ig_cache_key=Mzg0NTU4MTU4OTMyNTU3MjMxOA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTQ0MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=E9KPwCDOv3IQ7kNvwFfap3U&_nc_oc=Adr68W2R1OTHZCvg11_WZ_RhLWFRS3MIipiDBqrpVafMfRStuatoLp5ByVTVVvbQjp8&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=zLAvDVuEuZlpwD5d7J_jSQ&_nc_ss=78a8c&oh=00_AQNXP9cCXk1kcrMieG13GuamD5-MQQJkYZcC9PWy0wym4g&oe=6AD95A7B"],
  ["ig_pablo_aura", "DVkukpXiOWn", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.82787-15/645059738_18561906037057189_282849268144986986_n.webp?_nc_cat=100&_nc_map=urlgen_bucketless&ig_cache_key=Mzg0NzQwNDc4NTQ4NjAzODEwNA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTQ0MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=Pa1M1n34-7gQ7kNvwFK32ja&_nc_oc=AdpKA7rHLld71-SxblmMS1m7kAmblqde9GBSKTrMfGxAE31VzZdg3Z-ulBNfMtyJMM4&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=wsAOVyCC8CrJIlZJACRsMg&_nc_ss=78a8c&oh=00_AQNU1TMCC2TEZIoxZg7Sbx9CQo-DQcHDD1WFlC-CW5cCzw&oe=6AD9501D"],
  ["ig_athletic_city", "CkK2sVMLnXo", "https://instagram.fakx3-1.fna.fbcdn.net/v/t51.82787-15/654704503_18056740940491062_6869044050905511429_n.webp?_nc_cat=108&_nc_map=urlgen_bucketless&ig_cache_key=Mjk1NzQxNjY0MTg1NjQzMjk3MQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMTQ0MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=2J15VTOBhO8Q7kNvwHJn0PU&_nc_oc=AdqvoyYn1UDD932KALifl_qKT6bEprRstrpggQbyLXQYL6pKG7TfQ0m9DWr_tjv5hpY&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=Y-xMhjzFJrJm_HQBEVVrqQ&_nc_ss=78a8c&oh=00_AQMr3OdyBNdcSqywxOfjy2soREVAre_X9aps896Ppey-Cg&oe=6AD95334"],
  ["ig_reel_intro", "C0tPljZMtLr", "https://instagram.fakx3-1.fna.fbcdn.net/v/t15.5256-10/615554975_837915849248730_4240519847030877644_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=108&_nc_map=urlgen_bucketless&ig_cache_key=MzI1NTMyNjY1Njk4MDc2NzQ2NzgzNzkxNTgyMjU4MjA2Ng%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkNMSVBTLnhwaWRzLjU0MC5zZHIudmlkZW9fZGVmYXVsdF9jb3Zlcl9mcmFtZS5DMyJ9&_nc_ohc=ve3WfkYRiCcQ7kNvwGudMFl&_nc_oc=AdoBwcy58v5bwdBFvO16rbjo21Lo6xGCoqaIJYzcEizDHbctqRDHhi-uli_QK6V95kY&_nc_zt=23&_nc_ht=instagram.fakx3-1.fna&_nc_gid=KBu_c0KXFk0xD0I1wKD8mA&_nc_ss=78a8c&oh=00_AQOEnqVG6etC3iofaRdPGNpDDQpha0xQLZuS1c7VE-RpYQ&oe=6AD9338F"],
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

for (const [name, slug, url] of items) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" } });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(OUT, `${name}__${slug}.webp`), buf);
    console.log(`OK   ${name} ${(buf.length / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e}`);
  }
}
