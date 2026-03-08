import json
import re
from pathlib import Path

from sync_norma_to_dados import PDF_PATH, extract_text, parse_pdf_pairs


ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "dados.json"
REPORT_PATH = ROOT / "tools" / "audit_norma_report.json"


def normalize_lc(value: str) -> str:
    raw = str(value or "").strip().replace(",", ".")
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})", raw)
    if not m:
        return raw
    return f"{int(m.group(1)):02d}.{int(m.group(2)):02d}"


def normalize_cnae(value: str) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) < 7:
        return ""
    digits = digits[:7]
    return f"{digits[:4]}-{digits[4]}/{digits[5:7]}"


def compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def choose_better(current: dict, candidate: dict) -> dict:
    chosen = dict(current)
    if len(candidate.get("Descrição do CNAE", "")) > len(current.get("Descrição do CNAE", "")):
        chosen["Descrição do CNAE"] = candidate["Descrição do CNAE"]
    if len(candidate.get("Descrição item da lista da Lei Complementar nº 001/2003 - CTM", "")) > len(
        current.get("Descrição item da lista da Lei Complementar nº 001/2003 - CTM", "")
    ):
        chosen["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"] = candidate[
            "Descrição item da lista da Lei Complementar nº 001/2003 - CTM"
        ]
    if not chosen.get("Alíquota") and candidate.get("Alíquota"):
        chosen["Alíquota"] = candidate["Alíquota"]
    return chosen


def clean_json_rows(data: list[dict]) -> list[dict]:
    by_key: dict[tuple[str, str], dict] = {}
    for row in data:
        lc = normalize_lc(row.get("LIST LC"))
        cnae = normalize_cnae(row.get("CNAE"))
        if not lc or not cnae:
            continue
        clean = {
            "LIST LC": lc,
            "Descrição item da lista da Lei Complementar nº 001/2003 - CTM": compact_spaces(
                row.get("Descrição item da lista da Lei Complementar nº 001/2003 - CTM", "")
            ),
            "CNAE": cnae,
            "Descrição do CNAE": compact_spaces(row.get("Descrição do CNAE", "")),
            "Alíquota": compact_spaces(row.get("Alíquota", "")),
        }
        key = (lc, cnae)
        if key not in by_key:
            by_key[key] = clean
        else:
            by_key[key] = choose_better(by_key[key], clean)

    return sorted(by_key.values(), key=lambda x: (x["LIST LC"], x["CNAE"]))


def build_pdf_keys() -> set[tuple[str, str]]:
    text = extract_text(PDF_PATH)
    parsed = parse_pdf_pairs(text)
    keys = set()
    for lc, cnaes in parsed.items():
        nlc = normalize_lc(lc)
        for cnae in cnaes.keys():
            ncnae = normalize_cnae(cnae)
            if nlc and ncnae:
                keys.add((nlc, ncnae))
    return keys


def main():
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    cleaned = clean_json_rows(data)
    JSON_PATH.write_text(json.dumps(cleaned, ensure_ascii=False, indent=4), encoding="utf-8")

    json_keys = {(row["LIST LC"], row["CNAE"]) for row in cleaned}
    pdf_keys = build_pdf_keys()
    missing_in_json = sorted(pdf_keys - json_keys)
    extra_in_json = sorted(json_keys - pdf_keys)

    report = {
        "total_json_pairs": len(json_keys),
        "total_pdf_pairs_extraidos": len(pdf_keys),
        "missing_in_json_count": len(missing_in_json),
        "extra_in_json_count": len(extra_in_json),
        "missing_in_json_sample": missing_in_json[:200],
        "extra_in_json_sample": extra_in_json[:200],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=4), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
