"""
Пересобирает latin-сабсеты шрифтов под фактический текст сайта.

Зачем: файлы, которые отдаёт Google Fonts для сабсета `latin`, содержат всю
Latin-1 вместе с диакритикой (é, ü, ñ, …) — на сайте с русским текстом она не
нужна ни разу, но весит четверть файла. Мы оставляем только те символы, которые
встречаются в вёрстке и в данных студии, плюс ASCII целиком (в поля брифа
посетитель может ввести латиницу).

Cyrillic-файлы не трогаем: они и так узкие (U+0301, U+0400-045F, U+0490-0491,
U+04B0-04B1, U+2116) — это весь русский алфавит.

Запуск (нужны fonttools и brotli):
    python scrape/subset-fonts.py

После запуска обязательно перепроверить сборку: npm run validate && npm run build
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"
SOURCES = [ROOT / "content", ROOT / "components", ROOT / "app", ROOT / "lib"]

# Диапазон кириллического сабсета Google Fonts: всё, что вне него и не ASCII,
# должно попасть в latin-сабсет.
CYRILLIC = set(range(0x0301, 0x0302)) | set(range(0x0400, 0x0460)) | set(range(0x0490, 0x0492)) | set(
    range(0x04B0, 0x04B2)
) | {0x2116}

# Символы, которые заведомо нужны интерфейсу: пробел, дефисы, кавычки, № , ², ·
GUARANTEED = {
    0x00A0,  # неразрывный пробел
    0x00AB,  # «
    0x00B0,  # °
    0x00B2,  # ²  (м²)
    0x00B7,  # ·
    0x00BB,  # »
    0x2013,  # –
    0x2014,  # —
    0x2018,  # ‘
    0x2019,  # ’
    0x201C,  # “
    0x201D,  # ”
    0x2022,  # •
    0x2026,  # …
    0x2116,  # №
    0x2192,  # →
}


def used_characters() -> set[str]:
    characters: set[str] = set()
    for folder in SOURCES:
        for path in folder.rglob("*"):
            if path.suffix not in {".json", ".ts", ".tsx", ".css", ".md"}:
                continue
            characters.update(path.read_text(encoding="utf-8"))
    return characters


def is_ascii(code: int) -> bool:
    return 0x20 <= code <= 0x7E


def codepoints_of(path: Path) -> set[int]:
    font = TTFont(str(path))
    codes: set[int] = set()
    for table in font["cmap"].tables:
        codes.update(table.cmap.keys())
    font.close()
    return codes


def main() -> int:
    used = used_characters()
    used_codes = {ord(char) for char in used if ord(char) >= 0x20}
    extra = {code for code in used_codes if not is_ascii(code) and code not in CYRILLIC}
    unicodes = sorted(set(range(0x20, 0x7F)) | GUARANTEED | extra)

    # Символы, которых нет ни в одном нашем сабсете, браузер и так берёт из
    # системного шрифта (стрелки, ★, ✕, казахская Ө из U+04E8). Это не регрессия,
    # поэтому сверяемся с исходными файлами Google Fonts: важно не потерять то,
    # что они умели.
    backup_dir = ROOT / "scrape" / "raw" / "fonts-original"
    print(f"символов вне ASCII и кириллицы, которые встречаются в текстах: {len(extra)}")
    print(" ".join(f"U+{code:04X}" for code in sorted(extra)))

    for name in ("manrope-latin-400-700.woff2", "onest-latin-400-700.woff2"):
        path = FONTS / name
        before = path.stat().st_size
        old_codes = codepoints_of(backup_dir / name) if (backup_dir / name).exists() else codepoints_of(path)

        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        options.recalc_bounds = False
        options.recalc_timestamp = False

        font = subset.load_font(str(path), options)
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        subset.save_font(font, str(path), options)
        font.close()

        after = path.stat().st_size
        print(f"{name}: {before / 1024:.1f} KB -> {after / 1024:.1f} KB")

        # Регрессией считается только потеря символа, который был в старом файле
        # и при этом встречается в текстах сайта.
        new_codes = codepoints_of(path)
        lost = sorted((old_codes & used_codes) - new_codes)
        if lost:
            print("  ВНИМАНИЕ, потеряны используемые символы:", " ".join(f"U+{code:04X}" for code in lost))
            return 1
        print(f"  проверка: покрытие не сузилось (символов в файле: {len(new_codes)})")

    total = sum(path.stat().st_size for path in FONTS.glob("*.woff2"))
    print(f"итого все четыре файла: {total / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
