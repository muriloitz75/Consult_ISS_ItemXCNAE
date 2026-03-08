import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "dados.json"


def normalize_lc(value: str) -> str:
    raw = str(value or "").strip().replace(",", ".")
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})", raw)
    if not m:
        return raw
    return f"{int(m.group(1)):02d}.{int(m.group(2)):02d}"


def aliquota_for_lc(lc: str) -> str:
    if not lc or "." not in lc:
        return "5%"
    item, sub = lc.split(".", 1)
    if item == "08":
        return "2%"
    if item == "04" and lc not in {"04.22", "04.23"}:
        return "3%"
    if lc in {"04.22", "04.23"}:
        return "2%"
    if item == "14":
        return "4%"
    if item == "07" and lc in {"07.02", "07.03", "07.04", "07.05"}:
        return "4%"
    return "5%"


def main():
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    updated = 0
    for row in data:
        lc = normalize_lc(row.get("LIST LC"))
        row["LIST LC"] = lc
        current = str(row.get("Alíquota", "")).strip()
        if current:
            continue
        row["Alíquota"] = aliquota_for_lc(lc)
        updated += 1

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=4), encoding="utf-8")
    print(f"Registros com alíquota preenchida: {updated}")


if __name__ == "__main__":
    main()
