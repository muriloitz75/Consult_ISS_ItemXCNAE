import json
import re
from pathlib import Path

from pypdf import PdfReader
from normalize_textual_consistency import main as normalize_textual_consistency


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs" / "norma.pdf"
JSON_PATH = ROOT / "dados.json"


LC_RE = re.compile(r"^\s*(\d{2}\.\d{2})\b")
CNAE_TOKEN_RE = re.compile(r"(\d[\d\.\-/]{6,})")


def format_cnae_from_token(token: str) -> str | None:
    digits = re.sub(r"\D", "", token)
    if len(digits) < 7:
        return None
    base = digits[:7]
    return f"{base[:4]}-{base[4]}/{base[5:7]}"


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def parse_pdf_pairs(text: str):
    pairs = {}
    current_lc = None
    current_item_desc_parts = []
    for raw in text.splitlines():
        line = " ".join(raw.split())
        if not line:
            continue

        lc_match = LC_RE.match(line)
        if lc_match:
            current_lc = lc_match.group(1)
            rest = line[lc_match.end():].strip()
            current_item_desc_parts = [rest] if rest else []

        if not current_lc:
            continue

        token_match = CNAE_TOKEN_RE.search(line)
        if token_match:
            cnae = format_cnae_from_token(token_match.group(1))
            if not cnae:
                continue
            cnae_desc = line[token_match.end():].strip()
            item_desc = " ".join(x for x in current_item_desc_parts if x).strip()
            if current_lc not in pairs:
                pairs[current_lc] = {}
            if cnae not in pairs[current_lc]:
                pairs[current_lc][cnae] = {
                    "item_desc": item_desc,
                    "cnae_desc": cnae_desc,
                }
            current_lc = None
            current_item_desc_parts = []
        else:
            if not lc_match:
                current_item_desc_parts.append(line)
    return pairs


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    data = load_json(JSON_PATH)
    text = extract_text(PDF_PATH)
    pdf_pairs = parse_pdf_pairs(text)

    existing_pairs = {(row["LIST LC"], row["CNAE"]) for row in data}
    by_lc_template = {}
    for row in data:
        by_lc_template.setdefault(row["LIST LC"], row)

    additions = []
    for lc, cnaes in sorted(pdf_pairs.items()):
        template = by_lc_template.get(lc)
        for cnae, meta in sorted(cnaes.items()):
            key = (lc, cnae)
            if key in existing_pairs:
                continue
            item_desc = (
                template["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"]
                if template
                else (meta.get("item_desc") or "")
            )
            cnae_desc = meta.get("cnae_desc") or (template["Descrição do CNAE"] if template else "")
            aliquota = template["Alíquota"] if template else ""
            additions.append(
                {
                    "LIST LC": lc,
                    "Descrição item da lista da Lei Complementar nº 001/2003 - CTM": item_desc,
                    "CNAE": cnae,
                    "Descrição do CNAE": cnae_desc,
                    "Alíquota": aliquota,
                }
            )

    if additions:
        data.extend(additions)
        JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=4), encoding="utf-8")

    normalize_textual_consistency()

    print(f"LCs extraídos do PDF: {len(pdf_pairs)}")
    print(f"Novas associações adicionadas: {len(additions)}")
    for row in additions[:100]:
        print(f"{row['LIST LC']} -> {row['CNAE']}")


if __name__ == "__main__":
    main()
